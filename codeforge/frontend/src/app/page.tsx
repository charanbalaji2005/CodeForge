"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import MonacoEditor from '@monaco-editor/react';
import LandingPage from './components/landing/LandingPage';
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
  ChevronDown,
  LogOut,
  LayoutDashboard,
  Bot,
  Wand2,
  Lock,
  MessageSquareCode,
  FileSearch,
  Wrench,
  AlertTriangle,
  Send
} from 'lucide-react';
import dynamic from 'next/dynamic';
import type { Socket } from 'socket.io-client';

const XTermTerminal = dynamic(() => import('./components/terminal/XTermTerminal'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 bg-[#0F172A] border border-[#334155] rounded-lg p-4 font-mono text-xs text-[#94A3B8] flex items-center justify-center">
      <span>Initializing Interactive Terminal...</span>
    </div>
  )
});

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
  if (ext === 'ts') return 'typescript';
  if (ext === 'js') return 'javascript';
  if (ext === 'java') return 'java';
  if (ext === 'go') return 'go';
  if (ext === 'rs') return 'rust';
  if (ext === 'cs') return 'csharp';
  if (ext === 'php') return 'php';
  if (ext === 'rb') return 'ruby';
  if (ext === 'kt' || ext === 'kts') return 'kotlin';
  if (ext === 'swift') return 'swift';
  if (ext === 'sh' || ext === 'bash') return 'bash';
  if (ext === 'r') return 'r';
  if (ext === 'pl') return 'perl';
  return 'mcpp';
}

