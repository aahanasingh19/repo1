import Docker from "dockerode";
import { Readable } from "stream";
import decodeDockerStream from "./decodeStream";

/**
 * Language-specific configuration for container execution.
 * Using strategy/config pattern instead of separate runner classes.
 */
interface LanguageConfig {
  image: string;
  sourceFile: string;
  compileCmd?: string;
  runCmd: string;
  timeoutMs: number;
}

const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  python: {
    image: "python:3.8-slim",
    sourceFile: "solution.py",
    runCmd: "python3 /workspace/solution.py",
    timeoutMs: 5000,
  },
  java: {
    image: "openjdk:11-jdk-slim",
    sourceFile: "Main.java",
    compileCmd: "javac -d /workspace /workspace/Main.java",
    runCmd: "java -cp /workspace Main",
    timeoutMs: 10000,
  },
  cpp: {
    image: "gcc:latest",
    sourceFile: "main.cpp",
    compileCmd: "g++ /workspace/main.cpp -o /workspace/main",
    runCmd: "/workspace/main",
    timeoutMs: 5000,
  },
};

export interface TestCase {
  input: string;
  output: string;
}

export interface TestCaseResult {
  input: string;
  expected: string;
  actual: string;
  status: string;
}

export interface ExecutionResult {
  overallStatus: string;
  results: TestCaseResult[];
  metrics?: {
    startTime: string;
    endTime: string;
    memoryUsageBytes: number;
    exitCode: number;
  };
}

/**
 * Unified code execution engine.
 *
 * Security model:
 * - NO user input is ever interpolated into shell commands (prevents RCE)
 * - Code is written to containers via Docker putArchive API (tar format)
 * - Test input is piped through stdin (data channel, not command channel)
 * - Containers run with network isolation, memory/CPU/PID limits, and readonly rootfs
 *
 * Performance:
 * - ONE container per submission (not per test case)
 * - All test cases execute sequentially inside the same container
 * - Images are cached locally to avoid repeated pulls
 */
class CodeRunner {
  private docker: Docker;

  constructor() {
    this.docker = new Docker();
  }

