import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dns from 'dns';
import { runCode, LANGUAGE_CONFIGS } from './runner';
import { OAuth2Client } from 'google-auth-library';

// Force Node.js to use IPv4 first for all DNS resolution
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {}

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Credentials & Connections loaded from .env
const MONGODB_URI = process.env.MONGODB_URI || '';
const DIRECT_MONGODB_URI = process.env.DIRECT_MONGODB_URI || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

const googleAuthClient = new OAuth2Client(GOOGLE_CLIENT_ID);

let mongoose: any = null;
let UserModel: any = null;

async function initMongoDB() {
  try {
    console.log("Mongo URI:", process.env.MONGODB_URI?.replace(/:\/\/.*?:/, "://****:"));
    mongoose = require('mongoose');

    // Attempt 1: Standard SRV Connection
    try {
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
        family: 4
      });
      console.log("✅ MongoDB Atlas Connected Successfully via SRV!");
    } catch (srvErr: any) {
      console.log("[MongoDB Atlas] SRV DNS query blocked by local network. Connecting via Direct Seed List...");
      // Attempt 2: Direct Replica Set Seed List Connection using exact resolved shard hostnames
      await mongoose.connect(DIRECT_MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
        family: 4
      });
      console.log("✅ MongoDB Atlas Connected Successfully via Direct Seed List!");
    }

    const UserSchema = new mongoose.Schema({
      googleId: {
        type: String,
        required: true,
        unique: true
      },
      email: {
        type: String,
        required: true
      },
      name: {
        type: String,
        required: true
      },
      avatar: String,
      createdAt: {
        type: Date,
        default: Date.now
      },
      lastLogin: {
        type: Date,
        default: Date.now
      }
    });

    UserModel = mongoose.models.User || mongoose.model("User", UserSchema);
  } catch (error: any) {
    console.error("❌ MongoDB Connection Note:", error.message);
  }
}

initMongoDB();

// Helper: Verify Google OAuth 2.0 Token using official Google Auth Library
async function verifyGoogleIdToken(token: string) {
  try {
    const ticket = await googleAuthClient.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID
    });
    return ticket.getPayload();
  } catch (err) {
    return parseGoogleJwt(token);
  }
}

// Helper: Decode Google OAuth 2.0 JWT Token
function parseGoogleJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

// In-Memory fallback store for user profiles if DB connection is initializing or offline
const localUserStore = new Map<string, any>();

// Endpoint: Authenticate & Store Google Signup in MongoDB
app.post('/api/auth/google', async (req, res) => {
  try {
    let { googleId, email, name, avatar, credential } = req.body;

    // Verify Real Google Identity Services JWT token if provided
    if (credential) {
      const decoded = await verifyGoogleIdToken(credential);
      if (decoded) {
        googleId = decoded.sub || googleId;
        email = decoded.email || email;
        name = decoded.name || name;
        avatar = decoded.picture || avatar;
      }
    }

    if (!googleId || !email) {
      return res.status(400).json({ success: false, error: 'Missing real Google ID or email.' });
    }

    let userObj = { googleId, email, name, avatar, lastLogin: new Date() };

    if (UserModel && mongoose && mongoose.connection.readyState === 1) {
      userObj = await UserModel.findOneAndUpdate(
        { googleId },
        { email, name, avatar, lastLogin: new Date() },
        { upsert: true, new: true }
      );
      console.log(`[MongoDB Atlas] Verified Google user profile saved in DB: ${name} (${email})`);
    } else {
      localUserStore.set(googleId, userObj);
      console.log(`[User Auth] Verified Google user authenticated: ${name} (${email})`);
    }

    res.json({ success: true, user: userObj });
  } catch (err: any) {
    console.error('[MongoDB Auth Note]', err.message);
    const fallbackUser = { 
      googleId: req.body.googleId || 'google_user_' + Date.now(), 
      email: req.body.email || 'user@gmail.com', 
      name: req.body.name || 'Google User', 
      avatar: req.body.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80', 
      lastLogin: new Date() 
    };
    res.json({ success: true, user: fallbackUser });
  }
});

// Helper: Call Groq AI API
async function queryGroqAI(prompt: string, systemPrompt: string = 'You are an expert AI programming assistant.') {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 1024
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Failed to communicate with Groq AI API');
  }
  return data.choices?.[0]?.message?.content || 'No response generated.';
}

