"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Play, 
  Terminal, 
  Cpu, 
  Users, 
  Share2, 
  Laptop, 
  Activity, 
  Bot, 
  Lock, 
  ArrowRight, 
  Check, 
  Code, 
  Shield, 
  Zap, 
  Globe, 
  HelpCircle,
  Star,
  BookOpen,
  FileCode,
  FileText,
  Trash2,
  Folder,
  Settings,
  ChevronRight,
  MessageSquare,
  X
} from "lucide-react";
import { Button } from "../ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../ui/card";
import { Badge } from "../ui/badge";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "../ui/accordion";

// Interactive Mockup Code Templates
const MOCK_CODES = {
  mcpp: `// MiniCPP (mcpc) compiler execution
struct Point {
    int x;
    int y;
};

int main() {
    Point p;
    p.x = 10;
    p.y = 20;
    print_str("CodeForge compiler active\\n");
    print_int(p.x + p.y);
    return 0;
}`,
  python: `# AI-Native Python workspace
def quick_sort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quick_sort(left) + middle + quick_sort(right)

print(quick_sort([3, 6, 8, 10, 1, 2, 1]))`,
  js: `// High performance Node.js sandbox
const server = require('http').createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'online',
    engine: 'CodeForge-V8',
    latency: '1.2ms'
  }));
});

server.listen(3000);`
};

// Custom animated counter component
const AnimatedCounter = ({ value, duration = 1500 }: { value: string; duration?: number }) => {
  const numericValue = parseInt(value.replace(/[^0-9]/g, ''));
  const suffix = value.replace(/[0-9]/g, '');
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = numericValue;
    if (start === end) return;

    let totalMiliseconds = duration;
    let incrementTime = Math.max(Math.floor(totalMiliseconds / 50), 15);
    
    let timer = setInterval(() => {
      start += Math.ceil(end / 50);
      if (start >= end) {
        clearInterval(timer);
        setCount(end);
      } else {
        setCount(start);
      }
    }, incrementTime);

    return () => clearInterval(timer);
  }, [numericValue, duration]);

  return <span>{count.toLocaleString()}{suffix}</span>;
};

interface LandingPageProps {
  onStartCoding: () => void;
  onGoogleSignIn: () => void;
  onDownloadDesktop: () => void;
}

