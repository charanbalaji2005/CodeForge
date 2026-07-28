import { exec, spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface RunResult {
    success: boolean;
    stdout: string;
    stderr: string;
    compileTime?: number;
    executionTime: number;
    exitCode: number | null;
}

export interface LanguageConfig {
    name: string;
    fileName: string;
    compileCmd?: string;
    runCmd: string;
    winCompileCmd?: string;
    winRunCmd?: string;
    useWslFirst?: boolean;
}

export const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
    c: {
        name: 'C',
        fileName: 'main.c',
        compileCmd: 'gcc -O2 -std=c17 main.c -o main',
        runCmd: './main',
        winCompileCmd: 'gcc -O2 main.c -o main.exe',
        winRunCmd: 'main.exe',
        useWslFirst: true
    },
    cpp: {
        name: 'C++',
        fileName: 'main.cpp',
        compileCmd: 'g++ -std=c++20 -O2 main.cpp -o main',
        runCmd: './main',
        winCompileCmd: 'g++ -O2 main.cpp -o main.exe',
        winRunCmd: 'main.exe',
        useWslFirst: true
    },
    python: {
        name: 'Python 3',
        fileName: 'main.py',
        runCmd: 'python3 main.py',
        winRunCmd: 'python main.py',
        useWslFirst: false
    },
    javascript: {
        name: 'JavaScript (Node.js)',
        fileName: 'main.js',
        runCmd: 'node main.js',
        winRunCmd: 'node main.js',
        useWslFirst: false
    },
    java: {
        name: 'Java 17',
        fileName: 'Main.java',
        compileCmd: 'javac Main.java',
        runCmd: 'java Main',
        winCompileCmd: 'javac Main.java',
        winRunCmd: 'java Main',
        useWslFirst: false
    },
    go: {
        name: 'Go (Golang)',
        fileName: 'main.go',
        runCmd: 'go run main.go',
        winRunCmd: 'go run main.go',
        useWslFirst: false
    },
    rust: {
        name: 'Rust (rustc)',
        fileName: 'main.rs',
        compileCmd: 'rustc main.rs -o main',
        runCmd: './main',
        winCompileCmd: 'rustc main.rs -o main.exe',
        winRunCmd: 'main.exe',
        useWslFirst: false
    },
    mcpp: {
        name: 'MiniCPP (mcpc)',
        fileName: 'main.mcpp',
        compileCmd: '../../../../build/mcpc main.mcpp -o main',
        runCmd: './main',
        winCompileCmd: '..\\..\\..\\..\\build\\mcpc.exe main.mcpp -o main.exe',
        winRunCmd: 'main.exe',
        useWslFirst: true
    }
};

const TEMP_DIR = path.join(__dirname, '..', 'temp');

function generateSessionId(): string {
    return Math.random().toString(36).substring(2, 12);
}

// Convert Windows path (C:\Users\...) to WSL path (/mnt/c/Users/...)
function toWslPath(winPath: string): string {
    const normalized = path.resolve(winPath).replace(/\\/g, '/');
    if (normalized.match(/^[a-zA-Z]:/)) {
        const drive = normalized[0].toLowerCase();
        return `/mnt/${drive}${normalized.substring(2)}`;
    }
    return normalized;
}

// ----------------------------------------------------------------
// compileOnly(): Compile code, return {sessionDir, binaryName, wslSessionDir}
// Used by the interactive terminal flow (Socket.IO)
// ----------------------------------------------------------------
export interface CompileResult {
    sessionDir: string;
    wslSessionDir: string;
    binaryName: string;   // e.g. "main.exe" or "main"
    compileTime: number;
    stderr: string;
}

