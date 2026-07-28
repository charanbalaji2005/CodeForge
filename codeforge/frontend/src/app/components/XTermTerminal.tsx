"use client";

import React, { useEffect, useRef } from 'react';

interface XTermTerminalProps {
  stdout: string;
  stderr: string;
  isRunning: boolean;
  onSendInput: (input: string) => void;
  onClear: () => void;
}

export default function XTermTerminal({
  stdout,
  stderr,
  isRunning,
  onSendInput,
  onClear
}: XTermTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termInstanceRef = useRef<any>(null);
  const fitAddonRef = useRef<any>(null);
  const inputBufferRef = useRef<string>('');

  useEffect(() => {
    let term: any;
    let fitAddon: any;

    const initTerminal = async () => {
      try {
        const { Terminal } = await import('@xterm/xterm');
        const { FitAddon } = await import('@xterm/addon-fit');
        await import('@xterm/xterm/css/xterm.css');

        if (!terminalRef.current) return;
        terminalRef.current.innerHTML = '';

        term = new Terminal({
          cursorBlink: true,
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          fontSize: 13,
          theme: {
            background: '#0F172A',
            foreground: '#F8FAFC',
            cursor: '#F97316',
            selectionBackground: '#334155'
          },
          rows: 14
        });

        fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(terminalRef.current);
        fitAddon.fit();

        termInstanceRef.current = term;
        fitAddonRef.current = fitAddon;

        // Welcome banner in XTerm
        term.writeln('\x1b[1;36mCodeForge Interactive Terminal v1.0.0\x1b[0m');
        term.writeln('\x1b[90mPowered by XTerm.js — Real-Time Stdin/Stdout Stream\x1b[0m');
        term.writeln('');

        // Handle Keystroke Inputs directly in Terminal
        term.onData((data: string) => {
          if (data === '\r') {
            // Enter pressed
            const line = inputBufferRef.current;
            inputBufferRef.current = '';
            term.write('\r\n');
            if (line.trim()) {
              onSendInput(line);
            }
          } else if (data === '\x7f') {
            // Backspace
            if (inputBufferRef.current.length > 0) {
              inputBufferRef.current = inputBufferRef.current.slice(0, -1);
              term.write('\b \b');
            }
          } else {
            inputBufferRef.current += data;
            term.write(data);
          }
        });

        const handleResize = () => {
          try {
            fitAddon.fit();
          } catch (e) {}
        };
        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
        };
      } catch (err) {
        console.error('Failed to initialize XTerm:', err);
      }
    };

    initTerminal();

    return () => {
      if (termInstanceRef.current) {
        termInstanceRef.current.dispose();
      }
    };
  }, []);

  // Update terminal when stdout or stderr changes
  useEffect(() => {
    const term = termInstanceRef.current;
    if (!term) return;

    term.clear();
    term.writeln('\x1b[1;36mCodeForge Interactive Terminal v1.0.0\x1b[0m');
    term.writeln('\x1b[90mPowered by XTerm.js — Real-Time Stdin/Stdout Stream\x1b[0m');
    term.writeln('');

    if (isRunning) {
      term.writeln('\x1b[33m⚡ Compiling & executing process...\x1b[0m');
    }

    if (stderr) {
      const formattedErr = stderr.replace(/\n/g, '\r\n');
      term.writeln(`\x1b[31m${formattedErr}\x1b[0m`);
    }

    if (stdout) {
      const formattedOut = stdout.replace(/\n/g, '\r\n');
      term.write(formattedOut);
    }
  }, [stdout, stderr, isRunning]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0F172A] border border-[#334155] rounded-lg overflow-hidden p-2">
      <div ref={terminalRef} className="flex-1 min-h-0 w-full" />
    </div>
  );
}