export default function LandingPage({ onStartCoding, onGoogleSignIn, onDownloadDesktop }: LandingPageProps) {
  const [activeMockLang, setActiveMockLang] = useState<'mcpp' | 'python' | 'js'>('mcpp');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [mockCompiled, setMockCompiled] = useState(false);
  const [mockCompiling, setMockCompiling] = useState(false);

  const handleMockCompile = () => {
    setMockCompiling(true);
    setMockCompiled(false);
    setTimeout(() => {
      setMockCompiling(false);
      setMockCompiled(true);
    }, 1200);
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      setIsSubscribed(true);
      setNewsletterEmail("");
      setTimeout(() => setIsSubscribed(false), 4000);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100, damping: 15 } }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-[#0070F3] selection:text-white overflow-x-hidden relative">
      
      {/* Background grids / meshes */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,112,243,0.1),transparent_50%)] pointer-events-none" />
      <div className="absolute top-[800px] left-[-200px] w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(0,112,243,0.05),transparent_60%)] pointer-events-none blur-3xl" />
      <div className="absolute top-[2200px] right-[-200px] w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.03),transparent_60%)] pointer-events-none blur-3xl" />

      {/* Grid Pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.007)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.007)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-40" />

      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-50 w-full bg-black/85 backdrop-blur-md border-b border-white/5 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto rounded-b-xl">
        <div className="flex items-center gap-2 cursor-pointer">
          <img src="/logo.png" alt="CodeForge" className="h-7 w-auto" />
          <span className="font-extrabold tracking-tight text-white text-base">CodeForge</span>
        </div>
        
        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-[#A1A1AA]">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#workflow" className="hover:text-white transition-colors">Workflow</a>
          <a href="#comparison" className="hover:text-white transition-colors">Comparison</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onGoogleSignIn} className="hover:text-white text-xs">
            Sign In
          </Button>
          <Button variant="default" size="sm" onClick={onStartCoding} className="text-xs bg-[#0070F3]">
            Start Coding Free
          </Button>
        </div>
      </header>

      {/* 1. HERO SECTION */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-24 md:pt-24 grid lg:grid-cols-12 gap-12 items-center relative z-10">
        <motion.div 
          className="lg:col-span-6 flex flex-col items-start text-left"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <Badge variant="secondary" className="mb-6 py-1 px-3 border border-white/5 bg-[#111] text-[#0070F3] flex items-center gap-1.5 rounded-full">
            <Sparkles size={12} className="fill-current text-[#0070F3]" />
            <span>⚡ AI Native Development Platform</span>
          </Badge>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.1] mb-6">
            Build. Run. <br />
            Debug. Deploy. <br />
            <span className="text-[#0070F3] bg-gradient-to-r from-white via-white to-[#0070F3] bg-clip-text text-transparent">Everything in one browser.</span>
          </h1>

          <p className="text-[#A1A1AA] text-base md:text-lg max-w-xl leading-relaxed mb-10">
            CodeForge is an AI-powered cloud IDE that helps developers write better code faster. Compile multiple languages instantly, collaborate in real time, and ship projects without setting up a local environment.
          </p>

          <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
            <Button size="lg" variant="default" onClick={onStartCoding} className="w-full sm:w-auto bg-[#0070F3] text-white hover:brightness-110 font-bold flex items-center justify-center gap-2 group">
              <span>Start Coding Free</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button size="lg" variant="outline" onClick={onDownloadDesktop} className="w-full sm:w-auto border-white/10 hover:bg-white/5 flex items-center justify-center gap-2">
              <Laptop size={16} className="text-[#0070F3]" />
              <span>Download Desktop App</span>
            </Button>
          </div>
        </motion.div>

        {/* PREMIUM INTERACTIVE MOCKUP */}
        <motion.div 
          className="lg:col-span-6 w-full flex justify-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="w-full max-w-2xl bg-[#09090B] border border-white/10 rounded-xl overflow-hidden shadow-2xl shadow-[#0070F3]/5 flex flex-col font-sans select-none">
            
            {/* Header window control bar */}
            <div className="bg-[#111] border-b border-white/5 h-10 px-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
              </div>
              <div className="text-[11px] text-[#A1A1AA] font-mono flex items-center gap-2">
                <Badge variant="outline" className="py-0.5 px-2 bg-black border-white/10 text-[10px] text-[#22C55E]">
                  ● Live Workspace
                </Badge>
                <span>CodeForge Cloud Sandbox</span>
              </div>
              <div className="w-12" /> {/* spacer */}
            </div>

            {/* Main IDE area */}
            <div className="flex-1 min-h-[380px] grid grid-cols-12 overflow-hidden">
              
              {/* Activity Bar (VS Code like) */}
              <div className="col-span-1 bg-[#09090B] border-r border-white/5 flex flex-col items-center py-3 gap-4 text-[#A1A1AA]">
                <Folder size={16} className="text-[#0070F3] cursor-pointer" />
                <Code size={16} className="hover:text-white cursor-pointer" />
                <Activity size={16} className="hover:text-white cursor-pointer" />
                <Bot size={16} className="text-[#0070F3] cursor-pointer animate-pulse" />
                <Settings size={16} className="hover:text-white cursor-pointer mt-auto" />
              </div>

              {/* Sidebar Explorer */}
              <div className="col-span-3 bg-[#111] border-r border-white/5 p-3 flex flex-col gap-3 font-mono text-[11px]">
                <div className="text-[#A1A1AA] font-bold text-[9px] uppercase tracking-wider">FILES</div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 text-white font-semibold cursor-pointer">
                    <FileCode size={12} className="text-[#0070F3]" />
                    <span>main.{activeMockLang === 'mcpp' ? 'mcpp' : activeMockLang === 'python' ? 'py' : 'js'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#A1A1AA] cursor-pointer hover:text-white pl-1.5">
                    <FileText size={11} />
                    <span>input.txt</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[#A1A1AA] cursor-pointer hover:text-white pl-1.5">
                    <Settings size={11} />
                    <span>config.json</span>
                  </div>
                </div>

                <div className="text-[#A1A1AA] font-bold text-[9px] uppercase tracking-wider mt-4">GIT STATUS</div>
                <div className="flex items-center gap-1.5 text-[#22C55E]">
                  <Badge variant="outline" className="text-[8px] py-0 border-[#22C55E]/30 text-[#22C55E] bg-[#22C55E]/10">M</Badge>
                  <span className="truncate">Ready to commit</span>
                </div>
              </div>

              {/* Code Area */}
              <div className="col-span-8 bg-black flex flex-col justify-between">
                
                {/* File Tabs */}
                <div className="bg-[#111] border-b border-white/5 flex items-center font-mono text-[10px]">
                  <div className="bg-black border-r border-white/5 border-t border-t-[#0070F3] px-3 py-1.5 text-white font-bold flex items-center gap-1.5">
                    <Code size={10} className="text-[#0070F3]" />
                    <span>main.{activeMockLang === 'mcpp' ? 'mcpp' : activeMockLang === 'python' ? 'py' : 'js'}</span>
                  </div>
                  <button 
                    onClick={() => setActiveMockLang('mcpp')}
                    className={`px-2.5 py-1.5 border-r border-white/5 hover:text-white ${activeMockLang === 'mcpp' ? 'text-white' : 'text-[#A1A1AA]'}`}
                  >
                    MiniCPP
                  </button>
                  <button 
                    onClick={() => setActiveMockLang('python')}
                    className={`px-2.5 py-1.5 border-r border-white/5 hover:text-white ${activeMockLang === 'python' ? 'text-white' : 'text-[#A1A1AA]'}`}
                  >
                    Python
                  </button>
                  <button 
                    onClick={() => setActiveMockLang('js')}
                    className={`px-2.5 py-1.5 hover:text-white ${activeMockLang === 'js' ? 'text-white' : 'text-[#A1A1AA]'}`}
                  >
                    JS
                  </button>
                </div>

                {/* Editor Content */}
                <div className="flex-1 p-4 font-mono text-[11px] leading-relaxed text-[#D4D4D4] overflow-y-auto whitespace-pre-wrap select-text">
                  {MOCK_CODES[activeMockLang]}
                </div>

                {/* Console Output */}
                <div className="bg-[#111] border-t border-white/5 p-3 flex flex-col shrink-0">
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5 mb-1.5 text-[9px] font-mono text-[#A1A1AA]">
                    <div className="flex items-center gap-1.5">
                      <Terminal size={10} className="text-[#0070F3]" />
                      <span>TERMINAL CONSOLE</span>
                    </div>
                    <Button variant="default" size="sm" onClick={handleMockCompile} disabled={mockCompiling} className="h-5 py-0.5 px-2 bg-[#22C55E] hover:bg-[#22C55E]/90 text-white font-bold text-[9px] rounded">
                      {mockCompiling ? 'Running...' : 'Run Code'}
                    </Button>
                  </div>
                  
                  <div className="h-16 font-mono text-[10px] text-[#A1A1AA] flex flex-col gap-1 overflow-y-auto">
                    {mockCompiling && (
                      <div className="text-[#0070F3] animate-pulse">● Compiling and launching secure environment...</div>
                    )}
                    {mockCompiled && !mockCompiling && (
                      <>
                        <div className="text-[#22C55E]">[CodeForge Sandbox] Process started successfully.</div>
                        {activeMockLang === 'mcpp' && <div className="text-white">Output: CodeForge compiler active (result: 30)</div>}
                        {activeMockLang === 'python' && <div className="text-white">Output: [1, 1, 1, 2, 3, 6, 8, 10]</div>}
                        {activeMockLang === 'js' && <div className="text-white">Output: Server running at http://localhost:3000</div>}
                        <div className="text-[#22C55E]">Process exited with code 0.</div>
                      </>
                    )}
                    {!mockCompiling && !mockCompiled && (
                      <div className="italic text-white/30">Click "Run Code" above to execute program.</div>
                    )}
                  </div>
                </div>

              </div>

            </div>

            {/* AI Assistant Drawer */}
            <div className="bg-[#09090B] border-t border-white/5 py-2 px-4 flex items-center justify-between font-sans text-[11px] text-[#A1A1AA]">
              <div className="flex items-center gap-1.5 text-white">
                <Bot size={13} className="text-[#0070F3]" />
                <span className="font-bold">Groq AI Pilot:</span>
                <span>Active and listening</span>
              </div>
              <Badge variant="outline" className="text-[9px] py-0 border-white/5 bg-black text-[#A1A1AA] flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-[#22C55E]" />
                <span>Auto-Fix Enabled</span>
              </Badge>
            </div>

          </div>
        </motion.div>
      </section>

      {/* 2. TRUSTED BY SECTION */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-b border-white/5 relative z-10 bg-[#09090B]/50">
        <div className="text-center mb-8">
          <p className="text-xs font-semibold tracking-wider text-[#A1A1AA] uppercase">
            Trusted by thousands of students, developers, coding communities, and engineering teams worldwide.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 justify-items-center items-center">
          <div className="text-center flex flex-col gap-1">
            <h3 className="text-3xl md:text-4xl font-extrabold text-white font-mono">
              <AnimatedCounter value="100K+" />
            </h3>
            <span className="text-[11px] font-mono text-[#A1A1AA] uppercase tracking-wider">Programs Executed</span>
          </div>

          <div className="text-center flex flex-col gap-1">
            <h3 className="text-3xl md:text-4xl font-extrabold text-white font-mono">
              <AnimatedCounter value="50+" />
            </h3>
            <span className="text-[11px] font-mono text-[#A1A1AA] uppercase tracking-wider">Programming Languages</span>
          </div>

          <div className="text-center flex flex-col gap-1">
            <h3 className="text-3xl md:text-4xl font-extrabold text-[#0070F3] font-mono">
              <AnimatedCounter value="99.9%" />
            </h3>
            <span className="text-[11px] font-mono text-[#A1A1AA] uppercase tracking-wider">Cloud Availability</span>
          </div>

          <div className="text-center flex flex-col gap-1">
            <h3 className="text-3xl md:text-4xl font-extrabold text-white font-mono">
              <AnimatedCounter value="10K+" />
            </h3>
            <span className="text-[11px] font-mono text-[#A1A1AA] uppercase tracking-wider">Developers</span>
          </div>

          <div className="text-center flex flex-col gap-1 col-span-2 md:col-span-1">
            <h3 className="text-3xl md:text-4xl font-extrabold text-white font-mono">
              <AnimatedCounter value="1M+" />
            </h3>
            <span className="text-[11px] font-mono text-[#A1A1AA] uppercase tracking-wider">Lines of Code Generated</span>
          </div>
        </div>
      </section>

      {/* 3. WHY CODEFORGE SECTION */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24 relative z-10 text-center">
        <div className="mb-16">
          <Badge variant="outline" className="border-white/5 bg-[#111] text-[#0070F3] py-1 px-3 rounded-full mb-4">
            CORE CAPABILITIES
          </Badge>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            Engineered for the Modern Developer
          </h2>
          <p className="text-[#A1A1AA] text-sm md:text-base max-w-2xl mx-auto">
            CodeForge eliminates environmental setup hurdles, compiling code instantly on sandboxed nodes backed by intelligent developer tooling.
          </p>
        </div>

        <motion.div 
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
        >
          {/* Card 1 */}
          <motion.div variants={itemVariants}>
            <Card className="hover:border-white/20 hover:bg-[#111]/30 transition-all duration-300 h-full flex flex-col text-left">
              <CardHeader>
                <div className="w-9 h-9 rounded-lg bg-[#0070F3]/10 text-[#0070F3] flex items-center justify-center mb-4">
                  <Bot size={18} />
                </div>
                <CardTitle className="text-lg font-bold">AI Code Assistant</CardTitle>
                <CardDescription className="text-xs text-[#A1A1AA] leading-relaxed mt-2">
                  Get explanations, bug fixes, optimizations, documentation, and complete code generation powered by custom Groq LLM pipelines.
                </CardDescription>
              </CardHeader>
            </Card>
          </motion.div>

          {/* Card 2 */}
          <motion.div variants={itemVariants}>
            <Card className="hover:border-white/20 hover:bg-[#111]/30 transition-all duration-300 h-full flex flex-col text-left">
              <CardHeader>
                <div className="w-9 h-9 rounded-lg bg-[#22C55E]/10 text-[#22C55E] flex items-center justify-center mb-4">
                  <Zap size={18} />
                </div>
                <CardTitle className="text-lg font-bold">Lightning Fast Compiler</CardTitle>
                <CardDescription className="text-xs text-[#A1A1AA] leading-relaxed mt-2">
                  Compile and execute code within milliseconds using our optimized sandbox engine and dedicated high-performance Linux cores.
                </CardDescription>
              </CardHeader>
            </Card>
          </motion.div>

          {/* Card 3 */}
          <motion.div variants={itemVariants}>
            <Card className="hover:border-white/20 hover:bg-[#111]/30 transition-all duration-300 h-full flex flex-col text-left">
              <CardHeader>
                <div className="w-9 h-9 rounded-lg bg-[#0EA5E9]/10 text-[#0EA5E9] flex items-center justify-center mb-4">
                  <Globe size={18} />
                </div>
                <CardTitle className="text-lg font-bold">Cloud Workspace</CardTitle>
                <CardDescription className="text-xs text-[#A1A1AA] leading-relaxed mt-2">
                  Access your code files, custom settings, and workspace preferences securely from any device, anywhere in the world.
                </CardDescription>
              </CardHeader>
            </Card>
          </motion.div>

          {/* Card 4 */}
          <motion.div variants={itemVariants}>
            <Card className="hover:border-white/20 hover:bg-[#111]/30 transition-all duration-300 h-full flex flex-col text-left">
              <CardHeader>
                <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
                  <Users size={18} />
                </div>
                <CardTitle className="text-lg font-bold">Real-Time Collaboration</CardTitle>
                <CardDescription className="text-xs text-[#A1A1AA] leading-relaxed mt-2">
                  Code alongside your teammates concurrently in the same workspace with absolute synchronization and real-time state broadcasts.
                </CardDescription>
              </CardHeader>
            </Card>
          </motion.div>

          {/* Card 5 */}
          <motion.div variants={itemVariants}>
            <Card className="hover:border-white/20 hover:bg-[#111]/30 transition-all duration-300 h-full flex flex-col text-left">
              <CardHeader>
                <div className="w-9 h-9 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center mb-4">
                  <Terminal size={18} />
                </div>
                <CardTitle className="text-lg font-bold">Integrated Terminal</CardTitle>
                <CardDescription className="text-xs text-[#A1A1AA] leading-relaxed mt-2">
                  Install custom libraries, run system commands, and navigate directories natively with our low-latency XTerm.js terminal.
                </CardDescription>
              </CardHeader>
            </Card>
          </motion.div>

          {/* Card 6 */}
          <motion.div variants={itemVariants}>
            <Card className="hover:border-white/20 hover:bg-[#111]/30 transition-all duration-300 h-full flex flex-col text-left">
              <CardHeader>
                <div className="w-9 h-9 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center mb-4">
                  <Shield size={18} />
                </div>
                <CardTitle className="text-lg font-bold">Secure Environment</CardTitle>
                <CardDescription className="text-xs text-[#A1A1AA] leading-relaxed mt-2">
                  Your code runs inside fully isolated, sandboxed containers that auto-reset to avoid execution leakage or runtime interference.
                </CardDescription>
              </CardHeader>
            </Card>
          </motion.div>
        </motion.div>
      </section>

      {/* 4. SUPPORTED LANGUAGES SECTION */}
      <section className="max-w-7xl mx-auto px-6 py-24 border-t border-white/5 relative z-10">
        <div className="text-center mb-16">
          <Badge variant="outline" className="border-white/5 bg-[#111] text-[#0070F3] py-1 px-3 rounded-full mb-4">
            COMPILER ECOSYSTEM
          </Badge>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            One IDE, Any Language.
          </h2>
          <p className="text-[#A1A1AA] text-sm md:text-base max-w-xl mx-auto">
            CodeForge natively compiles and runs standard backends, static configurations, systems code, and scripts without any client dependencies.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[
            { name: "C", desc: "GCC standard compiler" },
            { name: "C++", desc: "G++20 compilation" },
            { name: "Python", desc: "Python 3 interpreter" },
            { name: "Java", desc: "JDK execution sandboxes" },
            { name: "JavaScript", desc: "Node.js environment" },
            { name: "TypeScript", desc: "TS compile engine" },
            { name: "Go", desc: "Golang runtime" },
            { name: "Rust", desc: "Rustc compilation" },
            { name: "Swift", desc: "Swift compiler" },
            { name: "Kotlin", desc: "JVM execution core" },
            { name: "PHP", desc: "PHP interpreter" },
            { name: "Ruby", desc: "Ruby runtime engine" },
            { name: "C#", desc: ".NET CLI runner" },
            { name: "SQL", desc: "In-memory SQL client" },
            { name: "Bash", desc: "Shell container execution" }
          ].map((lang, idx) => (
            <div 
              key={idx}
              className="p-4 rounded-xl border border-white/5 bg-[#09090B] hover:border-white/20 hover:bg-[#111] transition-all group flex flex-col items-center text-center cursor-pointer"
            >
              <div className="text-sm font-bold text-white font-mono mb-1 group-hover:text-[#0070F3] transition-colors">{lang.name}</div>
              <div className="text-[10px] text-[#A1A1AA]">{lang.desc}</div>
            </div>
          ))}
          
          <div className="p-4 rounded-xl border border-white/5 border-dashed bg-transparent flex flex-col items-center justify-center text-center">
            <span className="text-xs font-semibold text-[#A1A1AA] italic">More coming soon...</span>
          </div>
        </div>
      </section>

      {/* 5. AI CAPABILITIES SHOWCASE */}
      <section className="max-w-7xl mx-auto px-6 py-24 border-t border-white/5 relative z-10 bg-[#09090B]/30 rounded-3xl">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 text-left">
            <Badge variant="secondary" className="mb-4 py-1 px-3 border border-white/5 bg-[#111] text-[#0070F3] rounded-full">
              GROQ LLM PIPELINES
            </Badge>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-6 leading-tight">
              A Private AI Pair Programmer.
            </h2>
            <p className="text-[#A1A1AA] text-sm md:text-base leading-relaxed mb-8">
              CodeForge features a deep execution context bridge connected to specialized LLMs. Explain operations, diagnose compiler complaints in 1-click, write complete packages, and run auto-fixes with Zero LLM costs.
            </p>
            <Button size="lg" variant="default" onClick={onStartCoding} className="bg-[#0070F3] text-white">
              Unlock AI Suite Free
            </Button>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              "Generate Code", "Explain Code", "Fix Bugs",
              "Refactor Code", "Convert Languages", "Generate Unit Tests",
              "Optimize Speed", "Detect Security Issues", "Write Docs",
              "Suggest Best Practices", "Generate SQL", "Complete Functions"
            ].map((capability, idx) => (
              <div 
                key={idx}
                className="p-4 rounded-xl border border-white/5 bg-[#09090B] flex items-center gap-3"
              >
                <div className="w-5 h-5 rounded-full bg-[#0070F3]/15 text-[#0070F3] flex items-center justify-center shrink-0">
                  <Check size={11} className="stroke-[3]" />
                </div>
                <span className="text-xs font-semibold text-white">{capability}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. DEVELOPER WORKFLOW SECTION */}
      <section id="workflow" className="max-w-7xl mx-auto px-6 py-24 border-t border-white/5 relative z-10 text-center">
        <div className="mb-16">
          <Badge variant="outline" className="border-white/5 bg-[#111] text-[#0070F3] py-1 px-3 rounded-full mb-4">
            IDE PIPELINE
          </Badge>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            Your Code from Scratch to Deploy
          </h2>
          <p className="text-[#A1A1AA] text-sm md:text-base max-w-2xl mx-auto">
            From the first line to production hosting, CodeForge coordinates compilation, errors, and exports.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          
          {/* Workflow step 1 */}
          <Card className="hover:border-white/20 transition-all text-left h-full flex flex-col relative z-10">
            <CardHeader className="relative">
              <div className="absolute top-4 right-4 text-3xl font-extrabold font-mono text-white/5 select-none">01</div>
              <div className="w-8 h-8 rounded-lg bg-[#0070F3]/10 text-[#0070F3] flex items-center justify-center mb-4 font-mono font-bold text-xs">
                Write
              </div>
              <CardTitle className="text-base font-bold">Write Code</CardTitle>
              <CardDescription className="text-xs text-[#A1A1AA] leading-relaxed mt-2">
                Type comfortably inside a professional Monaco Editor with VS Code-like shortcuts and standard themes.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Workflow step 2 */}
          <Card className="hover:border-white/20 transition-all text-left h-full flex flex-col relative z-10">
            <CardHeader className="relative">
              <div className="absolute top-4 right-4 text-3xl font-extrabold font-mono text-white/5 select-none">02</div>
              <div className="w-8 h-8 rounded-lg bg-[#22C55E]/10 text-[#22C55E] flex items-center justify-center mb-4 font-mono font-bold text-xs">
                Compile
              </div>
              <CardTitle className="text-base font-bold">Compile Instantly</CardTitle>
              <CardDescription className="text-xs text-[#A1A1AA] leading-relaxed mt-2">
                Execute code instantaneously on highly isolated, sandboxed Docker containers running on host clusters.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Workflow step 3 */}
          <Card className="hover:border-white/20 transition-all text-left h-full flex flex-col relative z-10">
            <CardHeader className="relative">
              <div className="absolute top-4 right-4 text-3xl font-extrabold font-mono text-white/5 select-none">03</div>
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center mb-4 font-mono font-bold text-xs">
                Debug
              </div>
              <CardTitle className="text-base font-bold">Diagnose and Debug</CardTitle>
              <CardDescription className="text-xs text-[#A1A1AA] leading-relaxed mt-2">
                Use built-in telemetry readouts and Groq AI error fixers to identify and solve compiler errors in seconds.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Workflow step 4 */}
          <Card className="hover:border-white/20 transition-all text-left h-full flex flex-col relative z-10">
            <CardHeader className="relative">
              <div className="absolute top-4 right-4 text-3xl font-extrabold font-mono text-white/5 select-none">04</div>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4 font-mono font-bold text-xs">
                Deploy
              </div>
              <CardTitle className="text-base font-bold">Export and Host</CardTitle>
              <CardDescription className="text-xs text-[#A1A1AA] leading-relaxed mt-2">
                Deploy packages with one click or export your local projects directly onto your laptop workspace.
              </CardDescription>
            </CardHeader>
          </Card>

        </div>
      </section>

      {/* 7. BUILT FOR EVERYONE */}
      <section className="max-w-7xl mx-auto px-6 py-24 border-t border-white/5 relative z-10 text-center">
        <div className="mb-16">
          <Badge variant="outline" className="border-white/5 bg-[#111] text-[#0070F3] py-1 px-3 rounded-full mb-4">
            DESIGNED FOR YOU
          </Badge>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            Accelerating Productivity for Everyone
          </h2>
          <p className="text-[#A1A1AA] text-sm md:text-base max-w-2xl mx-auto">
            From university students studying syntax to professional engineering teams optimizing microservices.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
          
          <div className="p-6 rounded-2xl border border-white/5 bg-[#09090B] hover:border-white/20 transition-all">
            <h4 className="font-bold text-white text-base mb-2">Students</h4>
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              Study C++, Java, and Python on a simple, zero-setup compiler. Practice for interviews and examinations directly from your tablet or laptop.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-white/5 bg-[#09090B] hover:border-white/20 transition-all">
            <h4 className="font-bold text-white text-base mb-2">Professional Developers</h4>
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              Build production ready libraries, run benchmark scripts, and refactor architecture using specialized AI code writer suites.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-white/5 bg-[#09090B] hover:border-white/20 transition-all">
            <h4 className="font-bold text-white text-base mb-2">Engineering Teams</h4>
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              Collaborate and code simultaneously. Share snippets instantly with link embeds and integrate with centralized repository systems.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-white/5 bg-[#09090B] hover:border-white/20 transition-all">
            <h4 className="font-bold text-white text-base mb-2">Educators</h4>
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              Create assignments, explain AST hierarchies visually, and run classrooms without local environment debugging configurations.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-white/5 bg-[#09090B] hover:border-white/20 transition-all md:col-span-2 lg:col-span-1">
            <h4 className="font-bold text-white text-base mb-2">Competitive Programmers</h4>
            <p className="text-xs text-[#A1A1AA] leading-relaxed">
              Compete on low compile latency environments with customized standard input/output mapping configurations.
            </p>
          </div>

        </div>
      </section>

      {/* 8. COMPARISON SECTION */}
      <section id="comparison" className="max-w-7xl mx-auto px-6 py-24 border-t border-white/5 relative z-10">
        <div className="text-center mb-16">
          <Badge variant="outline" className="border-white/5 bg-[#111] text-[#0070F3] py-1 px-3 rounded-full mb-4">
            IDE ANALYSIS
          </Badge>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            CodeForge vs. Local Development
          </h2>
          <p className="text-[#A1A1AA] text-sm md:text-base max-w-xl mx-auto">
            Traditional local setups are tedious and static. CodeForge handles environments and execution dynamically.
          </p>
        </div>

        <div className="w-full overflow-x-auto border border-white/10 rounded-xl bg-[#09090B]">
          <table className="w-full text-left font-sans text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-[#111] text-[#A1A1AA] font-bold">
                <th className="p-4">CAPABILITIES</th>
                <th className="p-4 text-[#0070F3] font-extrabold">CODEFORGE</th>
                <th className="p-4">LOCAL IDE (VS CODE, ETC.)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-white">
              {[
                { name: "No Installation", cf: true, local: false },
                { name: "Cloud Workspace (Sync)", cf: true, local: false },
                { name: "AI Assistant (1-Click Fix)", cf: true, local: false },
                { name: "Real-time Collaboration", cf: true, local: false },
                { name: "Auto Save & Local File Sync", cf: true, local: true },
                { name: "Cross Device Accessibility", cf: true, local: false },
                { name: "Instant Sharing (Snippet Link)", cf: true, local: false },
                { name: "Browser Based Sandbox", cf: true, local: false },
                { name: "Secure Containered Isolation", cf: true, local: false },
                { name: "Modern Minimalist Theme", cf: true, local: true }
              ].map((row, idx) => (
                <tr key={idx} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 font-semibold text-[#A1A1AA]">{row.name}</td>
                  <td className="p-4">
                    {row.cf ? (
                      <Check size={16} className="text-[#22C55E]" />
                    ) : (
                      <span className="text-white/20">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    {row.local ? (
                      <Check size={16} className="text-[#A1A1AA]" />
                    ) : (
                      <span className="text-white/20">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 9. TESTIMONIALS SECTION */}
      <section className="max-w-7xl mx-auto px-6 py-24 border-t border-white/5 relative z-10 text-center">
        <div className="mb-16">
          <Badge variant="outline" className="border-white/5 bg-[#111] text-[#0070F3] py-1 px-3 rounded-full mb-4">
            REVIEWS
          </Badge>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            Approved by the Developer Community
          </h2>
          <p className="text-[#A1A1AA] text-sm md:text-base max-w-2xl mx-auto">
            Here is what competitive programmers, educators, and software builders say about CodeForge.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
          
          <Card className="hover:border-white/20 transition-all flex flex-col justify-between">
            <CardHeader>
              <div className="flex gap-1 mb-4 text-[#FACC15]">
                {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
              </div>
              <CardDescription className="text-xs text-white leading-relaxed font-semibold italic">
                "CodeForge has completely transformed my lecture workflow. Students open the link, click preset C++, and start coding. No compiler path configuration errors to debug on 60 different computers."
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex items-center gap-3 pt-3 border-t border-white/5">
              <div className="w-8 h-8 rounded-full bg-[#111] border border-[#0070F3] text-white flex items-center justify-center font-bold text-xs">
                JD
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">Dr. Julia Davis</span>
                <span className="text-[10px] text-[#A1A1AA]">CS Professor, State University</span>
              </div>
            </CardFooter>
          </Card>

          <Card className="hover:border-white/20 transition-all flex flex-col justify-between">
            <CardHeader>
              <div className="flex gap-1 mb-4 text-[#FACC15]">
                {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
              </div>
              <CardDescription className="text-xs text-white leading-relaxed font-semibold italic">
                "Having a full integrated terminal and standard compiler packages inside a tablet browser is mind-blowing. The compile times are extremely fast and the Groq pair assistant is top-tier."
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex items-center gap-3 pt-3 border-t border-white/5">
              <div className="w-8 h-8 rounded-full bg-[#111] border border-[#0070F3] text-white flex items-center justify-center font-bold text-xs">
                MR
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">Marcus Reed</span>
                <span className="text-[10px] text-[#A1A1AA]">Senior Frontend Architect, Stripe</span>
              </div>
            </CardFooter>
          </Card>

          <Card className="hover:border-white/20 transition-all flex flex-col justify-between">
            <CardHeader>
              <div className="flex gap-1 mb-4 text-[#FACC15]">
                {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
              </div>
              <CardDescription className="text-xs text-white leading-relaxed font-semibold italic">
                "The 1-click AI auto-fix diagnosed a pointer memory mismatch in my MiniCPP code and applied the correction in the editor. Unbelievable helper feature!"
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex items-center gap-3 pt-3 border-t border-white/5">
              <div className="w-8 h-8 rounded-full bg-[#111] border border-[#0070F3] text-white flex items-center justify-center font-bold text-xs">
                AK
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">Aiko Kobayashi</span>
                <span className="text-[10px] text-[#A1A1AA]">CS Student and Competitive Programmer</span>
              </div>
            </CardFooter>
          </Card>

        </div>
      </section>

      {/* 10. PRICING SECTION */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-24 border-t border-white/5 relative z-10 text-center">
        <div className="mb-16">
          <Badge variant="outline" className="border-white/5 bg-[#111] text-[#0070F3] py-1 px-3 rounded-full mb-4">
            FLEXIBLE PLANS
          </Badge>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            Cloud Coding for Every Budget
          </h2>
          <p className="text-[#A1A1AA] text-sm md:text-base max-w-xl mx-auto">
            Choose a plan that matches your development requirements. Scale custom limits as you grow.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 text-left items-stretch">
          
          {/* Card 1: Free */}
          <Card className="hover:border-white/20 transition-all flex flex-col justify-between h-full">
            <CardHeader>
              <CardTitle className="text-base text-[#A1A1AA] font-semibold">Free</CardTitle>
              <div className="my-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white">$0</span>
                <span className="text-xs text-[#A1A1AA]">/ month</span>
              </div>
              <CardDescription className="text-xs leading-relaxed">
                Perfect for students, hobbyists, and learning to write code.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4 text-xs">
              <div className="h-px bg-white/5 my-2" />
              <div className="flex items-center gap-2">
                <Check size={14} className="text-[#0070F3] shrink-0" />
                <span>5 execution containers / day</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-[#0070F3] shrink-0" />
                <span>Standard compile queues</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-[#0070F3] shrink-0" />
                <span>Single editor workspace</span>
              </div>
              <div className="flex items-center gap-2 text-white/40">
                <X size={14} className="shrink-0" />
                <span>AI Code Suite (Locked)</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" onClick={onStartCoding} className="w-full mt-4 border-white/10 hover:bg-white/5">
                Start Coding Free
              </Button>
            </CardFooter>
          </Card>

          {/* Card 2: Pro */}
          <Card className="border-[#0070F3] bg-[#09090B] relative flex flex-col justify-between h-full shadow-lg shadow-[#0070F3]/5">
            <div className="absolute top-0 right-6 -translate-y-1/2 bg-[#0070F3] text-white text-[9px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full">
              Recommended
            </div>
            
            <CardHeader>
              <CardTitle className="text-base text-[#0070F3] font-bold">Pro</CardTitle>
              <div className="my-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white">$12</span>
                <span className="text-xs text-[#A1A1AA]">/ month</span>
              </div>
              <CardDescription className="text-xs leading-relaxed text-white/80">
                For developers, creators, and competitive programmers needing full power.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col gap-4 text-xs">
              <div className="h-px bg-white/10 my-2" />
              <div className="flex items-center gap-2">
                <Check size={14} className="text-[#0070F3] shrink-0" />
                <span className="font-semibold text-white">Unlimited execution containers</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-[#0070F3] shrink-0" />
                <span>Unlimited Groq AI API requests</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-[#0070F3] shrink-0" />
                <span>Real-time teammate collaboration</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-[#0070F3] shrink-0" />
                <span>100+ cloud projects</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-[#0070F3] shrink-0" />
                <span>High priority compilation cores</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="default" onClick={onGoogleSignIn} className="w-full mt-4 bg-[#0070F3] text-white font-bold hover:brightness-110">
                Upgrade to Pro
              </Button>
            </CardFooter>
          </Card>

          {/* Card 3: Enterprise */}
          <Card className="hover:border-white/20 transition-all flex flex-col justify-between h-full">
            <CardHeader>
              <CardTitle className="text-base text-[#A1A1AA] font-semibold">Enterprise</CardTitle>
              <div className="my-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white">Custom</span>
              </div>
              <CardDescription className="text-xs leading-relaxed">
                For coding bootcamps, schools, startups, and engineering groups.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4 text-xs">
              <div className="h-px bg-white/5 my-2" />
              <div className="flex items-center gap-2">
                <Check size={14} className="text-[#0070F3] shrink-0" />
                <span>SSO & SAML authentication</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-[#0070F3] shrink-0" />
                <span>Dedicated compiler containers</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-[#0070F3] shrink-0" />
                <span>Custom classrooms & grading APIs</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={14} className="text-[#0070F3] shrink-0" />
                <span>99.9% uptime SLA guarantee</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full mt-4 border-white/10 hover:bg-white/5">
                Contact Sales
              </Button>
            </CardFooter>
          </Card>

        </div>
      </section>

      {/* 11. FAQ SECTION */}
      <section id="faq" className="max-w-4xl mx-auto px-6 py-24 border-t border-white/5 relative z-10">
        <div className="text-center mb-16">
          <Badge variant="outline" className="border-white/5 bg-[#111] text-[#0070F3] py-1 px-3 rounded-full mb-4">
            QUESTIONS
          </Badge>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            Frequently Asked Questions
          </h2>
        </div>

        <Accordion>
          {[
            {
              q: "What languages does CodeForge support?",
              a: "CodeForge supports 15+ major coding languages including C, C++ (C++20 standard), Python 3, Java, JavaScript (Node.js), TypeScript, Go, Rust, Swift, Kotlin, PHP, Ruby, C#, SQL, and Bash shell scripts, with more on the roadmap."
            },
            {
              q: "Is CodeForge completely free to use?",
              a: "Yes! We offer a full-featured Free tier that is perfect for students, personal learning, and quick code compilation. You can write, compile, and run code without paying a dollar. Upgrades to Pro unlock unlimited AI usage and collaboration features."
            },
            {
              q: "Can I collaborate with my classmates or teammates?",
              a: "Absolutely. With our Pro and Enterprise plans, you can invite colleagues directly into your active workspace session. Multiple users can concurrently type, write code, edit inputs, compile, and examine stdout/stderr logs together."
            },
            {
              q: "Is my source code secure and private?",
              a: "Your code's safety is our priority. Every time you compile, your files are processed in isolated sandboxed containers. No code is leaked or executed outside your session scope. Google-signed users have their profiles and project trees synchronized securely with dedicated MongoDB Atlas database vaults."
            },
            {
              q: "Can I upload and work on my existing projects?",
              a: "Yes. You can import existing files directly into your explorer tree. In addition, CodeForge features simple exports to download any cloud file natively to your computer."
            },
            {
              q: "Does the AI assistant support every coding language?",
              a: "Yes, our Groq Llama-3 AI code assistant can generate, optimize, refactor, and explain code blocks in any language. The compiler error diagnostics are specifically optimized to help correct errors for all compiler suites, with native inline explanations for MiniCPP (`mcpc`) outputs."
            }
          ].map((faq, idx) => (
            <AccordionItem key={idx}>
              <AccordionTrigger 
                isOpen={openFaqIndex === idx} 
                onClick={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
              >
                <span className="text-sm font-semibold">{faq.q}</span>
              </AccordionTrigger>
              <AccordionContent isOpen={openFaqIndex === idx}>
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* 12. FINAL CTA SECTION */}
      <section className="max-w-5xl mx-auto px-6 py-24 border-t border-white/5 relative z-10 text-center">
        <div className="py-16 px-8 rounded-3xl bg-[radial-gradient(ellipse_at_bottom,rgba(0,112,243,0.15),transparent_60%)] border border-white/10 relative overflow-hidden">
          
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.003)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.003)_1px,transparent_1px)] bg-[size:24px_24px] opacity-30 pointer-events-none" />

          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-6">
            Your Next Project Starts Here.
          </h2>
          <p className="text-[#A1A1AA] text-sm md:text-base max-w-xl mx-auto mb-10 leading-relaxed">
            Join thousands of developers building faster, debugging smarter, and compiling code instantaneously with AI-powered cloud development.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" onClick={onStartCoding} className="bg-[#0070F3] text-white hover:brightness-110 font-bold">
              Start Coding Free
            </Button>
            <Button size="lg" variant="outline" className="border-white/10 hover:bg-white/5 flex items-center gap-2">
              <BookOpen size={15} />
              <span>Read Documentation</span>
            </Button>
            <Button size="lg" variant="outline" className="border-white/10 hover:bg-white/5 flex items-center gap-2">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <span>GitHub</span>
            </Button>
          </div>
        </div>
      </section>

      {/* 13. FOOTER */}
      <footer className="border-t border-white/5 bg-[#09090B] px-6 py-16 relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10">
          
          <div className="md:col-span-4 flex flex-col items-start gap-4">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="CodeForge" className="h-6 w-auto" />
              <span className="font-bold text-white">CodeForge</span>
            </div>
            <p className="text-xs text-[#A1A1AA] max-w-xs leading-relaxed">
              The AI-Native Cloud IDE for Modern Developers. Write, compile, and run code instantly inside isolated containers on secure cloud servers.
            </p>
            
            {/* Newsletter form */}
            <form onSubmit={handleSubscribe} className="flex flex-col gap-2 w-full max-w-xs mt-2">
              <label className="text-[10px] uppercase font-bold text-[#A1A1AA] tracking-wider">Subscribe to Newsletter</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="flex-1 bg-black border border-white/10 px-3 py-2 rounded-lg text-xs outline-none focus:border-[#0070F3] text-white placeholder-white/20"
                />
                <Button type="submit" variant="default" size="sm" className="bg-[#0070F3]">
                  Join
                </Button>
              </div>
              <AnimatePresence>
                {isSubscribed && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-[11px] text-[#22C55E] font-semibold mt-1"
                  >
                    ✓ Successfully subscribed! Thank you.
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>

          <div className="md:col-span-2 flex flex-col gap-4 text-left">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Product</span>
            <div className="flex flex-col gap-2.5 text-xs text-[#A1A1AA]">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
              <span className="hover:text-white cursor-pointer transition-colors">Roadmap</span>
            </div>
          </div>

          <div className="md:col-span-2 flex flex-col gap-4 text-left">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Company</span>
            <div className="flex flex-col gap-2.5 text-xs text-[#A1A1AA]">
              <span className="hover:text-white cursor-pointer transition-colors">About Us</span>
              <span className="hover:text-white cursor-pointer transition-colors">Blog</span>
              <span className="hover:text-white cursor-pointer transition-colors">Careers</span>
            </div>
          </div>

          <div className="md:col-span-2 flex flex-col gap-4 text-left">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Resources</span>
            <div className="flex flex-col gap-2.5 text-xs text-[#A1A1AA]">
              <span className="hover:text-white cursor-pointer transition-colors">Documentation</span>
              <span className="hover:text-white cursor-pointer transition-colors">API Reference</span>
              <span className="hover:text-white cursor-pointer transition-colors">Community</span>
            </div>
          </div>

          <div className="md:col-span-2 flex flex-col gap-4 text-left">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Legal</span>
            <div className="flex flex-col gap-2.5 text-xs text-[#A1A1AA]">
              <span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
              <span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span>
              <span className="hover:text-white cursor-pointer transition-colors">Contact</span>
            </div>
          </div>

        </div>

        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-[#A1A1AA] gap-4">
          <span>© 2026 CodeForge Inc. All rights reserved.</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white">GitHub</a>
            <a href="#" className="hover:text-white">Discord</a>
            <a href="#" className="hover:text-white">Twitter</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
