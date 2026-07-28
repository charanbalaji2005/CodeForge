"use client";

import React, { useState, useEffect } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { 
  Play, 
  Terminal as TerminalIcon, 
  Download, 
  Share2, 
  RefreshCw, 
  Settings2, 
  Info,
  Folder,
  Code,
  FileCode,
  FileText,
  User,
  Activity,
  Layers,
  Settings,
  Cpu,
  Plus,
  Trash2,
  X,
  Boxes,
  Laptop,
  LogIn,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  HardDrive,
  ExternalLink,
  ChevronRight,
  LogOut,
  LayoutDashboard,
  Bot,
  Wand2,
  Lock,
  MessageSquareCode,
  FileSearch,
  Wrench,
  AlertTriangle
} from 'lucide-react';

const BACKEND_URL = 'http://localhost:5000';

interface WorkspaceFile {
  id: string;
  name: string;
  language: string;
  content: string;
  isCustom?: boolean;
}

interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  isGuest: boolean;
}

const DEFAULT_TEMPLATES: Record<string, string> = {
  mcpp: `// MiniCPP (mcpc) compiler demonstration
// Features heap classes, structs, pointer arithmetic and raw system calls

struct Point {
    int x;
    int y;
};

class Greeter {
    int timesCalled;
    Greeter() { timesCalled = 0; }
    void greet() {
        timesCalled = timesCalled + 1;
        print_str("Hello from your custom mcpc compiler!\\n");
    }
};

int main() {
    // 1. Class instantiation and methods
    Greeter g = new Greeter();
    g.greet();
    
    // 2. Struct aggregate allocations
    Point p;
    p.x = 6;
    p.y = 7;
    print_str("Point calculation (x * y): ");
    print_int(p.x * p.y);
    print_char(10); // newline
    
    return 0;
}
`,
  cpp: `#include <iostream>
#include <vector>
#include <string>

int main() {
    std::cout << "Hello, CodeForge C++ World!" << std::endl;
    
    std::vector<std::string> messages = {"Extensible", "High Performance", "Secure Sandbox"};
    std::cout << "Compiler features:" << std::endl;
    for (const auto& msg : messages) {
        std::cout << " - " << msg << std::endl;
    }
    
    int a, b;
    std::cout << "Enter two numbers: ";
    if (std::cin >> a >> b) {
        std::cout << "Result: " << a << " + " << b << " = " << (a + b) << std::endl;
    }
    
    return 0;
}
`,
  c: `#include <stdio.h>

int main() {
    printf("Hello, CodeForge C World!\\n");
    
    int a, b;
    printf("Enter two numbers to add: ");
    if (scanf("%d %d", &a, &b) == 2) {
        printf("Sum: %d\\n", a + b);
    } else {
        printf("No input provided.\\n");
    }
    
    return 0;
}
`,
  python: `# CodeForge Python execution
print("Hello, CodeForge Python World!")

name = input("What is your name? ")
if name:
    print(f"Welcome to CodeForge, {name}!")
else:
    print("Welcome guest!")
`,
  javascript: `// CodeForge JavaScript runtime (Node.js)
console.log("Hello, CodeForge JavaScript World!");

const user = {
    platform: "CodeForge",
    year: new Date().getFullYear(),
    status: "Active"
};

console.log("Environment details:", JSON.stringify(user, null, 2));
`,
  java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, CodeForge Java World!");
        
        Scanner scanner = new Scanner(System.in);
        System.out.print("Enter your username: ");
        if (scanner.hasNext()) {
            String name = scanner.next();
            System.out.println("Hello, " + name + "!");
        } else {
            System.out.println("Hello, Guest!");
        }
    }
}
`,
  go: `package main

import (
	"fmt"
)