export async function compileOnly(language: string, code: string): Promise<CompileResult> {
    const config = LANGUAGE_CONFIGS[language.toLowerCase()];
    if (!config) throw new Error(`Unsupported language: ${language}`);

    const sessionId = generateSessionId();
    const sessionDir = path.join(TEMP_DIR, sessionId);

    if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
    fs.mkdirSync(sessionDir, { recursive: true });

    const sourcePath = path.join(sessionDir, config.fileName);
    fs.writeFileSync(sourcePath, code, 'utf8');

    const wslSessionDir = toWslPath(sessionDir);
    const isWindows = process.platform === 'win32';
    let compileTime = 0;
    let compiledStderr = '';

    // Languages without a compile step (Python, JS, Go interpreted)
    if (!config.compileCmd && !config.winCompileCmd) {
        return { sessionDir, wslSessionDir, binaryName: config.winRunCmd || config.runCmd, compileTime: 0, stderr: '' };
    }

    const compileStart = process.hrtime();

    await new Promise<void>((resolve, reject) => {
        if (config.useWslFirst) {
            const wslCompileCmd = `wsl sh -c "cd '${wslSessionDir}' && ${config.compileCmd}"`;
            exec(wslCompileCmd, (wslErr, _stdout, stderr) => {
                compiledStderr = stderr;
                if (!wslErr) return resolve();
                // Fallback to native Windows compiler
                if (isWindows && config.winCompileCmd) {
                    exec(config.winCompileCmd!, { cwd: sessionDir }, (winErr, _ws, winStderr) => {
                        compiledStderr = winStderr || stderr;
                        if (winErr) reject({ message: 'Compilation Failed', stderr: winStderr || stderr, exitCode: winErr.code || 1 });
                        else resolve();
                    });
                } else {
                    reject({ message: 'Compilation Failed', stderr, exitCode: wslErr.code || 1 });
                }
            });
        } else {
            const winCompileCmd = config.winCompileCmd || config.compileCmd || '';
            exec(winCompileCmd, { cwd: sessionDir }, (winErr, _ws, winStderr) => {
                compiledStderr = winStderr;
                if (!winErr) return resolve();
                if (config.compileCmd) {
                    const wslCompileCmd = `wsl sh -c "cd '${wslSessionDir}' && ${config.compileCmd}"`;
                    exec(wslCompileCmd, (wslErr, _wss, wslStderr) => {
                        compiledStderr = wslStderr || winStderr;
                        if (wslErr) reject({ message: 'Compilation Failed', stderr: wslStderr || winStderr, exitCode: wslErr.code || 1 });
                        else resolve();
                    });
                } else {
                    reject({ message: 'Compilation Failed', stderr: winStderr, exitCode: winErr.code || 1 });
                }
            });
        }
    });

    const compileDiff = process.hrtime(compileStart);
    compileTime = Math.round((compileDiff[0] * 1000) + (compileDiff[1] / 1000000));

    // Determine binary name
    const isWsl = config.useWslFirst;
    const binaryName = isWsl
        ? (isWindows ? (config.winRunCmd || 'main.exe') : (config.runCmd || './main'))
        : (isWindows ? (config.winRunCmd || config.runCmd) : (config.runCmd));

    return { sessionDir, wslSessionDir, binaryName, compileTime, stderr: compiledStderr };
}

// ----------------------------------------------------------------
// spawnInteractive(): Spawn the compiled/interpreted process with
// open stdin/stdout pipes for interactive terminal streaming.
// Returns the ChildProcess so caller can stream input/output.
// ----------------------------------------------------------------
export function spawnInteractive(
    language: string,
    sessionDir: string,
    wslSessionDir: string
): ChildProcessWithoutNullStreams {
    const config = LANGUAGE_CONFIGS[language.toLowerCase()];
    const isWindows = process.platform === 'win32';

    if (config.useWslFirst) {
        // Run via WSL with interactive stdin (no < input.txt redirection)
        const runCmd = config.runCmd;
        const wslCmd = `wsl sh -c "cd '${wslSessionDir}' && ${runCmd}"`;
        return spawn('cmd', ['/c', wslCmd], {
            cwd: sessionDir,
            env: process.env,
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
            windowsHide: true
        }) as ChildProcessWithoutNullStreams;
    }
}

