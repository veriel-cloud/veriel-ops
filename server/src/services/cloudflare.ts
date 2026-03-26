import type { CloudflareConfig, DnsRecord, Environment, PagesDeployment, PagesProject } from "../types.js";
import { CF_API_URL, ENV_BRANCHES, PAGES_BUILD_COMMAND, PAGES_BUILD_OUTPUT, PER_PAGE_DNS, pagesProjectName, domainForEnv } from "../constants.js";

// ─── API client ───────────────────────────────────────────────────────

async function cfFetch<T>(config: CloudflareConfig, path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${CF_API_URL}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${config.apiToken}`, "Content-Type": "application/json", ...options.headers },
  });

  const data = (await res.json()) as { success: boolean; result: T; errors?: { message: string }[] };

  if (!data.success) {
    const msg = data.errors?.map((e) => e.message).join(", ") ?? "Unknown error";
    throw new Error(`Cloudflare API error: ${msg}`);
  }

  return data.result;
}

// ─── Service factory ──────────────────────────────────────────────────

export function createCloudflareService(config: CloudflareConfig) {
  const { accountId, zoneId } = config;
  const accounts = `/accounts/${accountId}`;
  const zones = `/zones/${zoneId}`;

  return {
    // Pages — read
    listPagesProjects: () =>
      cfFetch<PagesProject[]>(config, `${accounts}/pages/projects`),

    getPagesProject: (name: string) =>
      cfFetch<PagesProject>(config, `${accounts}/pages/projects/${name}`),

    getDeployments: (project: string, perPage = 20) =>
      cfFetch<PagesDeployment[]>(config, `${accounts}/pages/projects/${project}/deployments?per_page=${perPage}`),

    // Pages — write
    createPagesProjectForEnv: (projectName: string, env: Environment, repoOwner: string, repoName: string) =>
      cfFetch<PagesProject>(config, `${accounts}/pages/projects`, {
        method: "POST",
        body: JSON.stringify({
          name: pagesProjectName(projectName, env),
          production_branch: ENV_BRANCHES[env],
          build_config: { build_command: PAGES_BUILD_COMMAND, destination_dir: PAGES_BUILD_OUTPUT },
          source: {
            type: "github",
            config: {
              owner: repoOwner,
              repo_name: repoName,
              production_branch: ENV_BRANCHES[env],
              pr_comments_enabled: false,
              deployments_enabled: false,
            },
          },
        }),
      }),

    addCustomDomain: (project: string, domain: string) =>
      cfFetch<void>(config, `${accounts}/pages/projects/${project}/domains`, {
        method: "POST",
        body: JSON.stringify({ name: domain }),
      }),

    // DNS
    listDnsRecords: () =>
      cfFetch<DnsRecord[]>(config, `${zones}/dns_records?per_page=${PER_PAGE_DNS}`),

    createDnsRecord: (name: string, target: string) =>
      cfFetch<DnsRecord>(config, `${zones}/dns_records`, {
        method: "POST",
        body: JSON.stringify({ type: "CNAME", name, content: target, proxied: true, ttl: 1 }),
      }),

    deleteDnsRecord: (recordId: string) =>
      cfFetch<void>(config, `${zones}/dns_records/${recordId}`, { method: "DELETE" }),

    // Setup — combines DNS + custom domain in one call
    async setupEnvDns(projectName: string, env: Environment, pagesSubdomain: string, customDomain?: string) {
      const pagesTarget = pagesSubdomain.endsWith(".pages.dev") ? pagesSubdomain : `${pagesSubdomain}.pages.dev`;
      const domain = domainForEnv(projectName, env, customDomain);

      const dnsRecord = await this.createDnsRecord(domain, pagesTarget);
      await this.addCustomDomain(pagesProjectName(projectName, env), domain);

      return { dnsRecord, domain, pagesTarget };
    },
  };
}

export type CloudflareService = ReturnType<typeof createCloudflareService>;