  async execute(
    code: string,
    language: string,
    testCases: TestCase[]
  ): Promise<ExecutionResult> {
    const config = LANGUAGE_CONFIGS[language.toLowerCase()];
    if (!config) {
      return {
        overallStatus: "RE",
        results: testCases.map((tc) => ({
          input: tc.input,
          expected: tc.output,
          actual: `Unsupported language: ${language}`,
          status: "RE",
        })),
      };
    }

    let container: Docker.Container | undefined;
    let mainTimer: NodeJS.Timeout | undefined;
    const results: TestCaseResult[] = [];
    const startTime = new Date().toISOString();
    let maxExitCode = 0;
    let memoryUsageBytes = 0;

    try {
      await this.ensureImage(config.image);

      container = await this.createSecureContainer(config.image);
      await container.start();

      mainTimer = setTimeout(async () => {
        if (container) {
          await container.kill().catch(() => {});
        }
      }, 10000);

      // Write user code via putArchive (zero shell injection surface)
      await this.writeCodeToContainer(
        container,
        config.sourceFile,
        code
      );

      // Compile step (hardcoded command, no user input in args)
      if (config.compileCmd) {
        const compileOut = await this.execInContainer(
          container,
          ["/bin/sh", "-c", config.compileCmd],
          "",
          30000
        );

        if (compileOut.stderr) {
          return {
            overallStatus: "RE",
            results: testCases.map((tc) => ({
              input: tc.input,
              expected: tc.output,
              actual: compileOut.stderr.trim(),
              status: "RE",
            })),
          };
        }
        maxExitCode = Math.max(maxExitCode, compileOut.exitCode || 0);
      }

      // Run each test case inside the same container
      for (const testCase of testCases) {
        try {
          const runOut = await this.execInContainer(
            container,
            ["/bin/sh", "-c", config.runCmd],
            testCase.input,
            config.timeoutMs
          );

          maxExitCode = Math.max(maxExitCode, runOut.exitCode || 0);

          if (runOut.stderr) {
            results.push({
              input: testCase.input,
              expected: testCase.output,
              actual: runOut.stderr.trim(),
              status: "RE",
            });
          } else if (runOut.stdout.trim() === testCase.output.trim()) {
            results.push({
              input: testCase.input,
              expected: testCase.output,
              actual: runOut.stdout.trim(),
              status: "SUCCESS",
            });
          } else {
            results.push({
              input: testCase.input,
              expected: testCase.output,
              actual: runOut.stdout.trim(),
              status: "WA",
            });
          }
        } catch (execErr) {
          const msg = execErr instanceof Error ? execErr.message : "Unknown error";
          let status = "RE";
          if (msg === "TLE") status = "TLE";
          else if (msg.includes("OOMKilled")) status = "MLE";

          results.push({
            input: testCase.input,
            expected: testCase.output,
            actual: status === "TLE" ? "Time Limit Exceeded" : msg,
            status,
          });

          // Critical: Abort further execution if container is misbehaving
          if (status === "TLE" || status === "MLE") throw new Error(status);
        }
      }

      const allPassed = results.every((r) => r.status === "SUCCESS");
      const overallStatus = allPassed
        ? "SUCCESS"
        : results.find((r) => r.status !== "SUCCESS")?.status || "UNKNOWN";

      try {
        if (container) {
          const stats: any = await container.stats({ stream: false });
          memoryUsageBytes = stats?.memory_stats?.max_usage || 0;
        }
      } catch (err) {
        // Ignore stats fetch error
      }

      return {
        overallStatus,
        results,
        metrics: {
          startTime,
          endTime: new Date().toISOString(),
          memoryUsageBytes,
          exitCode: maxExitCode
        }
      };
    } catch (error) {
      console.error("CodeRunner fatal error:", error);
      const isTLE = error instanceof Error && error.message === "TLE";
      return {
        overallStatus: isTLE ? "TLE" : "RE",
        results: testCases.map((tc) => ({
          input: tc.input,
          expected: tc.output,
          actual: isTLE ? "Time Limit Exceeded" : (error instanceof Error ? error.message : "Internal error"),
          status: isTLE ? "TLE" : "RE",
        })),
        metrics: {
          startTime,
          endTime: new Date().toISOString(),
          memoryUsageBytes,
          exitCode: 1
        }
      };
    } finally {
      // Guaranteed cleanup — always stop and remove container
      if (mainTimer) clearTimeout(mainTimer);
      if (container) {
        try {
          await container.kill().catch(() => {});
          await container.remove({ force: true });
        } catch (_cleanupErr) {
          console.error("Container cleanup failed for submission");
        }
      }
    }
  }

  /**
   * Creates a hardened Docker container with:
   * - 256MB memory limit
   * - 1 CPU core (NanoCpus)
   * - 64 process limit (fork bomb protection)
   * - Network disabled (no exfiltration)
   * - Readonly root filesystem (immutability)
   * - Writable tmpfs at /workspace and /tmp only
   */
  private async createSecureContainer(image: string): Promise<Docker.Container> {
    return this.docker.createContainer({
      Image: image,
      Cmd: ["tail", "-f", "/dev/null"],
      Tty: false,
      WorkingDir: "/workspace",
      StopTimeout: 10,
      HostConfig: {
        Memory: 256 * 1024 * 1024,
        MemorySwap: 256 * 1024 * 1024,
        NanoCpus: 1e9,
        PidsLimit: 100,
        NetworkMode: "none",
        ReadonlyRootfs: true,
        Tmpfs: {
          "/workspace": "rw,size=64m",
          "/tmp": "rw,size=32m",
        },
      },
    });
  }

  /** Pulls Docker image only if not cached locally */
  private async ensureImage(imageName: string): Promise<void> {
    const images = await this.docker.listImages({
      filters: { reference: [imageName] },
    });
    if (images.length > 0) return;

    console.log(`Pulling image: ${imageName}`);
    await new Promise<void>((resolve, reject) => {
      this.docker.pull(
        imageName,
        (err: Error, stream: NodeJS.ReadableStream) => {
          if (err) return reject(err);
          this.docker.modem.followProgress(stream, (progressErr) =>
            progressErr ? reject(progressErr) : resolve()
          );
        }
      );
    });
  }