// ----------------------------------------------------------------
// runCode(): Original HTTP batch execution (kept for non-socket fallback / Standard Console mode)
// ----------------------------------------------------------------
export async function runCode(language: string, code: string, stdin: string): Promise<RunResult> {
    const config = LANGUAGE_CONFIGS[language.toLowerCase()];
    if (!config) {
        throw new Error(`Unsupported language: ${language}`);
    }

    const sessionId = generateSessionId();
    const sessionDir = path.join(TEMP_DIR, sessionId);
    
    if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
    fs.mkdirSync(sessionDir, { recursive: true });

    const sourcePath = path.join(sessionDir, config.fileName);
    const stdinPath = path.join(sessionDir, 'input.txt');

    fs.writeFileSync(sourcePath, code, 'utf8');
    fs.writeFileSync(stdinPath, stdin || '', 'utf8');

    const wslSessionDir = toWslPath(sessionDir);
    let compileTime = 0;
    const isWindows = process.platform === 'win32';

    try {
        // PHASE 1: COMPILE STEP
        if (config.compileCmd || config.winCompileCmd) {
            const compileStart = process.hrtime();

            await new Promise<void>((resolve, reject) => {
                if (config.useWslFirst) {
                    const wslCompileCmd = `wsl sh -c "cd '${wslSessionDir}' && ${config.compileCmd}"`;
                    exec(wslCompileCmd, (wslErr, stdout, stderr) => {
                        if (!wslErr) return resolve();
                        if (isWindows && config.winCompileCmd) {
                            exec(config.winCompileCmd!, { cwd: sessionDir }, (winErr, winStdout, winStderr) => {
                                if (winErr) reject({ message: 'Compilation Failed', stdout: winStdout || stdout, stderr: winStderr || stderr || winErr.message, exitCode: winErr.code || 1 });
                                else resolve();
                            });
                        } else {
                            reject({ message: 'Compilation Failed', stdout, stderr, exitCode: wslErr.code || 1 });
                        }
                    });
                } else {
                    const winCompileCmd = config.winCompileCmd || config.compileCmd || '';
                    exec(winCompileCmd, { cwd: sessionDir }, (winErr, stdout, stderr) => {
                        if (!winErr) return resolve();
                        if (config.compileCmd) {
                            const wslCompileCmd = `wsl sh -c "cd '${wslSessionDir}' && ${config.compileCmd}"`;
                            exec(wslCompileCmd, (wslErr, wslStdout, wslStderr) => {
                                if (wslErr) reject({ message: 'Compilation Failed', stdout: wslStdout || stdout, stderr: wslStderr || stderr || wslErr.message, exitCode: wslErr.code || 1 });
                                else resolve();
                            });
                        } else {
                            reject({ message: 'Compilation Failed', stdout, stderr, exitCode: winErr.code || 1 });
                        }
                    });
                }
            });

            const compileDiff = process.hrtime(compileStart);
            compileTime = Math.round((compileDiff[0] * 1000) + (compileDiff[1] / 1000000));
        }

        // PHASE 2: RUN / EXECUTE STEP
        const execStart = process.hrtime();

        const runResult = await new Promise<RunResult>((resolve) => {
            if (config.useWslFirst) {
                const wslRunCmd = `wsl sh -c "cd '${wslSessionDir}' && ${config.runCmd} < input.txt"`;
                exec(wslRunCmd, { timeout: 8000 }, (wslErr, stdout, stderr) => {
                    if (!wslErr) {
                        const execDiff = process.hrtime(execStart);
                        return resolve({ success: true, stdout, stderr, compileTime, executionTime: Math.round((execDiff[0] * 1000) + (execDiff[1] / 1000000)), exitCode: 0 });
                    }
                    if (isWindows && config.winRunCmd) {
                        const winRunCmd = `type input.txt | ${config.winRunCmd}`;
                        exec(winRunCmd, { cwd: sessionDir, timeout: 8000 }, (winErr, winStdout, winStderr) => {
                            const execDiff = process.hrtime(execStart);
                            const exitCode = winErr ? winErr.code || null : 0;
                            resolve({ success: exitCode === 0, stdout: winStdout, stderr: winErr?.killed ? 'Execution Timed Out (Limit: 8 seconds)' : winStderr, compileTime, executionTime: Math.round((execDiff[0] * 1000) + (execDiff[1] / 1000000)), exitCode });
                        });
                    } else {
                        const execDiff = process.hrtime(execStart);
                        resolve({ success: false, stdout, stderr: wslErr.killed ? 'Execution Timed Out (Limit: 8 seconds)' : stderr, compileTime, executionTime: Math.round((execDiff[0] * 1000) + (execDiff[1] / 1000000)), exitCode: wslErr.code || 1 });
                    }
                });
            } else {
                const winRunCmd = isWindows && config.winRunCmd ? `type input.txt | ${config.winRunCmd}` : `${config.runCmd} < input.txt`;
                exec(winRunCmd, { cwd: sessionDir, timeout: 8000 }, (winErr, winStdout, winStderr) => {
                    if (!winErr) {
                        const execDiff = process.hrtime(execStart);
                        return resolve({ success: true, stdout: winStdout, stderr: winStderr, compileTime, executionTime: Math.round((execDiff[0] * 1000) + (execDiff[1] / 1000000)), exitCode: 0 });
                    }
                    const wslRunCmd = `wsl sh -c "cd '${wslSessionDir}' && ${config.runCmd} < input.txt"`;
                    exec(wslRunCmd, { timeout: 8000 }, (wslErr, wslStdout, wslStderr) => {
                        const execDiff = process.hrtime(execStart);
                        const exitCode = wslErr ? wslErr.code || null : 0;
                        resolve({ success: exitCode === 0, stdout: wslStdout || winStdout, stderr: wslErr?.killed ? 'Execution Timed Out (Limit: 8 seconds)' : (wslStderr || winStderr), compileTime, executionTime: Math.round((execDiff[0] * 1000) + (execDiff[1] / 1000000)), exitCode });
                    });
                });
            }
        });

        cleanUpSessionDir(sessionDir);
        return runResult;

    } catch (err: any) {
        cleanUpSessionDir(sessionDir);
        return {
            success: false,
            stdout: err.stdout || '',
            stderr: err.stderr || err.message || 'Unknown execution error',
            compileTime,
            executionTime: 0,
            exitCode: err.exitCode || 1
        };
    }
}

function cleanUpSessionDir(dirPath: string) {
    try {
        if (fs.existsSync(dirPath)) {
            const files = fs.readdirSync(dirPath);
            for (const file of files) {
                fs.unlinkSync(path.join(dirPath, file));
            }
            fs.rmdirSync(dirPath);
        }
    } catch (e) {
        console.error('Failed to clean up session directory:', dirPath, e);
    }
}

export { cleanUpSessionDir };
