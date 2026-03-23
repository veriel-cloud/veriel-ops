const apiToken = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const zoneId = process.env.CLOUDFLARE_ZONE_ID;

const BASE_URL = "https://api.cloudflare.com/client/v4";

async function cfFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!data.success) {
    const errors = data.errors?.map((e: { message: string }) => e.message).join(", ");
    throw new Error(`Cloudflare API error: ${errors}`);
  }

  return data.result as T;
}

// ─── Pages ──────────────────────────────────────────────────────────

interface PagesProject {
  name: string;
  subdomain: string;
  domains: string[];
  production_branch: string;
  created_on: string;
  latest_deployment: PagesDeployment | null;
  source: {
    type: string;
    config: {
      owner: string;
      repo_name: string;
      production_branch: string;
    };
  };
}

interface PagesDeployment {
  id: string;
  short_id: string;
  project_name: string;
  environment: string;
  url: string;
  created_on: string;
  modified_on: string;
  latest_stage: {
    name: string;
    status: string;
    started_on: string;
    ended_on: string;
  };
  deployment_trigger: {
    type: string;
    metadata: {
      branch: string;
      commit_hash: string;
      commit_message: string;
    };
  };
  source: {
    type: string;
    config: {
      owner: string;
      repo_name: string;
    };
  };
}

export async function listPagesProjects(): Promise<PagesProject[]> {
  return cfFetch<PagesProject[]>(`/accounts/${accountId}/pages/projects`);
}

export async function getPagesProject(name: string): Promise<PagesProject> {
  return cfFetch<PagesProject>(`/accounts/${accountId}/pages/projects/${name}`);
}

export async function getDeployments(
  projectName: string,
  perPage = 20,
): Promise<PagesDeployment[]> {
  return cfFetch<PagesDeployment[]>(
    `/accounts/${accountId}/pages/projects/${projectName}/deployments?per_page=${perPage}`,
  );
}

export async function createPagesProject(
  name: string,
  repoOwner: string,
  repoName: string,
): Promise<PagesProject> {
  return cfFetch<PagesProject>(`/accounts/${accountId}/pages/projects`, {
    method: "POST",
    body: JSON.stringify({
      name,
      production_branch: "main",
      build_config: {
        build_command: "pnpm build",
        destination_dir: "dist",
      },
      source: {
        type: "github",
        config: {
          owner: repoOwner,
          repo_name: repoName,
          production_branch: "main",
          pr_comments_enabled: true,
          deployments_enabled: true,
        },
      },
    }),
  });
}

export async function addCustomDomain(
  projectName: string,
  domain: string,
): Promise<void> {
  await cfFetch(`/accounts/${accountId}/pages/projects/${projectName}/domains`, {
    method: "POST",
    body: JSON.stringify({ name: domain }),
  });
}

// ─── DNS ────────────────────────────────────────────────────────────

interface DnsRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  proxied: boolean;
  ttl: number;
  created_on: string;
  modified_on: string;
}

export async function listDnsRecords(): Promise<DnsRecord[]> {
  return cfFetch<DnsRecord[]>(`/zones/${zoneId}/dns_records?per_page=100`);
}

export async function createDnsRecord(
  name: string,
  target: string,
): Promise<DnsRecord> {
  return cfFetch<DnsRecord>(`/zones/${zoneId}/dns_records`, {
    method: "POST",
    body: JSON.stringify({
      type: "CNAME",
      name,
      content: target,
      proxied: true,
      ttl: 1,
    }),
  });
}

export async function deleteDnsRecord(recordId: string): Promise<void> {
  await cfFetch(`/zones/${zoneId}/dns_records/${recordId}`, {
    method: "DELETE",
  });
}

// ─── Setup helpers ──────────────────────────────────────────────────

export async function setupProjectDns(projectName: string, customDomain?: string) {
  const baseDomain = customDomain ?? `${projectName}.veriel.dev`;
  const pagesTarget = `${projectName}.pages.dev`;

  const records = [
    { name: `dev.${baseDomain}`, target: pagesTarget },
    { name: `pre.${baseDomain}`, target: pagesTarget },
    { name: baseDomain, target: pagesTarget },
  ];

  const created = [];
  for (const record of records) {
    const result = await createDnsRecord(record.name, record.target);
    created.push(result);
  }

  return created;
}

export async function setupCustomDomains(projectName: string, customDomain?: string) {
  const baseDomain = customDomain ?? `${projectName}.veriel.dev`;

  const domains = [
    `dev.${baseDomain}`,
    `pre.${baseDomain}`,
    baseDomain,
  ];

  for (const domain of domains) {
    await addCustomDomain(projectName, domain);
  }
}
