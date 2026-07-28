import { exec } from 'child_process';
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
        // ----------------------------------------------------
        // PHASE 1: COMPILE STEP (If language requires compilation)
        // ----------------------------------------------------
        if (config.compileCmd || config.winCompileCmd) {
            const compileStart = process.hrtime();

            await new Promise<void>((resolve, reject) => {
                if (config.useWslFirst) {
                    // Method A: Run via WSL (Ubuntu GCC 15 / g++20 / mcpc)
                    const wslCompileCmd = `wsl sh -c "cd '${wslSessionDir}' && ${config.compileCmd}"`;
                    exec(wslCompileCmd, (wslErr, stdout, stderr) => {
                        if (!wslErr) {
                            return resolve();
                        }
                        // Fallback to Native Windows CLI if WSL compile failed
                        if (isWindows && config.winCompileCmd) {
                            exec(config.winCompileCmd, { cwd: sessionDir }, (winErr, winStdout, winStderr) => {
                                if (winErr) {
                                    reject({
                                        message: 'Compilation Failed',
                                        stdout: winStdout || stdout,
                                        stderr: winStderr || stderr || winErr.message,
                                        exitCode: winErr.code || 1
                                    });
                                } else {
                                    resolve();
                                }
                            });
                        } else {
                            reject({
                                message: 'Compilation Failed',
                                stdout,
                                stderr,
                                exitCode: wslErr.code || 1
                            });
                        }
                    });
                } else {
                    // Method B: Native Windows Compile First (Java / Rust / C++)
                    const winCompileCmd = config.winCompileCmd || config.compileCmd || '';
                    exec(winCompileCmd, { cwd: sessionDir }, (winErr, stdout, stderr) => {
                        if (!winErr) {
                            return resolve();
                        }
                        // Fallback to WSL if Native compile failed
                        if (config.compileCmd) {
                            const wslCompileCmd = `wsl sh -c "cd '${wslSessionDir}' && ${config.compileCmd}"`;
                            exec(wslCompileCmd, (wslErr, wslStdout, wslStderr) => {
                                if (wslErr) {
                                    reject({
                                        message: 'Compilation Failed',
                                        stdout: wslStdout || stdout,
                                        stderr: wslStderr || stderr || wslErr.message,
                                        exitCode: wslErr.code || 1
                                    });
                                } else {
                                    resolve();
                                }
                            });
                        } else {
                            reject({
                                message: 'Compilation Failed',
                                stdout,
                                stderr,
                                exitCode: winErr.code || 1
                            });
                        }
                    });
                }
            });

            const compileDiff = process.hrtime(compileStart);
            compileTime = Math.round((compileDiff[0] * 1000) + (compileDiff[1] / 1000000));
        }

        // ----------------------------------------------------
        // PHASE 2: RUN / EXECUTE STEP
        // ----------------------------------------------------
        const execStart = process.hrtime();

        const runResult = await new Promise<RunResult>((resolve) => {
            if (config.useWslFirst) {
                // Execute via WSL with input piping
                const wslRunCmd = `wsl sh -c "cd '${wslSessionDir}' && ${config.runCmd} < input.txt"`;
                exec(wslRunCmd, { timeout: 8000 }, (wslErr, stdout, stderr) => {
                    if (!wslErr) {
                        const execDiff = process.hrtime(execStart);
                        const executionTime = Math.round((execDiff[0] * 1000) + (execDiff[1] / 1000000));
                        return resolve({
                            success: true,
                            stdout,
                            stderr,
                            compileTime,
                            executionTime,
                            exitCode: 0
                        });
                    }

                    // Native Windows Fallback Execution
                    if (isWindows && config.winRunCmd) {
                        const winRunCmd = `type input.txt | ${config.winRunCmd}`;
                        exec(winRunCmd, { cwd: sessionDir, timeout: 8000 }, (winErr, winStdout, winStderr) => {
                            const execDiff = process.hrtime(execStart);
                            const executionTime = Math.round((execDiff[0] * 1000) + (execDiff[1] / 1000000));
                            const exitCode = winErr ? winErr.code || null : 0;
                            const isTimedOut = winErr && winErr.killed;

                            resolve({
                                success: exitCode === 0,
                                stdout: winStdout,
                                stderr: isTimedOut ? 'Execution Timed Out (Limit: 8 seconds)' : winStderr,
                                compileTime,
                                executionTime,
                                exitCode
                            });
                        });
                    } else {
                        const execDiff = process.hrtime(execStart);
                        const executionTime = Math.round((execDiff[0] * 1000) + (execDiff[1] / 1000000));
                        resolve({
                            success: false,
                            stdout,
                            stderr: wslErr.killed ? 'Execution Timed Out (Limit: 8 seconds)' : stderr,
                            compileTime,
                            executionTime,
                            exitCode: wslErr.code || 1
                        });
                    }
                });
            } else {
                // Execute Native Windows Process First (Python, Node.js, Java, Go, Rust)
                const winRunCmd = isWindows && config.winRunCmd ? `type input.txt | ${config.winRunCmd}` : `${config.runCmd} < input.txt`;
                exec(winRunCmd, { cwd: sessionDir, timeout: 8000 }, (winErr, winStdout, winStderr) => {
                    if (!winErr) {
                        const execDiff = process.hrtime(execStart);
                        const executionTime = Math.round((execDiff[0] * 1000) + (execDiff[1] / 1000000));
                        return resolve({
                            success: true,
                            stdout: winStdout,
                            stderr: winStderr,
                            compileTime,
                            executionTime,
                            exitCode: 0
                        });
                    }

                    // WSL Fallback Execution
                    const wslRunCmd = `wsl sh -c "cd '${wslSessionDir}' && ${config.runCmd} < input.txt"`;
                    exec(wslRunCmd, { timeout: 8000 }, (wslErr, wslStdout, wslStderr) => {
                        const execDiff = process.hrtime(execStart);
                        const executionTime = Math.round((execDiff[0] * 1000) + (execDiff[1] / 1000000));
                        const exitCode = wslErr ? wslErr.code || null : 0;
                        const isTimedOut = wslErr && wslErr.killed;

                        resolve({
                            success: exitCode === 0,
                            stdout: wslStdout || winStdout,
                            stderr: isTimedOut ? 'Execution Timed Out (Limit: 8 seconds)' : (wslStderr || winStderr),
                            compileTime,
                            executionTime,
                            exitCode
                        });
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
