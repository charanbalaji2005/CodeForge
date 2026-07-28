import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import dns from 'dns';
import { runCode, LANGUAGE_CONFIGS } from './runner';

// Force Node.js to use IPv4 first for all DNS resolution
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {}

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Credentials & Connections
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://charan:Charan1234@cluster1.556pzyn.mongodb.net/CodeForge?appName=Cluster1';
const DIRECT_MONGODB_URI = 'mongodb://charan:Charan1234@cluster1-shard-00-00.556pzyn.mongodb.net:27017,cluster1-shard-00-01.556pzyn.mongodb.net:27017,cluster1-shard-00-02.556pzyn.mongodb.net:27017/CodeForge?ssl=true&replicaSet=atlas-556pzyn-shard-0&authSource=admin&retryWrites=true&w=majority';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

let mongoose: any = null;
let UserModel: any = null;

async function initMongoDB() {
  try {
    mongoose = require('mongoose');
    
    // Attempt 1: Standard SRV connection
    try {
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 4000,
        connectTimeoutMS: 4000,
        family: 4
      });
      console.log('[MongoDB Atlas] Connected successfully to Cluster1 via SRV!');
    } catch (srvErr: any) {
      console.log('[MongoDB Atlas] SRV DNS blocked by local network. Switching to direct replica set connection...');
      // Attempt 2: Direct Replica Set non-SRV connection (bypasses Windows querySrv ECONNREFUSED)
      await mongoose.connect(DIRECT_MONGODB_URI, {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000,
        family: 4
      });
      console.log('[MongoDB Atlas] Connected successfully to Cluster1 via Direct Seed List!');
    }

    const UserSchema = new mongoose.Schema({
      googleId: { type: String, required: true, unique: true },
      email: { type: String, required: true },
      name: { type: String, required: true },
      avatar: { type: String },
      createdAt: { type: Date, default: Date.now },
      lastLogin: { type: Date, default: Date.now }
    });

    UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
  } catch (err: any) {
    console.log('[MongoDB Atlas Note] Database connecting in background or offline mode:', err.message);
  }
}

initMongoDB();

// In-Memory fallback store for user profiles if DB connection is initializing or offline
const localUserStore = new Map<string, any>();

// Endpoint: Authenticate & Store Google Signup in MongoDB
app.post('/api/auth/google', async (req, res) => {
  try {
    const { googleId, email, name, avatar } = req.body;
    if (!googleId || !email) {
      return res.status(400).json({ success: false, error: 'Missing googleId or email.' });
    }

    let userObj = { googleId, email, name, avatar, lastLogin: new Date() };

    // Only query MongoDB if connection is ready and active (readyState === 1)
    if (UserModel && mongoose && mongoose.connection.readyState === 1) {
      userObj = await UserModel.findOneAndUpdate(
        { googleId },
        { email, name, avatar, lastLogin: new Date() },
        { upsert: true, new: true }
      );
      console.log(`[MongoDB Atlas] User profile saved/updated in DB: ${name} (${email})`);
    } else {
      localUserStore.set(googleId, userObj);
      console.log(`[User Auth] User profile authenticated successfully: ${name} (${email})`);
    }

    res.json({ success: true, user: userObj });
  } catch (err: any) {
    console.error('[MongoDB Auth Note]', err.message);
    const fallbackUser = { googleId: req.body.googleId, email: req.body.email, name: req.body.name, avatar: req.body.avatar, lastLogin: new Date() };
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
    
    // Extract code snippet from response
    const match = aiResponse.match(/```(?:[a-z]*)\n([\s\S]*?)\n```/i);
    const fixedCode = match ? match[1].trim() : null;

    res.json({ success: true, explanation: aiResponse, fixedCode });
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
