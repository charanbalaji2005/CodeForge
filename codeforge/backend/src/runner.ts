import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { LANGUAGE_CONFIGS, toWslPath, generateSessionId, TEMP_DIR } from './compiler/compile';

export interface RunResult {
    success: boolean;
    stdout: string;
    stderr: string;
    compileTime?: number;
    executionTime: number;
    exitCode: number | null;
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

export function cleanUpSessionDir(dirPath: string) {
    // Perform cleanup with a slight delay (1s) to allow the OS and WSL vm to release file locks.
    setTimeout(() => {
        try {
            if (fs.existsSync(dirPath)) {
                const files = fs.readdirSync(dirPath);
                for (const file of files) {
                    try {
                        fs.unlinkSync(path.join(dirPath, file));
                    } catch (_) {}
                }
                try {
                    fs.rmdirSync(dirPath);
                } catch (_) {}
            }
        } catch (e) {
            console.error('Failed to clean up session directory:', dirPath, e);
        }
    }, 1000);
}
