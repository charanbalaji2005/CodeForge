import { Server as SocketIOServer } from 'socket.io';
import { ProcessManager } from '../process/ProcessManager';
import { compileOnly } from '../compiler/compile';
import { spawnInteractive } from '../process/InteractiveRunner';
import { cleanUpSessionDir } from '../runner'; // Import cleanUpSessionDir utility

export function registerTerminalSocket(io: SocketIOServer) {
  const pm = new ProcessManager();

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // ── Event: "compile" ──────────────────────────────────────
    socket.on('compile', async (data: { language: string; code: string }) => {
      const { language, code } = data;

      // Kill any existing running process for this socket
      const existing = pm.kill(socket.id);
      if (existing) {
        cleanUpSessionDir(existing.sessionDir);
      }

      socket.emit('terminal-output', `\x1b[33m⚡ Compiling ${language.toUpperCase()}...\x1b[0m\r\n`);

      try {
        // Step 1: Compile code to binary
        const compiled = await compileOnly(language, code);

        if (compiled.stderr && compiled.stderr.trim()) {
          socket.emit('terminal-output', `\x1b[33mCompiler warnings:\x1b[0m\r\n${compiled.stderr}\r\n`);
        }
        socket.emit('terminal-output', `\x1b[32m✅ Compiled in ${compiled.compileTime}ms. Starting process...\x1b[0m\r\n\r\n`);

        // Step 2: Spawn interactive child process
        const child = spawnInteractive(language, compiled.sessionDir, compiled.wslSessionDir);

        pm.create(socket.id, child, compiled.sessionDir);

        // Stream standard output
        child.stdout.on('data', (chunk: Buffer) => {
          const text = chunk.toString().replace(/\n/g, '\r\n');
          socket.emit('terminal-output', text);
        });

        // Stream standard error
        child.stderr.on('data', (chunk: Buffer) => {
          const text = chunk.toString().replace(/\n/g, '\r\n');
          socket.emit('terminal-output', `\x1b[31m${text}\x1b[0m`);
        });

        // Child process exits
        child.on('close', (code) => {
          pm.kill(socket.id);
          cleanUpSessionDir(compiled.sessionDir);
          const exitMsg = code === 0
            ? `\r\n\x1b[32m[Process exited with code ${code}]\x1b[0m\r\n`
            : `\r\n\x1b[31m[Process exited with code ${code}]\x1b[0m\r\n`;
          socket.emit('terminal-output', exitMsg);
          socket.emit('terminal-exit', { code });
        });

        child.on('error', (err) => {
          socket.emit('terminal-output', `\r\n\x1b[31m[Process error: ${err.message}]\x1b[0m\r\n`);
          socket.emit('terminal-exit', { code: 1 });
          pm.kill(socket.id);
        });

        console.log(`[Socket.IO] Process spawned for socket ${socket.id} [${language}]`);

      } catch (err: any) {
        const errMsg = err.stderr || err.message || 'Compilation failed';
        socket.emit('terminal-output', `\x1b[31m❌ Compilation Error:\x1b[0m\r\n${errMsg.replace(/\n/g, '\r\n')}\r\n`);
        socket.emit('terminal-exit', { code: 1 });
        console.error(`[Socket.IO] Compile error for socket ${socket.id}:`, errMsg);
      }
    });

    // ── Event: "terminal-input" ───────────────────────────────
    socket.on('terminal-input', (data: string) => {
      const running = pm.get(socket.id);
      if (running && running.process.stdin && !running.process.stdin.destroyed) {
        try {
          // Normalize carriage returns (\r or \r\n) to newline (\n) for Linux/WSL execution
          const normalized = data.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
          running.process.stdin.write(normalized);
        } catch (err) {
          console.error(`[Socket.IO] Failed to write stdin for socket ${socket.id}:`, err);
        }
      }
    });

    // ── Event: "terminal-kill" ────────────────────────────────
    socket.on('terminal-kill', () => {
      const running = pm.kill(socket.id);
      if (running) {
        cleanUpSessionDir(running.sessionDir);
        socket.emit('terminal-output', '\r\n\x1b[31m[Process killed by user]\x1b[0m\r\n');
        socket.emit('terminal-exit', { code: -1 });
      }
    });

    // ── Cleanup on Client Disconnect ─────────────────────────
    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
      const running = pm.kill(socket.id);
      if (running) {
        cleanUpSessionDir(running.sessionDir);
      }
    });
  });
}
