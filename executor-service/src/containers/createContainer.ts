import Docker from "dockerode";

/**
 * Creates a hardened Docker container with strict resource limits.
 *
 * Security constraints:
 * - NetworkMode "none": prevents code from making network calls
 * - Memory 256MB: prevents memory abuse
 * - NanoCpus 1e9: limits to 1 CPU core
 * - PidsLimit 64: prevents fork bombs
 * - ReadonlyRootfs: immutable root filesystem
 * - Tmpfs at /workspace and /tmp: writable scratch space only
 */
async function createContainer(
  imageName: string,
  cmdExecutable?: string[]
): Promise<Docker.Container> {
  const docker = new Docker();

  const container = await docker.createContainer({
    Image: imageName,
    Cmd: cmdExecutable || ["tail", "-f", "/dev/null"],
    AttachStdin: true,
    AttachStdout: true,
    AttachStderr: true,
    Tty: false,
    WorkingDir: "/workspace",
    HostConfig: {
      Memory: 256 * 1024 * 1024,
      NanoCpus: 1e9,
      PidsLimit: 64,
      NetworkMode: "none",
      ReadonlyRootfs: true,
      Tmpfs: {
        "/workspace": "rw,size=64m",
        "/tmp": "rw,size=32m",
      },
    },
    OpenStdin: true,
  });

  return container;
}

export default createContainer;
