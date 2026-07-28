import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { LANGUAGE_CONFIGS } from '../compiler/compile';

export function spawnInteractive(
    language: string,
    sessionDir: string,
    wslSessionDir: string
): ChildProcessWithoutNullStreams {
    const config = LANGUAGE_CONFIGS[language.toLowerCase()];
    if (!config) throw new Error(`Unsupported language: ${language}`);
    const isWindows = process.platform === 'win32';

    if (config.useWslFirst) {
        // Run via WSL with interactive stdin stream explicitly piped
        const runCmd = config.runCmd;
        return spawn('wsl', ['sh', '-c', `cd '${wslSessionDir}' && ${runCmd}`], {
            cwd: sessionDir,
            env: process.env,
            stdio: ['pipe', 'pipe', 'pipe'],
            windowsHide: true
        }) as ChildProcessWithoutNullStreams;
    } else {
        // Run natively on Windows
        const winRunCmd = isWindows && config.winRunCmd ? config.winRunCmd : config.runCmd;
        // Handle multi-word commands like "python main.py", "node main.js"
        const parts = winRunCmd.split(' ');
        const cmd = parts[0];
        const args = parts.slice(1);
        return spawn(cmd, args, {
            cwd: sessionDir,
            env: process.env,
            stdio: ['pipe', 'pipe', 'pipe'],
            windowsHide: true
        }) as ChildProcessWithoutNullStreams;
    }
}
