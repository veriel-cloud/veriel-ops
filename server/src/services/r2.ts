import { AwsClient } from "aws4fetch";

export interface R2Config {
  accessKeyId: string;
  secretAccessKey: string;
  accountId: string;
  bucketName: string;
}

interface R2Object {
  key: string;
  size: number;
  lastModified: string;
  etag: string;
}

interface BuildInfo {
  name: string;
  project: string;
  environment: string;
  size: number;
  lastModified: string;
  version: string;
  commitSha: string;
}

export function createR2Service(config: R2Config) {
  const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com`;

  const r2 = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    service: "s3",
    region: "auto",
  });

  async function listBuilds(project: string, environment?: string): Promise<BuildInfo[]> {
    const prefix = environment ? `${project}/${environment}/` : `${project}/`;
    const url = new URL(`/${config.bucketName}`, endpoint);
    url.searchParams.set("list-type", "2");
    url.searchParams.set("prefix", prefix);

    const response = await r2.fetch(url.toString());
    const text = await response.text();
    const objects = parseListResponse(text);

    return objects.map((obj) => {
      const parts = obj.key.split("/");
      const fileName = parts[parts.length - 1];
      const env = parts[1];
      const { version, commitSha } = parseFileName(fileName);
      return { name: fileName, project, environment: env, size: obj.size, lastModified: obj.lastModified, version, commitSha };
    });
  }

  async function listAllProjectBuilds(): Promise<BuildInfo[]> {
    const url = new URL(`/${config.bucketName}`, endpoint);
    url.searchParams.set("list-type", "2");

    const response = await r2.fetch(url.toString());
    const text = await response.text();
    const objects = parseListResponse(text);

    return objects.map((obj) => {
      const parts = obj.key.split("/");
      const project = parts[0];
      const environment = parts[1];
      const fileName = parts[parts.length - 1];
      const { version, commitSha } = parseFileName(fileName);
      return { name: fileName, project, environment, size: obj.size, lastModified: obj.lastModified, version, commitSha };
    });
  }

  async function downloadBuild(project: string, environment: string, artifact: string): Promise<ArrayBuffer> {
    const key = `${project}/${environment}/${artifact}`;
    const url = new URL(`/${config.bucketName}/${key}`, endpoint);
    const response = await r2.fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Failed to download build: ${response.status}`);
    }
    return response.arrayBuffer();
  }

  return { listBuilds, listAllProjectBuilds, downloadBuild };
}

// ─── Helpers ──────────────────────────────────────────────────────────

function parseFileName(fileName: string): { version: string; commitSha: string } {
  const baseName = fileName.replace(".tar.gz", "");
  const parts = baseName.split("_");
  if (parts.length >= 2) {
    return { version: parts[0], commitSha: parts[1] };
  }
  return { version: baseName, commitSha: "" };
}

function parseListResponse(xml: string): R2Object[] {
  const objects: R2Object[] = [];
  const contentRegex = /<Contents>([\s\S]*?)<\/Contents>/g;
  let match;

  while ((match = contentRegex.exec(xml)) !== null) {
    const block = match[1];
    const key = extractTag(block, "Key");
    const size = parseInt(extractTag(block, "Size") || "0", 10);
    const lastModified = extractTag(block, "LastModified");
    const etag = extractTag(block, "ETag");

    if (key && !key.endsWith("/")) {
      objects.push({ key, size, lastModified, etag });
    }
  }

  return objects;
}

function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}>(.*?)</${tag}>`);
  const match = regex.exec(xml);
  return match ? match[1] : "";
}

export type R2Service = ReturnType<typeof createR2Service>;
