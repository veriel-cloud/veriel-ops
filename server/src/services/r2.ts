import { AwsClient } from "aws4fetch";
import type { Logger } from "../lib/logger.js";
import type { BuildInfo, R2Config } from "../types.js";

export function createR2Service(config: R2Config, logger?: Logger) {
  const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com`;
  const { bucketName } = config;

  const r2 = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: "s3",
    region: "auto",
  });

  async function listObjects(prefix = ""): Promise<BuildInfo[]> {
    logger?.debug({ prefix }, "r2 list objects");
    const url = new URL(`/${bucketName}`, endpoint);
    url.searchParams.set("list-type", "2");
    if (prefix) url.searchParams.set("prefix", prefix);

    const res = await r2.fetch(url.toString());
    const xml = await res.text();

    return parseS3ListResponse(xml);
  }

  return {
    listBuilds: (project: string, environment?: string) =>
      listObjects(environment ? `${project}/${environment}/` : `${project}/`),

    listAllProjectBuilds: () => listObjects(),

    async downloadBuild(project: string, environment: string, artifact: string) {
      logger?.info({ project, environment, artifact }, "r2 download build");
      const url = new URL(`/${bucketName}/${project}/${environment}/${artifact}`, endpoint);
      const res = await r2.fetch(url.toString());
      if (!res.ok) throw new Error(`Failed to download build: ${res.status}`);
      return res.arrayBuffer();
    },
  };
}

// ─── S3 XML parsing ───────────────────────────────────────────────────

function parseS3ListResponse(xml: string): BuildInfo[] {
  const builds: BuildInfo[] = [];
  const blockRegex = /<Contents>([\s\S]*?)<\/Contents>/g;

  for (let match = blockRegex.exec(xml); match !== null; match = blockRegex.exec(xml)) {
    const block = match[1];
    const key = tag(block, "Key");
    if (!key || key.endsWith("/")) continue;

    const parts = key.split("/");
    const fileName = parts.at(-1) ?? "";
    const baseName = fileName.replace(".tar.gz", "");
    const [version = baseName, commitSha = ""] = baseName.split("_");

    builds.push({
      name: fileName,
      project: parts[0],
      environment: parts[1] ?? "",
      size: parseInt(tag(block, "Size") || "0", 10),
      lastModified: tag(block, "LastModified"),
      version,
      commitSha,
    });
  }

  return builds;
}

function tag(xml: string, name: string): string {
  const m = new RegExp(`<${name}>(.*?)</${name}>`).exec(xml);
  return m?.[1] ?? "";
}

export type R2Service = ReturnType<typeof createR2Service>;
