import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

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

export const TEMP_DIR = path.join(__dirname, '..', 'temp');

export function generateSessionId(): string {
    return Math.random().toString(36).substring(2, 12);
}

// Convert Windows path (C:\Users\...) to WSL path (/mnt/c/Users/...)
export function toWslPath(winPath: string): string {
    const normalized = path.resolve(winPath).replace(/\\/g, '/');
    if (normalized.match(/^[a-zA-Z]:/)) {
        const drive = normalized[0].toLowerCase();
        return `/mnt/${drive}${normalized.substring(2)}`;
    }
    return normalized;
}

export interface CompileResult {
    sessionDir: string;
    wslSessionDir: string;
    binaryName: string;
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
