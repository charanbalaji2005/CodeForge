"use client";

import React, { useEffect, useRef, useCallback } from 'react';
import type { Socket } from 'socket.io-client';

interface XTermTerminalProps {
  socket: Socket | null;
  isRunning: boolean;
  onExited: () => void;
  cursorBlink?: boolean;
  fontSize?: number;
}

export default function XTermTerminal({
  socket,
  isRunning,
  onExited,
  cursorBlink = true,
  fontSize = 13
}: XTermTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termInstanceRef = useRef<any>(null);
  const fitAddonRef = useRef<any>(null);
  const lineBufferRef = useRef<string>(''); // Keep buffer in ref to prevent stale closures

  // Initialize XTerm.js terminal once
  useEffect(() => {
    let term: any;
    let fitAddon: any;
    let cleanupFn: (() => void) | undefined;

    const initTerminal = async () => {
      try {
        const { Terminal } = await import('@xterm/xterm');
        const { FitAddon } = await import('@xterm/addon-fit');
        await import('@xterm/xterm/css/xterm.css');

        if (!terminalRef.current) return;
        terminalRef.current.innerHTML = '';

        term = new Terminal({
          cursorBlink,
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          fontSize,
          theme: {
            background: '#0F172A',
            foreground: '#F8FAFC',
            cursor: '#F97316',
            cursorAccent: '#0F172A',
            selectionBackground: '#334155',
            black: '#1E293B',
            red: '#F87171',
            green: '#4ADE80',
            yellow: '#FBBF24',
            blue: '#60A5FA',
            magenta: '#C084FC',
            cyan: '#22D3EE',
            white: '#F1F5F9',
            brightBlack: '#475569',
            brightRed: '#FCA5A5',
            brightGreen: '#86EFAC',
            brightYellow: '#FDE68A',
            brightBlue: '#93C5FD',
            brightMagenta: '#D8B4FE',
            brightCyan: '#67E8F9',
            brightWhite: '#FFFFFF'
          }
        });

        fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(terminalRef.current);
        fitAddon.fit();

        termInstanceRef.current = term;
        fitAddonRef.current = fitAddon;

        // Welcome banner
        term.writeln('\x1b[1;36mCodeForge Interactive Terminal v2.1\x1b[0m');
        term.writeln('\x1b[90mPowered by XTerm.js + Socket.IO — Stateful Stdin/Stdout Engine\x1b[0m');
        term.writeln('');

        // Handle keystrokes using smart line-buffering & backspace echo
        term.onData((data: string) => {
          if (data === '\r') {
            term.write('\r\n');
            if (socket && socket.connected) {
              socket.emit('terminal-input', lineBufferRef.current + '\n');
            }
            lineBufferRef.current = '';
          } else if (data === '\x7f' || data === '\b') {
            if (lineBufferRef.current.length > 0) {
              lineBufferRef.current = lineBufferRef.current.slice(0, -1);
              term.write('\b \b'); // Erase last character visually on screen
            }
          } else {
            // Echo character on screen and add to line buffer
            term.write(data);
            lineBufferRef.current += data;
          }
        });

        const handleResize = () => {
          try { fitAddon.fit(); } catch (e) {}
        };
        window.addEventListener('resize', handleResize);

        cleanupFn = () => {
          window.removeEventListener('resize', handleResize);
        };
      } catch (err) {
        console.error('Failed to initialize XTerm:', err);
      }
    };

    initTerminal();

    return () => {
      cleanupFn?.();
      if (termInstanceRef.current) {
        termInstanceRef.current.dispose();
        termInstanceRef.current = null;
      }
    };
  }, [socket]); // Re-bind onData if socket client changes

  // When cursorBlink or fontSize changes, update options on existing terminal
  useEffect(() => {
    const term = termInstanceRef.current;
    if (!term) return;
    term.options.cursorBlink = cursorBlink;
    term.options.fontSize = fontSize;
    try { fitAddonRef.current?.fit(); } catch (_) {}
  }, [cursorBlink, fontSize]);

  // Handle socket events: terminal-output and terminal-exit
  useEffect(() => {
    if (!socket) return;

    const handleOutput = (data: string) => {
      const term = termInstanceRef.current;
      if (term) term.write(data);
    };

    const handleExit = ({ code }: { code: number }) => {
      onExited();
    };

    socket.on('terminal-output', handleOutput);
    socket.on('terminal-exit', handleExit);

    return () => {
      socket.off('terminal-output', handleOutput);
      socket.off('terminal-exit', handleExit);
    };
  }, [socket, onExited]);

  // Expose a clear function via a stable ref for the parent
  const clearTerminal = useCallback(() => {
    const term = termInstanceRef.current;
    if (term) {
      term.clear();
      term.writeln('\x1b[1;36mCodeForge Interactive Terminal v2.1\x1b[0m');
      term.writeln('\x1b[90mPowered by XTerm.js + Socket.IO — Stateful Stdin/Stdout Engine\x1b[0m');
      term.writeln('');
      lineBufferRef.current = '';
    }
  }, []);

  // Expose clearTerminal via DOM ref for parent to call
  useEffect(() => {
    if (terminalRef.current) {
      (terminalRef.current as any).__clearTerminal = clearTerminal;
    }
  }, [clearTerminal]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0F172A] border border-[#1E3A5F] rounded-lg overflow-hidden">
      <div ref={terminalRef} className="flex-1 min-h-0 w-full p-1" />
    </div>
  );
}