  /**
   * Writes code into the container using Docker putArchive API.
   * Creates a minimal tar archive in memory and uploads it.
   * This approach has ZERO shell injection surface — no user input
   * ever touches a shell command string.
   */
  private async writeCodeToContainer(
    container: Docker.Container,
    fileName: string,
    code: string
  ): Promise<void> {
    const tarBuffer = this.buildTarArchive(fileName, code);
    const tarStream = Readable.from(tarBuffer);
    await container.putArchive(tarStream, { path: "/workspace" });
  }

  /**
   * Builds a minimal POSIX tar archive containing a single file.
   * Format: 512-byte header + padded file content + 1024-byte end marker.
   */
  private buildTarArchive(fileName: string, content: string): Buffer {
    const fileContent = Buffer.from(content, "utf-8");
    const fileSize = fileContent.length;

    // 512-byte tar header
    const header = Buffer.alloc(512, 0);

    // Filename (offset 0, max 100 bytes)
    header.write(fileName.substring(0, 99), 0);

    // File permissions: 0644 (offset 100, 8 bytes, octal null-terminated)
    header.write("0000644\0", 100, 8);

    // Owner UID (offset 108)
    header.write("0001000\0", 108, 8);

    // Group GID (offset 116)
    header.write("0001000\0", 116, 8);

    // File size in octal (offset 124, 12 bytes)
    header.write(fileSize.toString(8).padStart(11, "0") + "\0", 124, 12);

    // Modification timestamp (offset 136, 12 bytes)
    const mtime = Math.floor(Date.now() / 1000);
    header.write(mtime.toString(8).padStart(11, "0") + "\0", 136, 12);

    // Checksum placeholder — must be spaces during calculation (offset 148, 8 bytes)
    header.write("        ", 148, 8);

    // Type flag: '0' = regular file (offset 156)
    header[156] = 0x30;

    // USTAR magic (offset 257) and version (offset 263)
    header.write("ustar\0", 257, 6);
    header.write("00", 263, 2);

    // Calculate and write header checksum
    let checksum = 0;
    for (let i = 0; i < 512; i++) {
      checksum += header[i];
    }
    header.write(checksum.toString(8).padStart(6, "0") + "\0 ", 148, 8);

    // Pad file content to 512-byte boundary
    const paddedSize = Math.ceil(fileSize / 512) * 512 || 512;
    const paddedContent = Buffer.alloc(paddedSize, 0);
    fileContent.copy(paddedContent);

    // End-of-archive marker: two 512-byte zero blocks
    const endMarker = Buffer.alloc(1024, 0);

    return Buffer.concat([header, paddedContent, endMarker]);
  }

  /**
   * Executes a command inside the container using Docker exec API.
   * Input data is piped through stdin — never interpolated into commands.
   * Enforces timeout via timer + stream destruction.
   */
  private async execInContainer(
    container: Docker.Container,
    cmd: string[],
    stdinData: string,
    timeoutMs: number
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const exec = await container.exec({
      Cmd: cmd,
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: false,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stream: any = await exec.start({ hijack: true, stdin: true });

    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];

      const timer = setTimeout(() => {
        stream.destroy();
        reject(new Error("TLE"));
      }, timeoutMs);

      stream.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

        stream.on("end", () => {
        clearTimeout(timer);
        const buffer = Buffer.concat(chunks);
        const decoded = decodeDockerStream(buffer);
        exec.inspect().then(info => {
          resolve({ ...decoded, exitCode: info.ExitCode || 0 });
        }).catch(() => resolve({ ...decoded, exitCode: 1 }));
      });

      stream.on("error", (err: Error) => {
        clearTimeout(timer);
        reject(err);
      });

      // Pipe test input through stdin and signal EOF
      if (stdinData) {
        stream.write(stdinData);
        if (!stdinData.endsWith("\n")) {
          stream.write("\n");
        }
      }
      stream.end();
    });
  }
}

export default CodeRunner;