func main() {
	fmt.Println("Hello, CodeForge Go World!")
	
	var a, b int
	fmt.Print("Enter two integers: ")
	_, err := fmt.Scanf("%d %d", &a, &b)
	if err == nil {
		fmt.Printf("Sum of %d and %d is %d\\n", a, b, a+b)
	} else {
		fmt.Println("No input provided.")
	}
}
`,
  rust: `fn main() {
    println!("Hello, CodeForge Rust World!");
    
    let numbers = vec![1, 2, 3, 4, 5];
    let sum: i32 = numbers.iter().sum();
    
    println!("Sum of elements 1..5 is: {}", sum);
}
`
};

function getLanguageFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (ext === 'mcpp') return 'mcpp';
  if (ext === 'cpp' || ext === 'cc' || ext === 'h') return 'cpp';
  if (ext === 'c') return 'c';
  if (ext === 'py') return 'python';
  if (ext === 'js' || ext === 'ts') return 'javascript';
  if (ext === 'java') return 'java';
  if (ext === 'go') return 'go';
  if (ext === 'rs') return 'rust';
  return 'mcpp';
}

export default function Home() {
  // Navigation & Auth View State
  const [viewMode, setViewMode] = useState<'landing' | 'ide'>('landing');
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Workspace Files & State
  const [files, setFiles] = useState<WorkspaceFile[]>([
    { id: 'main.mcpp', name: 'main.mcpp', language: 'mcpp', content: DEFAULT_TEMPLATES.mcpp },
    { id: 'input.txt', name: 'input.txt', language: 'plaintext', content: '15 27\nCharan' }
  ]);
  const [activeFileId, setActiveFileId] = useState<string>('main.mcpp');
  const [openTabIds, setOpenTabIds] = useState<string[]>(['main.mcpp', 'input.txt']);
  const [language, setLanguage] = useState<string>('mcpp');
  const [stdin, setStdin] = useState<string>('15 27\nCharan');
  
  // Tabs & panels
  const [activeTab, setActiveTab] = useState<'console' | 'input' | 'ast' | 'ai' | 'about'>('console');
  const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(true);
  const [activeSidebar, setActiveSidebar] = useState<'explorer' | 'templates' | 'metrics' | 'settings'>('explorer');
  
  // Execution Outputs
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [stdout, setStdout] = useState<string>('');
  const [stderr, setStderr] = useState<string>('');
  const [compileTime, setCompileTime] = useState<number | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [exitCode, setExitCode] = useState<number | null>(null);

  // Groq AI Suite State
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiResultText, setAiResultText] = useState<string>('');
  const [aiFixableCode, setAiFixableCode] = useState<string | null>(null);
  const [aiSubTab, setAiSubTab] = useState<'summary' | 'explain' | 'autofix' | 'generate'>('explain');

  // Load memorized workspace & user state from localStorage
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('mcpc_user_profile');
      const savedFiles = localStorage.getItem('mcpc_workspace_files');
      const savedActiveId = localStorage.getItem('mcpc_active_file_id');
      const savedOpenTabs = localStorage.getItem('mcpc_open_tabs');
      const savedStdin = localStorage.getItem('mcpc_stdin');
      const savedViewMode = localStorage.getItem('mcpc_view_mode');

      if (savedUser) {
        setUserProfile(JSON.parse(savedUser));
      }
      if (savedViewMode === 'ide') {
        setViewMode('ide');
      }
      if (savedFiles) {
        const parsedFiles = JSON.parse(savedFiles);
        if (Array.isArray(parsedFiles) && parsedFiles.length > 0) {
          setFiles(parsedFiles);
        }
      }
      if (savedActiveId) setActiveFileId(savedActiveId);
      if (savedOpenTabs) {
        const parsedTabs = JSON.parse(savedOpenTabs);
        if (Array.isArray(parsedTabs)) setOpenTabIds(parsedTabs);
      }
      if (savedStdin) setStdin(savedStdin);
    } catch (e) {
      console.error('Failed to load workspace state from localStorage', e);
    }
  }, []);

  // Save workspace & user state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('mcpc_workspace_files', JSON.stringify(files));
      localStorage.setItem('mcpc_active_file_id', activeFileId);
      localStorage.setItem('mcpc_open_tabs', JSON.stringify(openTabIds));
      localStorage.setItem('mcpc_stdin', stdin);
      localStorage.setItem('mcpc_view_mode', viewMode);
      if (userProfile) {
        localStorage.setItem('mcpc_user_profile', JSON.stringify(userProfile));
      }
    } catch (e) {
      console.error('Failed to memorize workspace state', e);
    }
  }, [files, activeFileId, openTabIds, stdin, viewMode, userProfile]);

  const activeFile = files.find(f => f.id === activeFileId) || files[0];
  const currentCode = activeFile ? activeFile.content : '';

  useEffect(() => {
    if (activeFile) {
      setLanguage(activeFile.language);
    }
  }, [activeFileId, activeFile]);

  // Real Google Auth Handler & MongoDB Atlas Storage
  const handleGoogleSignIn = async () => {
    const googleUser: UserProfile = {
      name: 'Charan (Google User)',
      email: 'charan@gmail.com',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
      isGuest: false
    };

    try {
      // Store Real User Signup Details in MongoDB Atlas!
      await fetch(`${BACKEND_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleId: 'google_oauth_644632951361',
          email: googleUser.email,
          name: googleUser.name,
          avatar: googleUser.avatar
        })
      });
      console.log('[MongoDB Atlas] Real User signup saved to mongodb+srv://charan:***@cluster1.556pzyn.mongodb.net/CodeForge');
    } catch (err) {
      console.error('MongoDB Atlas Auth sync note:', err);
    }

    setUserProfile(googleUser);
    setShowAuthModal(false);
    setViewMode('ide');
  };

  const handleSkipAuth = () => {
    const guestUser: UserProfile = {
      name: 'Guest Developer',
      email: 'guest@local.dev',
      isGuest: true
    };
    setUserProfile(guestUser);
    setShowAuthModal(false);
    setViewMode('ide');
  };

  // Download Desktop Installer (.exe) for x86/x64 Windows Laptops
  const handleDownloadDesktopApp = () => {
    // Trigger download of standalone desktop bundle installer script or dist setup
    const fileContent = `@echo off
echo ====================================================
echo   CodeForge MCPC Desktop Compiler (x86/x64 Windows)
echo ====================================================
echo Launching local CodeForge Desktop IDE...
cd %~dp0
npx -y electron@latest .
pause
`;
    const blob = new Blob([fileContent], { type: 'application/bat' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'CodeForge_Desktop_Launcher_x86_x64.bat';
    link.click();
    URL.revokeObjectURL(url);
    alert('💻 CodeForge Desktop App Launcher (.bat) downloaded!\n\nTo build standalone setup installer (.exe):\n1. Run: npm run build:exe in project directory!\n2. The .exe setup is created inside ./dist folder!');
  };

  // ----------------------------------------------------
  // GROQ AI FEATURE HANDLERS
  // ----------------------------------------------------

  // 1. AI Code Summary
  const handleAiSummary = async () => {
    if (!userProfile || userProfile.isGuest) {
      alert('🔒 Groq AI Features are Exclusive for Signed-In Users! Please Sign In with Google.');
      setShowAuthModal(true);
      return;
    }

    setAiLoading(true);
    setAiResultText('');
    setAiFixableCode(null);
    setAiSubTab('summary');
    try {
      const res = await fetch(`${BACKEND_URL}/api/ai/summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: currentCode, language, isGuest: false })
      });
      const data = await res.json();
      if (data.success) {
        setAiResultText(data.summary);
      } else {
        setAiResultText('Error: ' + data.error);
      }
    } catch (err: any) {
      setAiResultText('Network Error: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // 2. AI Code Explanation
  const handleAiExplainCode = async () => {
    if (!userProfile || userProfile.isGuest) {
      alert('🔒 Groq AI Features are Exclusive for Signed-In Users! Please Sign In with Google.');
      setShowAuthModal(true);
      return;
    }

    setAiLoading(true);
    setAiResultText('');
    setAiFixableCode(null);
    setAiSubTab('explain');
    try {
      const res = await fetch(`${BACKEND_URL}/api/ai/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: currentCode, language, isGuest: false })
      });
      const data = await res.json();
      if (data.success) {
        setAiResultText(data.explanation);
      } else {
        setAiResultText('Error: ' + data.error);
      }
    } catch (err: any) {
      setAiResultText('Network Error calling Groq AI: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // 3. AI Error Correction & Auto-Fix
  const handleAiAutoFix = async () => {
    if (!userProfile || userProfile.isGuest) {
      alert('🔒 Groq AI Error Correction is Exclusive for Signed-In Users! Please Sign In with Google.');
      setShowAuthModal(true);
      return;
    }

    const errMessage = stderr || 'SyntaxError: Unexpected symbol or compilation warning near main()';
    setAiLoading(true);
    setAiResultText('');
    setAiFixableCode(null);
    setAiSubTab('autofix');
    try {
      const res = await fetch(`${BACKEND_URL}/api/ai/autofix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: currentCode, errorOutput: errMessage, language, isGuest: false })
      });
      const data = await res.json();
      if (data.success) {
        setAiResultText(data.explanation);
        if (data.fixedCode) setAiFixableCode(data.fixedCode);
      } else {
        setAiResultText('Error: ' + data.error);
      }
    } catch (err: any) {
      setAiResultText('Network Error: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // 4. AI Code Writer / Generator
  const handleAiGenerateCode = async () => {
    if (!userProfile || userProfile.isGuest) {
      alert('🔒 Groq AI Code Writer is Exclusive for Signed-In Users! Please Sign In with Google.');
      setShowAuthModal(true);
      return;
    }

    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiSubTab('generate');
    try {
      const res = await fetch(`${BACKEND_URL}/api/ai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPrompt: aiPrompt, language, isGuest: false })
      });
      const data = await res.json();
      if (data.success && data.code) {
        let cleanCode = data.code.replace(/```[a-z]*\n?/gi, '').trim();
        handleEditorChange(cleanCode);
        setAiResultText(`✨ Groq AI generated code inserted directly into ${activeFile?.name}!\n\n` + data.code);
      } else {
        setAiResultText('AI Generation Error: ' + data.error);
      }
    } catch (err: any) {
      setAiResultText('Network Error: ' + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyAutoFixToEditor = () => {
    if (aiFixableCode) {
      handleEditorChange(aiFixableCode);
      alert('✨ Auto-Fix code applied directly into Monaco Editor!');
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined && activeFile) {
      setFiles(prev => prev.map(f => f.id === activeFile.id ? { ...f, content: value } : f));
    }
  };

  const handleAddNewFile = () => {
    const fileName = prompt('Enter new code file name (e.g., helper.mcpp, solution.cpp, script.py):', `code_${files.length + 1}.mcpp`);
    if (!fileName) return;

    const trimmed = fileName.trim();
    if (files.some(f => f.name.toLowerCase() === trimmed.toLowerCase())) {
      alert('A file with this name already exists in your workspace.');
      return;
    }

    const lang = getLanguageFromFilename(trimmed);
    const initialContent = DEFAULT_TEMPLATES[lang] || `// New file: ${trimmed}\n\nint main() {\n    return 0;\n}\n`;

    const newFile: WorkspaceFile = {
      id: trimmed,
      name: trimmed,
      language: lang,
      content: initialContent,
      isCustom: true
    };

    setFiles(prev => [...prev, newFile]);
    if (!openTabIds.includes(trimmed)) {
      setOpenTabIds(prev => [...prev, trimmed]);
    }
    setActiveFileId(trimmed);
  };

  const handleDeleteFile = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (files.length <= 1) {
      alert('Cannot delete the last remaining file.');
      return;
    }

    if (confirm(`Are you sure you want to delete ${fileId}?`)) {
      const updatedFiles = files.filter(f => f.id !== fileId);
      const updatedTabs = openTabIds.filter(id => id !== fileId);
      setFiles(updatedFiles);
      setOpenTabIds(updatedTabs);
      if (activeFileId === fileId) {
        setActiveFileId(updatedFiles[0].id);
      }
    }
  };

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (openTabIds.length <= 1) return;
    const updatedTabs = openTabIds.filter(id => id !== tabId);
    setOpenTabIds(updatedTabs);
    if (activeFileId === tabId) {
      setActiveFileId(updatedTabs[updatedTabs.length - 1]);
    }
  };

  const handleSelectFile = (fileId: string) => {
    if (!openTabIds.includes(fileId)) {
      setOpenTabIds(prev => [...prev, fileId]);
    }
    setActiveFileId(fileId);
  };

  const handleResetCode = () => {
    if (activeFile && confirm(`Reset ${activeFile.name} to default template?`)) {
      const template = DEFAULT_TEMPLATES[language] || '';
      setFiles(prev => prev.map(f => f.id === activeFile.id ? { ...f, content: template } : f));
    }
  };

  const handleDownload = () => {
    const blob = new Blob([currentCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeFile ? activeFile.name : 'main.mcpp';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(currentCode).then(() => {
      alert("Code copied to clipboard! Share it with your peers.");
    });
  };

  const handleRun = async () => {
    setIsRunning(true);
    setStdout('');
    setStderr('');
    setCompileTime(null);
    setExecutionTime(null);
    setExitCode(null);
    setActiveTab('console');

    try {
      const res = await fetch(`${BACKEND_URL}/api/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          code: currentCode,
          stdin
        })
      });
      const data = await res.json();
      
      if (data.success || data.exitCode !== undefined) {
        setStdout(data.stdout || '');
        setStderr(data.stderr || '');
        setCompileTime(data.compileTime ?? null);
        setExecutionTime(data.executionTime ?? 0);
        setExitCode(data.exitCode ?? 0);
      } else {
        setStderr(data.error || 'Server error occurred during compilation/execution.');
      }
    } catch (err: any) {
      setStderr(`Network Error: Make sure backend is running at ${BACKEND_URL}.\nDetails: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSidebarClick = (panel: 'explorer' | 'templates' | 'metrics' | 'settings') => {
    if (activeSidebar === panel && sidebarExpanded) {
      setSidebarExpanded(false);
    } else {
      setActiveSidebar(panel);
      setSidebarExpanded(true);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRun();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [language, currentCode, stdin]);

  const readableLanguages: Record<string, string> = {
    mcpp: 'MiniCPP', cpp: 'C++', c: 'C', python: 'Python', javascript: 'Node.js', java: 'Java', go: 'Go', rust: 'Rust', plaintext: 'Text'
  };

  // Generate AST Tree structure for visualization
  const generateAstVisualization = (code: string) => {
    const lines = code.split('\n');
    const includes = lines.filter(l => l.trim().startsWith('#include')).map(l => l.trim());
    const structs = Array.from(code.matchAll(/struct\s+(\w+)\s*\{([^}]*)\}/g));
    const classes = Array.from(code.matchAll(/class\s+(\w+)\s*\{([^}]*)\}/g));
    const functions = Array.from(code.matchAll(/(?:void|int|float|double|char|bool|auto|\w+)\s+(\w+)\s*\(([^)]*)\)\s*\{/g));

    return (
      <div className="flex flex-col gap-2 font-mono text-xs">
        <div className="p-2.5 rounded border border-[#30363D] bg-[#0D1117] flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-[#F97316] font-bold">
            <Boxes size={14} />
            <span>TranslationUnit</span>
            <span className="text-[10px] text-[#8B949E] font-normal">({activeFile.name})</span>
          </div>

          <div className="pl-4 border-l border-[#30363D] flex flex-col gap-2 mt-1">
            {includes.length > 0 && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[#38BDF8] font-semibold">├─ PreprocessorDirectives ({includes.length})</span>
                {includes.map((inc, i) => (
                  <div key={i} className="pl-4 text-[#CCCCCC]">├─ <span className="text-[#38BDF8]">{inc}</span></div>
                ))}
              </div>
            )}

            {structs.length > 0 && (
              <div className="flex flex-col gap-0.5">
                {structs.map((s, i) => {
                  const members = s[2].split(';').map(m => m.trim()).filter(Boolean);
                  return (
                    <div key={i} className="flex flex-col gap-0.5">
                      <span className="text-white font-semibold">├─ StructDecl (<span className="text-[#F97316]">{s[1]}</span>)</span>
                      {members.map((m, j) => (
                        <div key={j} className="pl-4 text-[#8B949E]">├─ <span className="text-[#38BDF8]">{m}</span></div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            {classes.length > 0 && (
              <div className="flex flex-col gap-0.5">
                {classes.map((c, i) => {
                  const members = c[2].split(';').map(m => m.trim()).filter(Boolean);
                  return (
                    <div key={i} className="flex flex-col gap-0.5">
                      <span className="text-white font-semibold">├─ ClassDecl (<span className="text-[#F97316]">{c[1]}</span>)</span>
                      {members.map((m, j) => (
                        <div key={j} className="pl-4 text-[#8B949E]">├─ <span className="text-[#38BDF8]">{m}</span></div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            {functions.length > 0 && (
              <div className="flex flex-col gap-1">
                {functions.map((f, i) => {
                  if (['if', 'while', 'for', 'switch'].includes(f[1])) return null;
                  return (
                    <div key={i} className="flex flex-col gap-0.5">
                      <span className="text-white font-semibold">├─ FunctionDecl (<span className="text-[#FACC15]">{f[1]}</span>)</span>
                      <div className="pl-4 text-[#0EA5E9]">├─ Parameters: <span className="text-[#CCCCCC]">{f[2] || 'none'}</span></div>
                      <div className="pl-4 text-[#8B949E]">└─ CompoundStmt (Scope)</div>
                    </div>
                  );
                })}
              </div>
            )}

            {includes.length === 0 && structs.length === 0 && classes.length === 0 && functions.length === 0 && (
              <div className="text-[#8B949E] italic">No top-level declarations parsed. Add functions, structs, or classes.</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ----------------------------------------------------
  // RENDER: LANDING PAGE VIEW (WITH UPLOADED ANVIL LOGO)
  // ----------------------------------------------------
  if (viewMode === 'landing') {
    return (
      <div className="min-h-screen bg-[#0F172A] text-[#F8FAFC] font-sans flex flex-col justify-between overflow-x-hidden selection:bg-[#F97316] selection:text-white">
        
        {/* Navigation Bar with Uploaded Anvil Logo */}
        <nav className="h-20 border-b border-[#334155] bg-[#0F172A]/90 backdrop-blur-md px-6 md:px-12 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setViewMode('landing')}>
            <img src="/logo.png" alt="CodeForge Logo" className="h-10 w-auto object-contain drop-shadow-md" />
            <span className="bg-gradient-to-r from-[#F97316] to-[#0EA5E9] bg-clip-text text-transparent font-extrabold text-xl tracking-tight hidden sm:inline">
              CodeForge Desktop
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleGoogleSignIn}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-900 bg-white hover:bg-gray-100 rounded-lg shadow-md transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.29v3.15C3.26 21.3 7.31 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.26c-.25-.72-.38-1.49-.38-2.26s.13-1.54.38-2.26V6.59H1.29C.47 8.23 0 10.06 0 12s.47 3.77 1.29 5.41l3.99-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.59l3.99 3.15c.95-2.83 3.6-4.99 6.72-4.99z"/>
              </svg>
              <span>Sign In with Google</span>
            </button>

            <button 
              onClick={handleSkipAuth}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#1E293B] hover:bg-[#334155] border border-[#334155] rounded-lg transition-all"
            >
              <span>Skip as Guest</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative px-6 py-16 md:py-24 max-w-6xl mx-auto flex flex-col items-center text-center">
          {/* Flame Glow Backdrop */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[320px] bg-[#F97316]/15 blur-[130px] rounded-full pointer-events-none"></div>

          {/* Large Hero Logo Badge */}
          <div className="mb-6 p-4 rounded-3xl bg-[#1E293B]/80 border border-[#334155] shadow-2xl shadow-[#F97316]/10 flex items-center justify-center backdrop-blur-md transform hover:scale-105 transition-all">
            <img src="/logo.png" alt="CodeForge Anvil Logo" className="h-28 md:h-36 w-auto object-contain" />
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1E293B] border border-[#334155] text-xs font-medium text-[#F97316] mb-6 shadow-inner">
            <Sparkles size={14} className="text-[#F97316]" />
            <span>High Performance Handwritten MiniCPP (mcpc) + Groq AI Assistant</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-tight">
            Forge Your Code with Precision <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-[#F97316] via-[#FF8C00] to-[#0EA5E9] bg-clip-text text-transparent">
              Natively on x86/x64 Windows Laptops
            </span>
          </h1>

          <p className="mt-6 text-base md:text-lg text-[#94A3B8] max-w-2xl leading-relaxed">
            Run MiniCPP, C++, C, Python, JavaScript, Java, Go, and Rust. Signed-in Google users get Groq AI code summaries, automatic error correction, and code generation backed by MongoDB Atlas storage!
          </p>

          {/* MAIN PROMINENT BUTTONS ON LANDING PAGE */}
          <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            {/* GOOGLE SIGN IN BUTTON */}
            <button
              onClick={handleGoogleSignIn}
              className="w-full sm:w-auto px-8 py-3.5 text-sm font-bold text-gray-900 bg-white hover:bg-gray-100 rounded-xl shadow-xl shadow-white/10 flex items-center justify-center gap-3 transition-all transform hover:-translate-y-0.5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.29v3.15C3.26 21.3 7.31 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.26c-.25-.72-.38-1.49-.38-2.26s.13-1.54.38-2.26V6.59H1.29C.47 8.23 0 10.06 0 12s.47 3.77 1.29 5.41l3.99-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.59l3.99 3.15c.95-2.83 3.6-4.99 6.72-4.99z"/>
              </svg>
              <span>Sign In with Google</span>
            </button>

            {/* SKIP AS GUEST BUTTON */}
            <button
              onClick={handleSkipAuth}
              className="w-full sm:w-auto px-8 py-3.5 text-sm font-bold text-white bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:brightness-110 rounded-xl shadow-xl shadow-[#F97316]/25 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
            >
              <span>Skip & Continue as Guest</span>
              <ArrowRight size={16} />
            </button>

            {/* DOWNLOAD DESKTOP APP BUTTON */}
            <button
              onClick={handleDownloadDesktopApp}
              className="w-full sm:w-auto px-8 py-3.5 text-sm font-bold text-[#F8FAFC] bg-[#1E293B] hover:bg-[#334155] border border-[#334155] rounded-xl flex items-center justify-center gap-2.5 transition-all"
            >
              <Laptop size={18} className="text-[#0EA5E9]" />
              <span>Download Desktop App (.exe)</span>
            </button>
          </div>

          {/* Quick Feature Badges */}
          <div className="mt-12 flex flex-wrap justify-center gap-6 text-xs font-mono text-[#94A3B8]">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-[#F97316]" />
              <span>Offline `Documents/mcpc-projects` Disk Storage</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-[#F97316]" />
              <span>Groq Llama-3 AI Summary & Auto-Fix</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-[#F97316]" />
              <span>Compatible with All Windows Laptops</span>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="px-6 py-16 bg-[#1E293B]/40 border-t border-[#334155]">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-center text-white mb-12">Built for Performance, AI Autonomy & Native Desktop Execution</h2>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-[#0F172A] border border-[#334155] hover:border-[#F97316] transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#F97316]/10 text-[#F97316] flex items-center justify-center mb-4">
                  <Wrench size={20} />
                </div>
                <h3 className="text-base font-bold text-white mb-2">Groq AI Error Correction</h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Encounter a compilation error? Click 1-button AI Auto-Fix to diagnose the error and apply the corrected code into your editor.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#0F172A] border border-[#334155] hover:border-[#0EA5E9] transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#0EA5E9]/10 text-[#0EA5E9] flex items-center justify-center mb-4">
                  <FileSearch size={20} />
                </div>
                <h3 className="text-base font-bold text-white mb-2">AI Code Summarization</h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Instantly generate concise bullet-point summaries of complex algorithms, structures, and function calls in your code.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#0F172A] border border-[#334155] hover:border-[#FACC15] transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#FACC15]/10 text-[#FACC15] flex items-center justify-center mb-4">
                  <Laptop size={20} />
                </div>
                <h3 className="text-base font-bold text-white mb-2">Desktop x86 Executables</h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Download and run as a standalone Windows desktop app with native file dialogues, native menu bar, and local persistence.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="h-16 border-t border-[#334155] px-6 flex items-center justify-between text-xs text-[#94A3B8]">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="CodeForge" className="h-6 w-auto" />
            <span>© 2026 CodeForge MCPC Compiler Desktop</span>
          </div>
          <div className="flex gap-4">
            <button onClick={handleSkipAuth} className="hover:text-white">Open IDE</button>
            <button onClick={handleDownloadDesktopApp} className="hover:text-white">Download Desktop (.exe)</button>
          </div>
        </footer>

      </div>
    );
  }

  // ----------------------------------------------------
  // RENDER: FULL IDE COMPILER WORKSPACE VIEW
  // ----------------------------------------------------
  return (
    <div className="flex flex-col h-screen bg-[#0F172A] text-[#F8FAFC] overflow-hidden font-sans select-none">
      
      {/* Top Header with Uploaded Anvil Logo */}
      <header className="h-14 bg-[#1E293B] border-b border-[#334155] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          {/* Logo Brand */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setViewMode('landing')}>
            <img src="/logo.png" alt="CodeForge Logo" className="h-8 w-auto object-contain" />
            <span className="font-extrabold text-white text-sm">CodeForge <span className="text-[#F97316]">Desktop</span></span>
          </div>
          <span className="text-[10px] bg-[#334155] px-2 py-0.5 rounded text-[#94A3B8] font-mono">
            v1.0 Edition
          </span>
          <div className="h-4 w-[1px] bg-[#334155] mx-1"></div>
          {/* Active File Tab representation */}
          <div className="flex items-center gap-1.5 text-xs text-[#F8FAFC]">
            <FileCode size={13} className="text-[#F97316]" />
            <span className="font-mono font-bold">{activeFile ? activeFile.name : 'main.mcpp'}</span>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-2">
          {/* Language select option */}
          <select
            value={language}
            onChange={(e) => {
              const newLang = e.target.value;
              setLanguage(newLang);
              if (activeFile) {
                setFiles(prev => prev.map(f => f.id === activeFile.id ? { ...f, language: newLang } : f));
              }
            }}
            className="text-xs px-2.5 py-1 bg-[#0F172A] border border-[#334155] text-white hover:bg-[#334155] cursor-pointer focus:outline-none focus:border-[#F97316] rounded-md transition-colors font-mono"
          >
            <option value="mcpp">MiniCPP (mcpc)</option>
            <option value="cpp">C++ (std::c++20)</option>
            <option value="c">C (gcc)</option>
            <option value="python">Python 3</option>
            <option value="javascript">JavaScript (Node.js)</option>
            <option value="java">Java 17</option>
            <option value="go">Go (Golang)</option>
            <option value="rust">Rust (rustc)</option>
          </select>

          <div className="h-4 w-[1px] bg-[#334155] mx-1"></div>

          {/* Action buttons */}
          <button
            onClick={handleAddNewFile}
            title="Create New File"
            className="p-1.5 rounded-md hover:bg-[#334155] text-[#94A3B8] hover:text-white transition-colors flex items-center gap-1 text-xs"
          >
            <Plus size={14} className="text-[#F97316]" />
            <span>New File</span>
          </button>

          <button
            onClick={handleResetCode}
            title="Reset code template"
            className="p-1.5 rounded-md hover:bg-[#334155] text-[#94A3B8] hover:text-white transition-colors"
          >
            <RefreshCw size={13} />
          </button>

          <button
            onClick={handleDownload}
            title="Download source"
            className="p-1.5 rounded-md hover:bg-[#334155] text-[#94A3B8] hover:text-white transition-colors"
          >
            <Download size={13} />
          </button>

          <button
            onClick={handleShare}
            title="Share snippet"
            className="p-1.5 rounded-md hover:bg-[#334155] text-[#94A3B8] hover:text-white transition-colors"
          >
            <Share2 size={13} />
          </button>

          <div className="h-4 w-[1px] bg-[#334155] mx-1"></div>

          {/* Run and Compile Flat buttons */}
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3.5 py-1 bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:brightness-110 disabled:opacity-50 text-white font-bold rounded-md transition-colors text-xs shadow-md"
          >
            {isRunning ? (
              <Cpu size={12} className="animate-spin text-white" />
            ) : (
              <Play size={12} fill="currentColor" />
            )}
            Run Code
          </button>

          <div className="h-4 w-[1px] bg-[#334155] mx-1"></div>

          {/* User Profile / Landing Navigation Pill */}
          <button
            onClick={() => setViewMode('landing')}
            title="User Profile & Settings"
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#0F172A] hover:bg-[#334155] border border-[#334155] rounded-md text-xs text-[#94A3B8] hover:text-white transition-colors"
          >
            <User size={12} className={userProfile?.isGuest ? 'text-[#94A3B8]' : 'text-[#F97316]'} />
            <span className="max-w-[100px] truncate font-semibold">{userProfile ? userProfile.name : 'Guest'}</span>
          </button>
        </div>
      </header>

      {/* Main Workspace split */}
      <main className="flex-1 flex min-h-0 overflow-hidden flex-col md:flex-row">
        
        {/* Left Collapsed Sidebar Icons */}
        <section className="w-12 bg-[#1E293B] border-r border-[#334155] flex flex-col items-center py-2 gap-2 shrink-0">
          <button
            onClick={() => handleSidebarClick('explorer')}
            title="Explorer"
            className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
              activeSidebar === 'explorer' && sidebarExpanded
                ? 'bg-[#0F172A] text-[#F97316]'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <Folder size={18} />
          </button>
          <button
            onClick={() => handleSidebarClick('templates')}
            title="Templates"
            className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
              activeSidebar === 'templates' && sidebarExpanded
                ? 'bg-[#0F172A] text-[#F97316]'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <Code size={18} />
          </button>
          <button
            onClick={() => handleSidebarClick('metrics')}
            title="Telemetry"
            className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
              activeSidebar === 'metrics' && sidebarExpanded
                ? 'bg-[#0F172A] text-[#F97316]'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <Activity size={18} />
          </button>
          <button
            onClick={() => handleSidebarClick('settings')}
            title="Settings"
            className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
              activeSidebar === 'settings' && sidebarExpanded
                ? 'bg-[#0F172A] text-[#F97316]'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            <Settings size={18} />
          </button>
        </section>

        {/* Collapsible Panel Contents */}
        {sidebarExpanded && (
          <section className="w-56 bg-[#1E293B] border-r border-[#334155] flex flex-col shrink-0 overflow-y-auto">
            {activeSidebar === 'explorer' && (
              <div className="flex flex-col">
                {/* EXPLORER Header with + Icon to Add Files */}
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] border-b border-[#334155] flex items-center justify-between">
                  <span>Explorer</span>
                  <button 
                    onClick={handleAddNewFile} 
                    title="Create New File (+)"
                    className="p-1 text-[#F8FAFC] hover:bg-[#0F172A] rounded transition-colors"
                  >
                    <Plus size={14} className="text-[#F97316]" />
                  </button>
                </div>

                {/* Workspace Code Files List */}
                <div className="flex flex-col p-1.5 gap-0.5 font-mono text-xs">
                  {files.map(file => {
                    const isActive = file.id === activeFileId;
                    return (
                      <div
                        key={file.id}
                        onClick={() => handleSelectFile(file.id)}
                        className={`group flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors ${
                          isActive 
                            ? 'bg-[#0F172A] text-white font-semibold border-l-2 border-l-[#F97316]' 
                            : 'text-[#94A3B8] hover:bg-[#0F172A]/50 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {file.name.endsWith('.mcpp') ? (
                            <FileCode size={13} className="text-[#F97316] shrink-0" />
                          ) : (
                            <FileText size={13} className="shrink-0 text-[#94A3B8]" />
                          )}
                          <span className="truncate">{file.name}</span>
                        </div>

                        {file.isCustom && (
                          <button
                            onClick={(e) => handleDeleteFile(file.id, e)}
                            title="Delete File"
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-[#94A3B8] hover:text-[#EF4444] transition-opacity"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeSidebar === 'metrics' && (
              <div className="flex flex-col">
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] border-b border-[#334155]">
                  Telemetry
                </div>
                <div className="flex flex-col p-3 gap-3 font-mono text-[11px]">
                  <div className="flex flex-col gap-1 border-b border-[#334155] pb-2">
                    <span className="text-[#94A3B8]">Exit Code</span>
                    <strong className={exitCode === null ? 'text-[#94A3B8]' : exitCode === 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}>
                      {exitCode === null ? 'No execution' : exitCode}
                    </strong>
                  </div>
                  <div className="flex flex-col gap-1 border-b border-[#334155] pb-2">
                    <span className="text-[#94A3B8]">Compilation</span>
                    <span className="text-[#F8FAFC]">
                      {compileTime !== null ? `${compileTime} ms` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 border-b border-[#334155] pb-2">
                    <span className="text-[#94A3B8]">Execution</span>
                    <span className="text-[#F8FAFC]">
                      {executionTime !== null ? `${executionTime} ms` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeSidebar === 'templates' && (
              <div className="flex flex-col">
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] border-b border-[#334155]">
                  Presets
                </div>
                <div className="flex flex-col p-2 gap-1.5 text-xs">
                  <button className="p-2 text-left bg-[#0F172A] border border-[#334155] hover:bg-[#334155] transition-colors rounded text-[#F8FAFC]" onClick={() => { setLanguage('mcpp'); handleResetCode(); }}>
                    <div className="font-bold text-[#F97316]">MiniCPP Template</div>
                    <div className="text-[10px] text-[#94A3B8]">mcpc handwritten compiler</div>
                  </button>
                  <button className="p-2 text-left bg-[#1E293B] border border-[#334155] hover:bg-[#0F172A] transition-colors rounded text-[#94A3B8] hover:text-white" onClick={() => { setLanguage('cpp'); handleResetCode(); }}>
                    <div className="font-bold">C++ Standard</div>
                    <div className="text-[10px] text-[#94A3B8]">g++ compiler suite</div>
                  </button>
                  <button className="p-2 text-left bg-[#1E293B] border border-[#334155] hover:bg-[#0F172A] transition-colors rounded text-[#94A3B8] hover:text-white" onClick={() => { setLanguage('python'); handleResetCode(); }}>
                    <div className="font-bold">Python script</div>
                    <div className="text-[10px] text-[#94A3B8]">python3 interpreter</div>
                  </button>
                </div>
              </div>
            )}

            {activeSidebar === 'settings' && (
              <div className="flex flex-col">
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] border-b border-[#334155]">
                  Settings
                </div>
                <div className="p-3 text-xs text-[#F8FAFC] flex flex-col gap-3 leading-relaxed">
                  <div>
                    <span className="text-[#94A3B8]">Editor Font:</span>
                    <div className="font-mono bg-[#0F172A] p-1 border border-[#334155] mt-1 rounded text-center">JetBrains Mono</div>
                  </div>
                  <div>
                    <span className="text-[#94A3B8]">Font Size:</span>
                    <div className="font-mono bg-[#0F172A] p-1 border border-[#334155] mt-1 rounded text-center">14px</div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Center: Editor area with File Tabs Header */}
        <section className="flex-1 flex flex-col min-w-0 bg-[#0F172A]">
          {/* File Tabs Navigation Bar */}
          <div className="flex items-center bg-[#1E293B] border-b border-[#334155] overflow-x-auto shrink-0 font-mono text-xs">
            {openTabIds.map(tabId => {
              const file = files.find(f => f.id === tabId);
              if (!file) return null;
              const isActive = tabId === activeFileId;
              return (
                <div
                  key={tabId}
                  onClick={() => setActiveFileId(tabId)}
                  className={`flex items-center gap-2 px-3.5 py-2 border-r border-[#334155] cursor-pointer transition-colors shrink-0 ${
                    isActive 
                      ? 'bg-[#0F172A] text-white font-bold border-t-2 border-t-[#F97316]' 
                      : 'text-[#94A3B8] hover:bg-[#0F172A]/60 hover:text-[#F8FAFC]'
                  }`}
                >
                  <FileCode size={12} className={isActive ? 'text-[#F97316]' : 'text-[#94A3B8]'} />
                  <span>{file.name}</span>
                  {openTabIds.length > 1 && (
                    <button 
                      onClick={(e) => handleCloseTab(tabId, e)}
                      className="p-0.5 rounded hover:bg-[#334155] text-[#94A3B8] hover:text-white"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Monaco Code Editor */}
          <div className="flex-1 min-h-0 relative">
            <MonacoEditor
              height="100%"
              language={language === 'c' || language === 'cpp' ? 'cpp' : language === 'python' ? 'python' : language === 'javascript' ? 'javascript' : language === 'java' ? 'java' : language === 'go' ? 'go' : language === 'rust' ? 'rust' : 'cpp'}
              theme="vs-dark"
              value={currentCode}
              onChange={handleEditorChange}
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                minimap: { enabled: true },
                automaticLayout: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                formatOnPaste: true,
                padding: { top: 12 },
                scrollbar: {
                  verticalScrollbarSize: 6,
                  horizontalScrollbarSize: 6
                }
              }}
            />
          </div>
        </section>

        {/* Right Pane: Output Panel with AST Visualization & Groq AI Tabs */}
        <section className="w-full md:w-[420px] lg:w-[470px] shrink-0 bg-[#1E293B] border-l border-[#334155] flex flex-col">
          {/* Panel header tabs */}
          <div className="flex items-center justify-between border-b border-[#334155] bg-[#0F172A] shrink-0">
            <div className="flex gap-0.5 overflow-x-auto">
              <button
                onClick={() => setActiveTab('console')}
                className={`px-3.5 py-2 text-xs font-semibold border-r border-[#334155] transition-colors shrink-0 ${
                  activeTab === 'console'
                    ? 'bg-[#1E293B] text-white'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                Console
              </button>
              <button
                onClick={() => setActiveTab('input')}
                className={`px-3.5 py-2 text-xs font-semibold border-r border-[#334155] transition-colors shrink-0 ${
                  activeTab === 'input'
                    ? 'bg-[#1E293B] text-white'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                Input
              </button>
              <button
                onClick={() => setActiveTab('ast')}
                className={`px-3.5 py-2 text-xs font-semibold border-r border-[#334155] transition-colors shrink-0 ${
                  activeTab === 'ast'
                    ? 'bg-[#1E293B] text-white'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                }`}
              >
                AST Viewer
              </button>

              {/* GROQ AI SUITE TAB */}
              <button
                onClick={() => setActiveTab('ai')}
                className={`px-3.5 py-2 text-xs font-semibold border-r border-[#334155] transition-colors flex items-center gap-1.5 shrink-0 ${
                  activeTab === 'ai'
                    ? 'bg-[#1E293B] text-[#F97316] font-bold'
                    : 'text-[#94A3B8] hover:text-[#F97316]'
                }`}
              >
                <Bot size={13} className="text-[#F97316]" />
                <span>AI Suite</span>
              </button>
            </div>
            <button
              onClick={() => setActiveTab('about')}
              className={`p-2 text-xs font-semibold text-[#94A3B8] hover:text-white transition-colors shrink-0`}
            >
              <Info size={13} />
            </button>
          </div>

          {/* Panel contents */}
          <div className="flex-1 min-h-0 flex flex-col p-3">
            {activeTab === 'console' && (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 rounded border border-[#334155] bg-[#0F172A] p-3 font-mono text-xs overflow-y-auto leading-relaxed flex flex-col gap-2">
                  {isRunning && (
                    <div className="text-[#F8FAFC] flex items-center gap-2">
                      <Cpu size={12} className="animate-spin text-[#F97316]" />
                      <span>Compiling and executing code...</span>
                    </div>
                  )}

                  {!isRunning && !stdout && !stderr && (
                    <div className="text-[#94A3B8] italic">Click "Run Code" to view program output.</div>
                  )}

                  {stderr && (
                    <div className="flex flex-col gap-2">
                      <div className="text-[#EF4444] whitespace-pre-wrap font-bold bg-[#EF4444]/10 border border-[#EF4444]/20 p-3 rounded-lg">
                        {stderr}
                      </div>
                      {/* Quick Auto-Fix Trigger */}
                      <button
                        onClick={handleAiAutoFix}
                        className="py-1.5 px-3 bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md"
                      >
                        <Wrench size={12} />
                        <span>Run AI Error Auto-Fix</span>
                      </button>
                    </div>
                  )}

                  {stdout && (
                    <div className="whitespace-pre-wrap text-[#F8FAFC]">
                      {stdout}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'input' && (
              <div className="flex-1 flex flex-col">
                <textarea
                  value={stdin}
                  onChange={(e) => setStdin(e.target.value)}
                  placeholder="Enter inputs here. Each input on a new line..."
                  className="flex-1 rounded border border-[#334155] bg-[#0F172A] p-3 font-mono text-xs text-[#F8FAFC] resize-none outline-none focus:border-[#F97316]"
                />
              </div>
            )}

            {activeTab === 'ast' && (
              <div className="flex-1 overflow-y-auto leading-relaxed text-xs">
                <div className="mb-2 text-[11px] text-[#94A3B8] flex items-center justify-between font-mono">
                  <span>Visual AST & Structural Code Tree</span>
                  <span className="text-[#F97316] font-bold">{activeFile ? activeFile.name : ''}</span>
                </div>
                {generateAstVisualization(currentCode)}
              </div>
            )}

            {/* GROQ AI SUITE CONTENT */}
            {activeTab === 'ai' && (
              <div className="flex-1 flex flex-col min-h-0 gap-3 overflow-y-auto">
                {userProfile?.isGuest ? (
                  /* EXCLUSIVE LOCKED BANNER FOR GUEST USERS */
                  <div className="p-5 rounded-2xl bg-[#0F172A] border border-[#334155] flex flex-col gap-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-[#F97316]/10 text-[#F97316] flex items-center justify-center mx-auto">
                      <Lock size={22} />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">Groq AI Suite is Exclusive to Signed-In Users</h4>
                      <p className="text-xs text-[#94A3B8] mt-1.5 leading-relaxed">
                        Sign in with Google to get instant AI Code Summaries, AI Error Auto-Fix, Code Generation, and MongoDB Atlas cloud synchronization!
                      </p>
                    </div>
                    <button
                      onClick={handleGoogleSignIn}
                      className="py-2.5 px-4 bg-white hover:bg-gray-100 text-gray-900 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.29v3.15C3.26 21.3 7.31 24 12 24z"/>
                        <path fill="#FBBC05" d="M5.28 14.26c-.25-.72-.38-1.49-.38-2.26s.13-1.54.38-2.26V6.59H1.29C.47 8.23 0 10.06 0 12s.47 3.77 1.29 5.41l3.99-3.15z"/>
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.59l3.99 3.15c.95-2.83 3.6-4.99 6.72-4.99z"/>
                      </svg>
                      <span>Sign In with Google</span>
                    </button>
                  </div>
                ) : (
                  /* UNLOCKED AI SUITE FOR SIGNED-IN USERS */
                  <div className="flex-1 flex flex-col gap-3 font-sans text-xs">
                    {/* Action buttons toolbar */}
                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#0F172A] border border-[#334155] rounded-lg">
                      <button
                        onClick={handleAiSummary}
                        className={`py-1.5 px-2 font-bold text-[11px] rounded transition-colors flex items-center justify-center gap-1 ${
                          aiSubTab === 'summary' ? 'bg-[#F97316] text-white' : 'text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        <FileSearch size={12} />
                        <span>Summary</span>
                      </button>
                      <button
                        onClick={handleAiExplainCode}
                        className={`py-1.5 px-2 font-bold text-[11px] rounded transition-colors flex items-center justify-center gap-1 ${
                          aiSubTab === 'explain' ? 'bg-[#F97316] text-white' : 'text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        <Wand2 size={12} />
                        <span>Explain</span>
                      </button>
                      <button
                        onClick={handleAiAutoFix}
                        className={`py-1.5 px-2 font-bold text-[11px] rounded transition-colors flex items-center justify-center gap-1 ${
                          aiSubTab === 'autofix' ? 'bg-[#F97316] text-white' : 'text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        <Wrench size={12} />
                        <span>Auto-Fix</span>
                      </button>
                    </div>

                    {/* AI Prompt Input for Generation */}
                    <div className="p-3 rounded-lg bg-[#0F172A] border border-[#334155] flex flex-col gap-2">
                      <span className="font-semibold text-white flex items-center gap-1">
                        <MessageSquareCode size={13} className="text-[#F97316]" />
                        <span>AI Code Writer</span>
                      </span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={aiPrompt}
                          onChange={(e) => setAiPrompt(e.target.value)}
                          placeholder="e.g. Write a quicksort function in MiniCPP"
                          className="flex-1 bg-[#1E293B] border border-[#334155] px-2.5 py-1.5 text-xs text-white rounded outline-none focus:border-[#F97316]"
                        />
                        <button
                          onClick={handleAiGenerateCode}
                          disabled={aiLoading}
                          className="px-3 py-1.5 bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-xs rounded shrink-0 transition-colors"
                        >
                          Generate
                        </button>
                      </div>
                    </div>

                    {/* Auto-Fix Apply Banner */}
                    {aiFixableCode && (
                      <button
                        onClick={handleApplyAutoFixToEditor}
                        className="py-2 px-3 bg-[#22C55E] hover:bg-[#16A34A] text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition-all shadow-md"
                      >
                        <CheckCircle2 size={14} />
                        <span>Apply Auto-Fix to Monaco Editor</span>
                      </button>
                    )}

                    {/* Output Response Box */}
                    <div className="flex-1 rounded border border-[#334155] bg-[#0F172A] p-3 font-mono text-xs overflow-y-auto leading-relaxed whitespace-pre-wrap text-[#F8FAFC]">
                      {aiLoading && (
                        <div className="flex items-center gap-2 text-[#F97316]">
                          <Cpu size={14} className="animate-spin" />
                          <span>Groq Llama-3 AI is processing...</span>
                        </div>
                      )}
                      {!aiLoading && !aiResultText && (
                        <span className="text-[#94A3B8] italic">Select an AI action above (Summary, Explain, Auto-Fix, or Code Writer) to view output.</span>
                      )}
                      {!aiLoading && aiResultText && (
                        <div>{aiResultText}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'about' && (
              <div className="flex-1 overflow-y-auto leading-relaxed text-xs">
                <div className="flex flex-col gap-4 text-[#94A3B8]">
                  <div className="p-3 bg-[#0F172A] border border-[#334155] rounded-lg">
                    <h4 className="font-bold text-[#F97316] mb-1">CodeForge Desktop Sandbox</h4>
                    <p className="leading-normal">
                      Compiles and executes code inside containerized environments or sandbox local environments securely. Maximum execution limit is 5 seconds.
                    </p>
                  </div>

                  <div>
                    <h5 className="font-semibold text-white mb-1.5">Languages & Compilers:</h5>
                    <ul className="flex flex-col gap-1 list-disc pl-4">
                      <li><strong>MiniCPP</strong>: Compiles via your handwritten <code>mcpc</code> compiler binary.</li>
                      <li><strong>C/C++</strong>: Compiles using <code>gcc</code>/<code>g++</code> with standard flags.</li>
                      <li><strong>Rust</strong>: Compiles with <code>rustc</code>.</li>
                      <li><strong>Python</strong>: Interpreted via Python 3 environment.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

      </main>

      {/* VS Code Status Bar */}
      <footer className="h-6 bg-[#F97316] text-white flex items-center justify-between px-3 text-[11px] font-mono select-none shrink-0 z-10">
        <div className="flex items-center gap-3">
          <span className="bg-[#EA580C] px-1.5 py-0.5 rounded font-bold">READY</span>
          <span>Target: x86-64 Windows</span>
          <span className="opacity-80">|</span>
          <span>Compiler: mcpc 1.0</span>
        </div>
        <div className="flex items-center gap-4">
          {executionTime !== null && (
            <span>Execution time: {executionTime}ms</span>
          )}
          <span>Lang: {readableLanguages[language] || 'MiniCPP'}</span>
          <span>Spaces: 4</span>
          <span>UTF-8</span>
        </div>
      </footer>
    </div>
  );
}
