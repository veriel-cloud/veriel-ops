import type { FileSink } from "bun";

interface RotationConfig {
  dir: string;
  rotationIntervalMs: number;
  retentionMs: number;
}

function logFileName(): string {
  const ts = new Date().toISOString().slice(0, 16).replace(":", "-");
  return `server-${ts}.log`;
}

export class RotatingFileStream {
  private sink: FileSink;
  private readonly dir: string;
  private readonly retentionMs: number;
  private readonly rotationTimer: ReturnType<typeof setInterval>;
  private readonly cleanupTimer: ReturnType<typeof setInterval>;

  constructor(config: RotationConfig) {
    this.dir = config.dir;
    this.retentionMs = config.retentionMs;

    Bun.spawnSync(["mkdir", "-p", this.dir]);

    this.sink = Bun.file(`${this.dir}/${logFileName()}`).writer();

    this.rotationTimer = setInterval(() => this.rotate(), config.rotationIntervalMs);
    this.cleanupTimer = setInterval(() => this.cleanup(), config.retentionMs / 2);

    this.cleanup();
  }

  write(msg: string): void {
    this.sink.write(msg);
    this.sink.flush();
  }

  private rotate(): void {
    this.sink.end();
    this.sink = Bun.file(`${this.dir}/${logFileName()}`).writer();
  }

  private async cleanup(): Promise<void> {
    const glob = new Bun.Glob("*.log");
    const now = Date.now();

    for await (const file of glob.scan(this.dir)) {
      const filePath = `${this.dir}/${file}`;
      const { lastModified } = Bun.file(filePath);
      if (now - lastModified > this.retentionMs) {
        Bun.spawnSync(["rm", filePath]);
      }
    }
  }

  destroy(): void {
    clearInterval(this.rotationTimer);
    clearInterval(this.cleanupTimer);
    this.sink.end();
  }
}