export default function Home() {
  // Navigation & Auth View State
  const [viewMode, setViewMode] = useState<'landing' | 'ide'>('landing');
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState<boolean>(false);
  const [showBottomPanel, setShowBottomPanel] = useState<boolean>(true);
  const [cookieConsent, setCookieConsent] = useState<boolean>(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Workspace Files & State
  const [files, setFiles] = useState<WorkspaceFile[]>([
    { id: 'main.mcpp', name: 'main.mcpp', language: 'mcpp', content: DEFAULT_TEMPLATES.mcpp },
    { id: 'input.txt', name: 'input.txt', language: 'plaintext', content: '' }
  ]);
  const [activeFileId, setActiveFileId] = useState<string>('main.mcpp');
  const [openTabIds, setOpenTabIds] = useState<string[]>(['main.mcpp']);
  const [language, setLanguage] = useState<string>('mcpp');
  const [stdin, setStdin] = useState<string>('');
  
  // Tabs & panels
  const [activeTab, setActiveTab] = useState<'console' | 'input' | 'ast' | 'ai' | 'about'>('console');
  const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(true);
  const [activeSidebar, setActiveSidebar] = useState<'explorer' | 'templates' | 'metrics' | 'settings'>('explorer');
  
  // Terminal Engine & Settings State
  const [terminalEngine, setTerminalEngine] = useState<'xterm' | 'standard'>('xterm');
  const [terminalCursorBlink, setTerminalCursorBlink] = useState<boolean>(true);
  const [terminalFontSize, setTerminalFontSize] = useState<number>(13);
  
  // Execution Outputs
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [stdout, setStdout] = useState<string>('');
  const [stderr, setStderr] = useState<string>('');
  const [compileTime, setCompileTime] = useState<number | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [exitCode, setExitCode] = useState<number | null>(null);

  // Socket.IO — Persistent Interactive Terminal
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Groq AI Suite State
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiResultText, setAiResultText] = useState<string>('');
  const [aiFixableCode, setAiFixableCode] = useState<string | null>(null);
  const [aiSubTab, setAiSubTab] = useState<'summary' | 'explain' | 'autofix' | 'generate'>('explain');

  // 60-Day Persistent Cookie Helper (Remembers Login for 2+ Months)
  const set60DayCookie = (profile: UserProfile | null) => {
    if (typeof document === 'undefined') return;
    if (profile) {
      const d = new Date();
      d.setTime(d.getTime() + (60 * 24 * 60 * 60 * 1000)); // 60 days
      document.cookie = `mcpc_user_session=${encodeURIComponent(JSON.stringify(profile))}; expires=${d.toUTCString()}; path=/`;
    } else {
      document.cookie = 'mcpc_user_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }
  };

  // Log Out / Sign Out Handler
  const handleLogOut = () => {
    setUserProfile(null);
    localStorage.removeItem('mcpc_user_profile');
    set60DayCookie(null);
    setShowProfileDropdown(false);
    setViewMode('landing');
  };

  // Load memorized workspace & user state from localStorage and Cookies
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('mcpc_user_profile');
      const savedFiles = localStorage.getItem('mcpc_workspace_files');
      const savedActiveId = localStorage.getItem('mcpc_active_file_id');
      const savedOpenTabs = localStorage.getItem('mcpc_open_tabs');
      const savedStdin = localStorage.getItem('mcpc_stdin');
      const savedViewMode = localStorage.getItem('mcpc_view_mode');
      const savedConsent = localStorage.getItem('mcpc_cookie_consent');

      if (!savedConsent) {
        setCookieConsent(false);
      }

      if (savedUser) {
        setUserProfile(JSON.parse(savedUser));
      }

      // Check Desktop App environment - Bypass landing page in Desktop App
      const isDesktopApp = typeof window !== 'undefined' && (
        window.location.search.includes('desktop=true') ||
        !!(window as any).electronAPI ||
        navigator.userAgent.includes('Electron')
      );

      if (isDesktopApp) {
        setViewMode('ide');
        if (!savedUser) {
          setUserProfile({
            name: 'Desktop Developer',
            email: 'desktop@local.dev',
            isGuest: true
          });
        }
      } else if (savedViewMode === 'ide') {
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

  // Save workspace & user state to localStorage and Desktop Disk
  useEffect(() => {
    try {
      localStorage.setItem('mcpc_workspace_files', JSON.stringify(files));
      localStorage.setItem('mcpc_active_file_id', activeFileId);
      localStorage.setItem('mcpc_open_tabs', JSON.stringify(openTabIds));
      localStorage.setItem('mcpc_stdin', stdin);
      localStorage.setItem('mcpc_view_mode', viewMode);
      if (userProfile) {
        localStorage.setItem('mcpc_user_profile', JSON.stringify(userProfile));
        set60DayCookie(userProfile);
      }

      // Desktop App: Automatically Sync every file keystroke to Desktop Disk (Documents/CodeForge-projects)
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        files.forEach(f => {
          (window as any).electronAPI.writeFile({ filePath: f.name, content: f.content });
        });
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
    // Check if Google Identity Services SDK is loaded
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      try {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: "644632951361-lrjmck8mkvqt8ekiveju75pletd8b9g8.apps.googleusercontent.com",
          scope: "openid email profile",
          callback: async (tokenResponse: any) => {
            if (tokenResponse && tokenResponse.access_token) {
              try {
                // Fetch user info from Google's userinfo API
                const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                });
                const userInfo = await userInfoRes.json();
                
                if (userInfo && userInfo.email) {
                  // Register/login in our backend database
                  const res = await fetch(`${BACKEND_URL}/api/auth/google`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      googleId: userInfo.sub,
                      email: userInfo.email,
                      name: userInfo.name,
                      avatar: userInfo.picture
                    })
                  });
                  const data = await res.json();
                  if (data.success && data.user) {
                    const profile: UserProfile = {
                      name: data.user.name || userInfo.name || 'Google User',
                      email: data.user.email || userInfo.email,
                      avatar: data.user.avatar || userInfo.picture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
                      isGuest: false
                    };
                    setUserProfile(profile);
                    setShowAuthModal(false);
                    setViewMode('ide');
                  }
                }
              } catch (fetchErr) {
                console.error('Error fetching Google user profile:', fetchErr);
              }
            }
          }
        });
        client.requestAccessToken();
        return;
      } catch (clientErr) {
        console.error('Failed to initialize Google token client:', clientErr);
      }
    }

    // Fallback if SDK fails to load or error occurs - display a nice error instead of prompt
    alert('Google Identity Services SDK is not loaded. Please ensure you are online and reload the page.');
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

  // Download Desktop Installer (.exe / .msi) for x86/x64 Windows Laptops
  const handleDownloadDesktopApp = () => {
    // Triggers direct browser download of installer from GitHub Releases when on Vercel/cloud,
    // and falls back to local backend when testing locally.
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      window.location.href = 'https://github.com/charanbalaji2005/CodeForge/releases/download/v1.0.0/CodeForge_Desktop_Compiler_Setup_1.0.0.exe';
    } else {
      window.location.href = `${BACKEND_URL}/download`;
    }
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

  const [consoleInputLine, setConsoleInputLine] = useState<string>('');

  // Initialize Socket.IO connection once on mount
  useEffect(() => {
    let sock: Socket;
    const initSocket = async () => {
      const { io } = await import('socket.io-client');
      sock = io(BACKEND_URL, { transports: ['websocket', 'polling'] });
      sock.on('connect', () => console.log('[Socket.IO] Connected:', sock.id));
      sock.on('disconnect', () => console.log('[Socket.IO] Disconnected'));
      socketRef.current = sock;
      setSocket(sock);
    };
    initSocket();
    return () => {
      sock?.disconnect();
    };
  }, []);

  const handleRun = useCallback(async (overrideStdin?: string | React.MouseEvent | any) => {
    setIsRunning(true);
    setStdout('');
    setStderr('');
    setCompileTime(null);
    setExecutionTime(null);
    setExitCode(null);
    setActiveTab('console');

    // ── XTerm Mode: use Socket.IO — emit "compile" and keep process alive ──
    if (terminalEngine === 'xterm' && socketRef.current?.connected) {
      socketRef.current.emit('compile', { language, code: currentCode });
      // isRunning will be set to false via terminal-exit event (see XTermTerminal onExited)
      return;
    }

    // ── Standard Console Mode: HTTP batch run ──
    const inputToUse = typeof overrideStdin === 'string' ? overrideStdin : stdin;
    try {
      const res = await fetch(`${BACKEND_URL}/api/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          code: currentCode,
          stdin: typeof inputToUse === 'string' ? inputToUse : ''
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
  }, [language, currentCode, stdin, terminalEngine]);

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
      <LandingPage
        onStartCoding={handleSkipAuth}
        onGoogleSignIn={handleGoogleSignIn}
        onDownloadDesktop={handleDownloadDesktopApp}
      />
    );
  }

  // ----------------------------------------------------
  // RENDER: FULL IDE COMPILER WORKSPACE VIEW
  // ----------------------------------------------------
  return (
    <div className="flex flex-col h-screen bg-[#1E1E1E] text-[#D4D4D4] overflow-hidden font-sans select-none">
      
      {/* Top Header with Uploaded Anvil Logo */}
      <header className="h-12 bg-[#181818] border-b border-[#3C3C3C] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          {/* Logo Brand */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setViewMode('landing')}>
            <img src="/logo.png" alt="CodeForge Logo" className="h-8 w-auto object-contain" />
            <span className="font-extrabold text-white text-sm">CodeForge <span className="text-[#007ACC]">Desktop</span></span>
          </div>
          <span className="text-[10px] bg-[#252526] border border-[#3C3C3C] px-2 py-0.5 rounded text-[#CCCCCC] font-mono">
            v1.0 Edition
          </span>
          <div className="h-4 w-[1px] bg-[#3C3C3C] mx-1"></div>
          {/* Active File Tab representation */}
          <div className="flex items-center gap-1.5 text-xs text-[#D4D4D4]">
            <FileCode size={13} className="text-[#007ACC]" />
            <span className="font-mono font-semibold">{activeFile ? activeFile.name : 'main.mcpp'}</span>
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
            className="text-xs px-2.5 py-1 bg-[#252526] border border-[#3C3C3C] text-[#D4D4D4] hover:bg-[#3C3C3C] cursor-pointer focus:outline-none focus:border-[#007ACC] rounded-md transition-colors font-mono"
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

          <div className="h-4 w-[1px] bg-[#3C3C3C] mx-1"></div>

          {/* Action buttons */}
          <button
            onClick={handleAddNewFile}
            title="Create New File"
            className="p-1.5 rounded-md hover:bg-[#2A2D2E] text-[#CCCCCC] hover:text-white transition-colors flex items-center gap-1 text-xs"
          >
            <Plus size={14} className="text-[#007ACC]" />
            <span>New File</span>
          </button>

          <button
            onClick={handleResetCode}
            title="Reset code template"
            className="p-1.5 rounded-md hover:bg-[#2A2D2E] text-[#CCCCCC] hover:text-white transition-colors"
          >
            <RefreshCw size={13} />
          </button>

          <button
            onClick={handleDownload}
            title="Download source"
            className="p-1.5 rounded-md hover:bg-[#2A2D2E] text-[#CCCCCC] hover:text-white transition-colors"
          >
            <Download size={13} />
          </button>

          <button
            onClick={handleShare}
            title="Share snippet"
            className="p-1.5 rounded-md hover:bg-[#2A2D2E] text-[#CCCCCC] hover:text-white transition-colors"
          >
            <Share2 size={13} />
          </button>

          <div className="h-4 w-[1px] bg-[#3C3C3C] mx-1"></div>

          {/* Run and Compile Flat buttons */}
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3.5 py-1 bg-[#22C55E] hover:bg-[#22C55E]/90 disabled:opacity-50 text-white font-bold rounded-md transition-all text-xs shadow-md"
          >
            {isRunning ? (
              <Cpu size={12} className="animate-spin text-white" />
            ) : (
              <Play size={12} fill="currentColor" />
            )}
            Run Code
          </button>

          <div className="h-4 w-[1px] bg-[#3C3C3C] mx-1"></div>

          {/* User Profile / Expandable Profile Dropdown Card */}
          <div className="relative">
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              title="User Profile & Settings"
              className="flex items-center gap-2 px-3 py-1 bg-[#252526] hover:bg-[#2A2D2E] border border-[#3C3C3C] rounded-md text-xs text-[#CCCCCC] hover:text-white transition-colors shadow-sm"
            >
              {userProfile?.avatar ? (
                <img src={userProfile.avatar} alt="Avatar" className="w-4 h-4 rounded-full border border-[#0070F3]" />
              ) : (
                <User size={12} className={userProfile?.isGuest ? 'text-[#CCCCCC]' : 'text-[#007ACC]'} />
              )}
              <span className="max-w-[120px] truncate font-semibold">{userProfile ? userProfile.name : 'Guest Developer'}</span>
              <ChevronDown size={12} className={`transition-transform duration-200 ${showProfileDropdown ? 'rotate-180 text-[#007ACC]' : 'text-[#CCCCCC]'}`} />
            </button>

            {/* EXPANDABLE PROFILE DROPDOWN CARD */}
            {showProfileDropdown && (
              <div className="absolute right-0 top-10 w-80 bg-[#252526] border border-[#3C3C3C] rounded-xl shadow-2xl z-50 p-4 flex flex-col gap-3 text-xs text-[#D4D4D4] animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Header User Details */}
                <div className="flex items-center gap-3 pb-3 border-b border-[#3C3C3C]">
                  {userProfile?.avatar ? (
                    <img src={userProfile.avatar} alt="Profile" className="w-10 h-10 rounded-full border-2 border-[#0070F3] object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#1E1E1E] border border-[#007ACC] text-[#007ACC] flex items-center justify-center font-bold text-sm">
                      {userProfile ? userProfile.name.charAt(0).toUpperCase() : 'G'}
                    </div>
                  )}
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-bold text-sm text-white truncate">{userProfile ? userProfile.name : 'Guest Developer'}</span>
                    <span className="text-[11px] text-[#A1A1AA] truncate">{userProfile ? userProfile.email : 'guest@local.dev'}</span>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${userProfile?.isGuest ? 'bg-[#37373D] text-[#CCCCCC]' : 'bg-[#007ACC]/20 text-[#007ACC] border border-[#007ACC]/40'}`}>
                        {userProfile?.isGuest ? '👤 Guest Account' : '🌟 PRO Google Member'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Account Features & Status */}
                <div className="flex flex-col gap-1.5 py-1">
                  <div className="flex items-center justify-between text-[11px] text-[#CCCCCC]">
                    <span>Groq AI Suite:</span>
                    <span className={userProfile?.isGuest ? 'text-[#007ACC] font-semibold' : 'text-emerald-400 font-bold'}>
                      {userProfile?.isGuest ? 'Locked (Requires Sign In)' : '⚡ Active'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#CCCCCC]">
                    <span>MongoDB Atlas Cloud Sync:</span>
                    <span className="text-emerald-400 font-semibold">Connected</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#CCCCCC]">
                    <span>Active Workspace Language:</span>
                    <span className="text-[#007ACC] font-bold uppercase">{language}</span>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[#334155]">
                  <button
                    onClick={() => {
                      setShowProfileDropdown(false);
                      handleGoogleSignIn();
                    }}
                    className="w-full py-2 px-3 bg-white hover:bg-gray-100 text-gray-900 font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-md"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.29v3.15C3.26 21.3 7.31 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.28 14.26c-.25-.72-.38-1.49-.38-2.26s.13-1.54.38-2.26V6.59H1.29C.47 8.23 0 10.06 0 12s.47 3.77 1.29 5.41l3.99-3.15z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.59l3.99 3.15c.95-2.83 3.6-4.99 6.72-4.99z"/>
                    </svg>
                    <span>{userProfile?.isGuest ? 'Sign In with Google' : 'Switch Google Account'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowProfileDropdown(false);
                      handleDownloadDesktopApp();
                    }}
                    className="w-full py-2 px-3 bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition-all"
                  >
                    <Laptop size={14} className="text-[#0EA5E9]" />
                    <span>Download Desktop App (.exe)</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowProfileDropdown(false);
                      setViewMode('landing');
                    }}
                    className="w-full py-1.5 px-3 bg-transparent hover:bg-[#1E293B] text-[#94A3B8] hover:text-white rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <ArrowRight size={13} />
                    <span>Go to Main Landing Page</span>
                  </button>

                  <button
                    onClick={handleLogOut}
                    className="w-full py-1.5 px-3 bg-[#EF4444]/10 hover:bg-[#EF4444]/20 border border-[#EF4444]/30 text-[#EF4444] font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors mt-1"
                  >
                    <LogOut size={13} />
                    <span>Log Out / Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace split */}
      <main className="flex-1 flex min-h-0 overflow-hidden flex-col md:flex-row">
        
        {/* Left Collapsed Sidebar Icons */}
        <section className="w-12 bg-[#181818] border-r border-[#3C3C3C] flex flex-col items-center py-2 gap-2 shrink-0">
          <button
            onClick={() => handleSidebarClick('explorer')}
            title="Explorer"
            className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
              activeSidebar === 'explorer' && sidebarExpanded
                ? 'bg-[#37373D] text-[#007ACC]'
                : 'text-[#858585] hover:text-white'
            }`}
          >
            <Folder size={18} />
          </button>
          <button
            onClick={() => handleSidebarClick('templates')}
            title="Templates"
            className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
              activeSidebar === 'templates' && sidebarExpanded
                ? 'bg-[#37373D] text-[#007ACC]'
                : 'text-[#858585] hover:text-white'
            }`}
          >
            <Code size={18} />
          </button>
          <button
            onClick={() => handleSidebarClick('metrics')}
            title="Telemetry"
            className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
              activeSidebar === 'metrics' && sidebarExpanded
                ? 'bg-[#37373D] text-[#007ACC]'
                : 'text-[#858585] hover:text-white'
            }`}
          >
            <Activity size={18} />
          </button>
          <button
            onClick={() => handleSidebarClick('settings')}
            title="Settings"
            className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
              activeSidebar === 'settings' && sidebarExpanded
                ? 'bg-[#37373D] text-[#007ACC]'
                : 'text-[#858585] hover:text-white'
            }`}
          >
            <Settings size={18} />
          </button>
        </section>

        {/* Collapsible Panel Contents */}
        {sidebarExpanded && (
          <section className="w-56 bg-[#252526] border-r border-[#3C3C3C] flex flex-col shrink-0 overflow-y-auto">
            {activeSidebar === 'explorer' && (
              <div className="flex flex-col">
                {/* EXPLORER Header with + Icon to Add Files */}
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#CCCCCC] border-b border-[#3C3C3C] flex items-center justify-between">
                  <span>Explorer</span>
                  <button 
                    onClick={handleAddNewFile} 
                    title="Create New File (+)"
                    className="p-1 text-[#D4D4D4] hover:bg-[#1E1E1E] rounded transition-colors"
                  >
                    <Plus size={14} className="text-[#007ACC]" />
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
                            ? 'bg-[#37373D] text-white font-semibold border-l-2 border-l-[#007ACC]' 
                            : 'text-[#CCCCCC] hover:bg-[#2A2D2E] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {file.name.endsWith('.mcpp') ? (
                            <FileCode size={13} className="text-[#007ACC] shrink-0" />
                          ) : (
                            <FileText size={13} className="shrink-0 text-[#CCCCCC]" />
                          )}
                          <span className="truncate">{file.name}</span>
                        </div>

                        {file.isCustom && (
                          <button
                            onClick={(e) => handleDeleteFile(file.id, e)}
                            title="Delete File"
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-[#CCCCCC] hover:text-[#EF4444] transition-opacity"
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
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#CCCCCC] border-b border-[#3C3C3C]">
                  Telemetry
                </div>
                <div className="flex flex-col p-3 gap-3 font-mono text-[11px]">
                  <div className="flex flex-col gap-1 border-b border-[#3C3C3C] pb-2">
                    <span className="text-[#CCCCCC]">Exit Code</span>
                    <strong className={exitCode === null ? 'text-[#CCCCCC]' : exitCode === 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}>
                      {exitCode === null ? 'No execution' : exitCode}
                    </strong>
                  </div>
                  <div className="flex flex-col gap-1 border-b border-[#3C3C3C] pb-2">
                    <span className="text-[#CCCCCC]">Compilation</span>
                    <span className="text-[#D4D4D4]">
                      {compileTime !== null ? `${compileTime} ms` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 border-b border-[#3C3C3C] pb-2">
                    <span className="text-[#CCCCCC]">Execution</span>
                    <span className="text-[#D4D4D4]">
                      {executionTime !== null ? `${executionTime} ms` : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {activeSidebar === 'templates' && (
              <div className="flex flex-col">
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#CCCCCC] border-b border-[#3C3C3C]">
                  Presets
                </div>
                <div className="flex flex-col p-2 gap-1.5 text-xs">
                  <button className="p-2 text-left bg-[#1E1E1E] border border-[#3C3C3C] hover:bg-[#37373D] transition-colors rounded text-[#D4D4D4]" onClick={() => { setLanguage('mcpp'); handleResetCode(); }}>
                    <div className="font-bold text-[#007ACC]">MiniCPP Template</div>
                    <div className="text-[10px] text-[#CCCCCC]">mcpc handwritten compiler</div>
                  </button>
                  <button className="p-2 text-left bg-[#252526] border border-[#3C3C3C] hover:bg-[#2A2D2E] transition-colors rounded text-[#CCCCCC] hover:text-white" onClick={() => { setLanguage('cpp'); handleResetCode(); }}>
                    <div className="font-bold">C++ Standard</div>
                    <div className="text-[10px] text-[#CCCCCC]">g++ compiler suite</div>
                  </button>
                  <button className="p-2 text-left bg-[#252526] border border-[#3C3C3C] hover:bg-[#2A2D2E] transition-colors rounded text-[#CCCCCC] hover:text-white" onClick={() => { setLanguage('python'); handleResetCode(); }}>
                    <div className="font-bold">Python script</div>
                    <div className="text-[10px] text-[#CCCCCC]">python3 interpreter</div>
                  </button>
                </div>
              </div>
            )}

            {activeSidebar === 'settings' && (
              <div className="flex flex-col">
                <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#CCCCCC] border-b border-[#3C3C3C]">
                  Settings & Terminal Options
                </div>
                <div className="p-3 text-xs text-[#D4D4D4] flex flex-col gap-3 leading-relaxed">
                  <div>
                    <span className="text-[#CCCCCC] font-semibold">Terminal Engine:</span>
                    <select
                      value={terminalEngine}
                      onChange={(e) => setTerminalEngine(e.target.value as any)}
                      className="w-full mt-1 bg-[#252526] border border-[#3C3C3C] p-1.5 rounded text-white text-xs font-mono outline-none focus:border-[#007ACC]"
                    >
                      <option value="xterm">⚡ XTerm.js Interactive Terminal</option>
                      <option value="standard">Standard Console Output</option>
                    </select>
                  </div>
                  <div>
                    <span className="text-[#CCCCCC] font-semibold">Terminal Cursor Blink:</span>
                    <button
                      onClick={() => setTerminalCursorBlink(!terminalCursorBlink)}
                      className={`w-full mt-1 py-1.5 px-2 rounded border font-bold text-xs transition-colors ${
                        terminalCursorBlink ? 'bg-[#007ACC]/20 border-[#007ACC] text-[#007ACC]' : 'bg-[#252526] border-[#3C3C3C] text-[#CCCCCC]'
                      }`}
                    >
                      {terminalCursorBlink ? '⚡ Cursor Blink: ON' : 'OFF'}
                    </button>
                  </div>
                  <div>
                    <span className="text-[#CCCCCC] font-semibold">Terminal Font Size:</span>
                    <div className="flex gap-1.5 mt-1">
                      {[12, 13, 14, 16].map(sz => (
                        <button
                          key={sz}
                          onClick={() => setTerminalFontSize(sz)}
                          className={`flex-1 py-1 rounded border text-xs font-mono font-bold transition-all ${
                            terminalFontSize === sz ? 'bg-[#007ACC] text-white border-[#007ACC]' : 'bg-[#252526] border-[#3C3C3C] text-[#CCCCCC]'
                          }`}
                        >
                          {sz}px
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[#3C3C3C]">
                    <span className="text-[#CCCCCC]">Editor Font:</span>
                    <div className="font-mono bg-[#252526] border border-[#3C3C3C] p-1 mt-1 rounded text-center">JetBrains Mono</div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Center: Editor area with File Tabs Header */}
        <section className="flex-1 flex flex-col min-w-0 bg-[#1E1E1E]">
          {/* File Tabs Navigation Bar */}
          <div className="flex items-center bg-[#252526] border-b border-[#3C3C3C] overflow-x-auto shrink-0 font-mono text-xs">
            {openTabIds.map(tabId => {
              const file = files.find(f => f.id === tabId);
              if (!file) return null;
              const isActive = tabId === activeFileId;
              return (
                <div
                  key={tabId}
                  onClick={() => setActiveFileId(tabId)}
                  className={`flex items-center gap-2 px-3.5 py-2 border-r border-[#3C3C3C] cursor-pointer transition-colors shrink-0 ${
                    isActive 
                      ? 'bg-[#1E1E1E] text-white font-semibold border-t-2 border-t-[#007ACC]' 
                      : 'bg-[#2D2D2D] text-[#CCCCCC] hover:bg-[#2A2D2E] hover:text-white'
                  }`}
                >
                  <FileCode size={12} className={isActive ? 'text-[#007ACC]' : 'text-[#CCCCCC]'} />
                  <span>{file.name}</span>
                  {openTabIds.length > 1 && (
                    <button 
                      onClick={(e) => handleCloseTab(tabId, e)}
                      className="p-0.5 rounded hover:bg-[#2A2D2E] text-[#CCCCCC] hover:text-white"
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

          {/* Bottom Console / Output Panel (Console, AST Viewer, AI Suite) */}
          {showBottomPanel && (
            <div className="h-[280px] shrink-0 bg-[#252526] border-t border-[#3C3C3C] flex flex-col min-h-[150px]">
              {/* Panel header tabs & controls */}
              <div className="flex items-center justify-between border-b border-[#3C3C3C] bg-[#181818] shrink-0">
                <div className="flex gap-0.5 overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('console')}
                    className={`px-3.5 py-2 text-xs font-semibold border-r border-[#3C3C3C] transition-colors shrink-0 ${
                      activeTab === 'console'
                        ? 'bg-[#252526] text-white border-t border-t-[#007ACC]'
                        : 'text-[#CCCCCC] hover:text-white hover:bg-[#2A2D2E]'
                    }`}
                  >
                    Console (Interactive Terminal)
                  </button>
                  <button
                    onClick={() => setActiveTab('ast')}
                    className={`px-3.5 py-2 text-xs font-semibold border-r border-[#3C3C3C] transition-colors shrink-0 ${
                      activeTab === 'ast'
                        ? 'bg-[#252526] text-white border-t border-t-[#007ACC]'
                        : 'text-[#CCCCCC] hover:text-white hover:bg-[#2A2D2E]'
                    }`}
                  >
                    AST Viewer
                  </button>
                  <button
                    onClick={() => setActiveTab('ai')}
                    className={`px-3.5 py-2 text-xs font-semibold border-r border-[#3C3C3C] transition-colors flex items-center gap-1.5 shrink-0 ${
                      activeTab === 'ai'
                        ? 'bg-[#252526] text-[#007ACC] font-semibold border-t border-t-[#007ACC]'
                        : 'text-[#CCCCCC] hover:text-[#007ACC] hover:bg-[#2A2D2E]'
                    }`}
                  >
                    <Bot size={13} className="text-[#007ACC]" />
                    <span>AI Suite</span>
                  </button>
                </div>

                <div className="flex items-center gap-3 pr-3">
                  {/* TERMINAL ENGINE SELECT DROPDOWN IN TOOLBAR */}
                  {activeTab === 'console' && (
                    <div className="flex items-center gap-1.5 text-xs text-[#CCCCCC]">
                      <span className="font-semibold text-[10px] uppercase">Engine:</span>
                      <select
                        value={terminalEngine}
                        onChange={(e) => setTerminalEngine(e.target.value as any)}
                        className="bg-[#252526] border border-[#3C3C3C] px-2 py-0.5 rounded text-white text-[11px] font-mono outline-none focus:border-[#007ACC] cursor-pointer"
                      >
                        <option value="xterm">Interactive (XTerm)</option>
                        <option value="standard">Standard Batch</option>
                      </select>
                    </div>
                  )}

                  {/* Clear button */}
                  <button
                    onClick={() => {
                      setStdin('');
                      setStdout('');
                      setStderr('');
                      if (activeTab === 'console') {
                        // Clear XTerm using exposed DOM helper
                        const termDiv = document.getElementsByClassName('xterm')[0]?.parentElement;
                        if (termDiv && (termDiv as any).__clearTerminal) {
                          (termDiv as any).__clearTerminal();
                        }
                      }
                    }}
                    title="Clear Terminal / Output"
                    className="p-1 rounded hover:bg-[#2A2D2E] text-[#CCCCCC] hover:text-white transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>

                  {/* Settings gear shortcut */}
                  <button
                    onClick={() => {
                      setActiveSidebar('settings');
                      setSidebarExpanded(true);
                    }}
                    title="Terminal Settings"
                    className="p-1 rounded hover:bg-[#2A2D2E] text-[#CCCCCC] hover:text-white transition-colors"
                  >
                    <Settings2 size={13} />
                  </button>

                  {/* Collapse chevron */}
                  <button
                    onClick={() => setShowBottomPanel(false)}
                    title="Collapse Console Panel"
                    className="p-1 rounded hover:bg-[#2A2D2E] text-[#CCCCCC] hover:text-white transition-colors"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
              </div>

              {/* Panel content area */}
              <div className="flex-1 min-h-0 flex flex-col p-3">
                {activeTab === 'console' && (
                  <div className="flex-1 flex flex-col min-h-0">
                    {terminalEngine === 'xterm' ? (
                      <div className="flex-1 flex flex-col min-h-0 gap-2">
                        <XTermTerminal
                          socket={socket}
                          isRunning={isRunning}
                          onExited={() => setIsRunning(false)}
                          cursorBlink={terminalCursorBlink}
                          fontSize={terminalFontSize}
                        />
                        {/* Kill Process button */}
                        {isRunning && (
                          <button
                            onClick={() => {
                              socket?.emit('terminal-kill');
                              setIsRunning(false);
                            }}
                            className="shrink-0 py-1 px-3 bg-red-700 hover:bg-red-600 text-white text-xs font-bold rounded flex items-center gap-1.5 transition-all w-fit"
                          >
                            <X size={11} />
                            <span>Kill Process</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 rounded border border-[#334155] bg-[#0F172A] p-3 font-mono text-xs overflow-y-auto leading-relaxed flex flex-col gap-2">
                          {isRunning && (
                            <div className="text-[#F8FAFC] flex items-center gap-2">
                              <Cpu size={12} className="animate-spin text-[#F97316]" />
                              <span>Compiling and executing code...</span>
                            </div>
                          )}

                          {!isRunning && !stdout && !stderr && (
                            <div className="text-[#94A3B8] italic">Click "Run Code" to view program output. You can type on-the-spot inputs directly in the prompt line below!</div>
                          )}

                          {stderr && (
                            <div className="flex flex-col gap-2">
                              <div className="text-[#EF4444] whitespace-pre-wrap font-bold bg-[#EF4444]/10 border border-[#EF4444]/20 p-3 rounded-lg">
                                {stderr}
                              </div>
                              {/* Quick Auto-Fix Trigger */}
                              <button
                                onClick={handleAiAutoFix}
                                className="py-1.5 px-3 bg-[#F97316] hover:bg-[#EA580C] text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md w-fit"
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

                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (!consoleInputLine) return;
                            const nextInput = stdin ? `${stdin}\n${consoleInputLine}` : consoleInputLine;
                            setStdin(nextInput);
                            setConsoleInputLine('');
                            handleRun(nextInput);
                          }}
                          className="mt-2 flex items-center gap-2 bg-[#0F172A] border border-[#334155] focus-within:border-[#F97316] rounded-lg p-1.5 shrink-0"
                        >
                          <span className="text-[#F97316] font-mono font-bold text-xs pl-2">&gt;</span>
                          <input
                            type="text"
                            value={consoleInputLine}
                            onChange={(e) => setConsoleInputLine(e.target.value)}
                            placeholder="Type user input on the spot (e.g. Charan, 85, 90) & press Enter..."
                            className="flex-1 bg-transparent text-xs font-mono text-white outline-none placeholder-[#64748B]"
                          />
                          <button
                            type="submit"
                            disabled={isRunning}
                            className="py-1 px-3 bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-50 text-white text-xs font-bold rounded flex items-center gap-1 transition-all"
                          >
                            <Send size={11} />
                            <span>Send Input</span>
                          </button>
                          {stdin && (
                            <button
                              type="button"
                              onClick={() => {
                                setStdin('');
                                setConsoleInputLine('');
                                handleRun('');
                              }}
                              title="Clear Inputs"
                              className="py-1 px-2.5 bg-[#334155] hover:bg-[#475569] text-white text-xs rounded transition-all"
                            >
                              Clear Inputs
                            </button>
                          )}
                        </form>
                      </div>
                    )}
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

                {activeTab === 'ai' && (
                  <div className="flex-1 flex flex-col min-h-0 gap-3 overflow-y-auto">
                    {userProfile?.isGuest ? (
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
                          className="py-2.5 px-4 bg-white hover:bg-gray-100 text-gray-900 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md mx-auto"
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
                      <div className="flex-1 flex flex-col gap-3 font-sans text-xs">
                        <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#1E1E1E] border border-[#3C3C3C] rounded-lg">
                          <button
                            onClick={handleAiSummary}
                            className={`py-1.5 px-2 font-semibold text-[11px] rounded transition-colors flex items-center justify-center gap-1 ${
                              aiSubTab === 'summary' ? 'bg-[#007ACC] text-white' : 'text-[#CCCCCC] hover:text-white hover:bg-[#2A2D2E]'
                            }`}
                          >
                            <FileSearch size={12} />
                            <span>Summary</span>
                          </button>
                          <button
                            onClick={handleAiExplainCode}
                            className={`py-1.5 px-2 font-semibold text-[11px] rounded transition-colors flex items-center justify-center gap-1 ${
                              aiSubTab === 'explain' ? 'bg-[#007ACC] text-white' : 'text-[#CCCCCC] hover:text-white hover:bg-[#2A2D2E]'
                            }`}
                          >
                            <Wand2 size={12} />
                            <span>Explain</span>
                          </button>
                          <button
                            onClick={handleAiAutoFix}
                            className={`py-1.5 px-2 font-semibold text-[11px] rounded transition-colors flex items-center justify-center gap-1 ${
                              aiSubTab === 'autofix' ? 'bg-[#007ACC] text-white' : 'text-[#CCCCCC] hover:text-white hover:bg-[#2A2D2E]'
                            }`}
                          >
                            <Wrench size={12} />
                            <span>Auto-Fix</span>
                          </button>
                        </div>

                        <div className="p-3 rounded-lg bg-[#1E1E1E] border border-[#3C3C3C] flex flex-col gap-2">
                          <span className="font-semibold text-white flex items-center gap-1">
                            <MessageSquareCode size={13} className="text-[#007ACC]" />
                            <span>AI Code Writer</span>
                          </span>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={aiPrompt}
                              onChange={(e) => setAiPrompt(e.target.value)}
                              placeholder="e.g. Write a quicksort function in MiniCPP"
                              className="flex-1 bg-[#252526] border border-[#3C3C3C] px-2.5 py-1.5 text-xs text-[#D4D4D4] rounded outline-none focus:border-[#007ACC]"
                            />
                            <button
                              onClick={handleAiGenerateCode}
                              disabled={aiLoading}
                              className="px-3 py-1.5 bg-[#007ACC] hover:bg-[#007ACC]/90 text-white font-bold text-xs rounded shrink-0 transition-colors"
                            >
                              Generate
                            </button>
                          </div>
                        </div>

                        {aiFixableCode && (
                          <button
                            onClick={handleApplyAutoFixToEditor}
                            className="py-2 px-3 bg-[#22C55E] hover:bg-[#22C55E]/90 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition-all shadow-md w-full"
                          >
                            <CheckCircle2 size={14} />
                            <span>Apply Auto-Fix to Monaco Editor</span>
                          </button>
                        )}

                        <div className="flex-1 rounded border border-[#3C3C3C] bg-[#1E1E1E] p-3 font-mono text-xs overflow-y-auto leading-relaxed whitespace-pre-wrap text-[#D4D4D4]">
                          {aiLoading && (
                            <div className="flex items-center gap-2 text-[#007ACC]">
                              <Cpu size={14} className="animate-spin" />
                              <span>Groq Llama-3 AI is processing...</span>
                            </div>
                          )}
                          {!aiLoading && !aiResultText && (
                            <span className="text-[#CCCCCC] italic">Select an AI action above to view output.</span>
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
                    <div className="flex flex-col gap-4 text-[#CCCCCC]">
                      <div className="p-3 bg-[#1E1E1E] border border-[#3C3C3C] rounded-lg">
                        <h4 className="font-bold text-[#007ACC] mb-1">CodeForge Desktop Sandbox</h4>
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
            </div>
          )}
        </section>


      </main>

      {/* Sleek Website Cookie & Session Storage Consent Banner */}
      {!cookieConsent && (
        <div className="fixed bottom-8 right-4 max-w-sm bg-[#252526] border border-[#007ACC] rounded-2xl shadow-2xl p-4 z-50 flex flex-col gap-2.5 text-xs text-white animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[#007ACC] font-bold">
              <Sparkles size={15} />
              <span>Cookies & Session Memory (60+ Days)</span>
            </div>
            <button onClick={() => setCookieConsent(true)} className="text-[#CCCCCC] hover:text-white p-0.5">
              <X size={14} />
            </button>
          </div>
          <p className="text-[11px] text-[#CCCCCC] leading-relaxed">
            We use local storage & session cookies to remember your code files, custom tabs, profile settings, and Groq AI preferences permanently across visits for 60+ days.
          </p>
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => {
                localStorage.setItem('mcpc_cookie_consent', 'true');
                setCookieConsent(true);
              }}
              className="w-full py-2 px-3 bg-[#007ACC] hover:bg-[#007ACC]/90 text-white font-bold rounded-xl text-xs shadow-lg transition-all text-center"
            >
              Accept Cookies & Sessions
            </button>
          </div>
        </div>
      )}

      {/* VS Code Status Bar */}
      <footer className="h-6 bg-[#007ACC] text-white flex items-center justify-between px-3 text-[11px] font-mono select-none shrink-0 z-10">
        <div className="flex items-center gap-3">
          <span className="bg-[#005A9E] px-1.5 py-0.5 rounded font-bold text-white shrink-0">READY</span>
          <button
            onClick={() => setShowBottomPanel(prev => !prev)}
            className="flex items-center gap-1 bg-[#005A9E] hover:brightness-110 px-2 py-0.5 rounded font-bold text-white transition-all cursor-pointer shrink-0"
          >
            <TerminalIcon size={11} />
            <span>{showBottomPanel ? 'Hide Console' : 'Show Console'}</span>
          </button>
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