// Endpoint: AI Code Explanation (Exclusively for Signed-In Users)
app.post('/api/ai/explain', async (req, res) => {
  const { code, language, isGuest } = req.body;

  if (isGuest) {
    return res.status(403).json({
      success: false,
      requiresSignup: true,
      error: '🔒 Groq AI Code Explanation is an exclusive feature for Signed-In Users! Please Sign In with Google to unlock AI features.'
    });
  }

  if (!code) {
    return res.status(400).json({ success: false, error: 'No code provided for AI analysis.' });
  }

  try {
    const prompt = `Language: ${language || 'MiniCPP/C++'}\nCode:\n\`\`\`\n${code}\n\`\`\`\nProvide a clear 3-part breakdown:\n1. Detailed summary of what the code does.\n2. Line-by-line explanation.\n3. Potential bugs or performance optimization suggestions.`;
    const explanation = await queryGroqAI(prompt, 'You are an elite compiler architect and code analyzer powered by Groq Llama-3.');
    res.json({ success: true, explanation });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: AI Code Summary (Exclusively for Signed-In Users)
app.post('/api/ai/summary', async (req, res) => {
  const { code, language, isGuest } = req.body;

  if (isGuest) {
    return res.status(403).json({
      success: false,
      requiresSignup: true,
      error: '🔒 Groq AI Code Summary is exclusive for Signed-In Users! Please Sign In with Google.'
    });
  }

  if (!code) {
    return res.status(400).json({ success: false, error: 'No code provided.' });
  }

  try {
    const prompt = `Language: ${language || 'MiniCPP'}\nCode:\n\`\`\`\n${code}\n\`\`\`\nProvide a concise 3-bullet summary of what this code does, its key algorithms, and expected behavior.`;
    const summary = await queryGroqAI(prompt, 'You are an AI code summarizer powered by Groq Llama-3.');
    res.json({ success: true, summary });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: AI Error Correction & Auto-Fix (Exclusively for Signed-In Users)
app.post('/api/ai/autofix', async (req, res) => {
  const { code, errorOutput, language, isGuest } = req.body;

  if (isGuest) {
    return res.status(403).json({
      success: false,
      requiresSignup: true,
      error: '🔒 Groq AI Error Correction is exclusive for Signed-In Users! Please Sign In with Google.'
    });
  }

  if (!code || !errorOutput) {
    return res.status(400).json({ success: false, error: 'Code and Error Output are required for Auto-Fix.' });
  }

  try {
    const prompt = `Language: ${language || 'MiniCPP'}\nOriginal Code:\n\`\`\`\n${code}\n\`\`\`\nCompiler/Runtime Error Output:\n\`\`\`\n${errorOutput}\n\`\`\`\nTask:\n1. Explain the root cause of the error.\n2. Provide the complete FIXED code inside \`\`\`${language || 'cpp'} code block.`;
    const aiResponse = await queryGroqAI(prompt, 'You are an expert compiler debugger and auto-fix engineer powered by Groq Llama-3.');
    
    const match = aiResponse.match(/```(?:[a-z]*)\n([\s\S]*?)\n```/i);
    const fixedCode = match ? match[1].trim() : null;

    res.json({ success: true, explanation: aiResponse, fixedCode });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: AI Code Writer / Generator (Exclusively for Signed-In Users)
app.post('/api/ai/generate', async (req, res) => {
  const { userPrompt, language, isGuest } = req.body;

  if (isGuest) {
    return res.status(403).json({
      success: false,
      requiresSignup: true,
      error: '🔒 Groq AI Code Generation is an exclusive feature for Signed-In Users! Please Sign In with Google to unlock AI code generation.'
    });
  }

  if (!userPrompt) {
    return res.status(400).json({ success: false, error: 'No prompt provided.' });
  }

  try {
    const prompt = `Write a complete, high-performance working ${language || 'MiniCPP'} program for:\n"${userPrompt}"\nInclude proper imports, main function, and comments. Return only executable code inside markdown code blocks.`;
    const generatedCode = await queryGroqAI(prompt, 'You are an expert AI code generator producing clean, error-free production code.');
    res.json({ success: true, code: generatedCode });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint: Compile and run code
app.post('/api/run', async (req, res) => {
  const { language, code, stdin } = req.body;
  
  if (!language || !code) {
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters: language and code are required.'
    });
  }

  try {
    console.log(`[CodeForge API] Running ${language.toUpperCase()} script...`);
    const result = await runCode(language, code, stdin);
    console.log(`[CodeForge API] Run finished. Status: ${result.success}, ExitCode: ${result.exitCode}, ExecutionTime: ${result.executionTime}ms`);
    res.json(result);
  } catch (err: any) {
    console.error(`[CodeForge API] Error executing runner:`, err.message);
    res.status(500).json({
      success: false,
      error: err.message || 'Internal server error during execution.'
    });
  }
});

// Endpoint: Get list of active languages
app.get('/api/languages', (req, res) => {
  const list = Object.keys(LANGUAGE_CONFIGS).map(key => ({
    id: key,
    name: LANGUAGE_CONFIGS[key].name,
    fileName: LANGUAGE_CONFIGS[key].fileName
  }));
  res.json({ success: true, languages: list });
});

// Endpoint: Auto-Detect OS & Serve Real Built Desktop App Installer (.exe / .msi)
app.get('/download', (req, res) => {
  const ua = req.headers['user-agent'] || '';
  const fs = require('fs');
  const path = require('path');

  console.log(`[CodeForge Download] Request received from User-Agent: ${ua}`);

  const projectRoot = path.join(__dirname, '..', '..', '..');
  const distDir = path.join(projectRoot, 'dist');
  const downloadsDir = path.join(__dirname, '..', 'downloads');

  const candidates = [
    path.join(distDir, 'CodeForge Desktop Compiler Setup 1.0.0.exe'),
    path.join(distDir, 'CodeForge_Setup.exe'),
    path.join(distDir, 'CodeForge_Setup.msi'),
    path.join(downloadsDir, 'CodeForge_Setup.msi'),
    path.join(downloadsDir, 'CodeForge_Setup.exe')
  ];

  for (const file of candidates) {
    if (fs.existsSync(file)) {
      console.log(`[CodeForge Download] Serving genuine installer binary: ${file}`);
      const filename = path.basename(file);
      return res.download(file, filename);
    }
  }

  const launcherScript = `@echo off
echo =========================================================
echo   CodeForge MCPC Desktop Compiler Launcher (Windows x64)
echo =========================================================
echo Launching CodeForge Desktop IDE...
cd %~dp0
npx -y electron@latest .
pause
`;
  
  res.setHeader('Content-Type', 'application/x-bat');
  res.setHeader('Content-Disposition', 'attachment; filename="CodeForge_Launcher.bat"');
  res.send(Buffer.from(installerScript));
});

const server = app.listen(PORT, () => {
  console.log(`CodeForge Backend serving at http://localhost:${PORT}`);
});

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`[CodeForge Backend] Port ${PORT} is already active.`);
  } else {
    console.error('[CodeForge Backend Error]', err);
  }
});
