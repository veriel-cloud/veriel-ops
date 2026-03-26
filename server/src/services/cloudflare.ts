const BASE_URL = "https://api.cloudflare.com/client/v4";

export interface CloudflareConfig {
  apiToken: string;
  accountId: string;
  zoneId: string;
}

const branchMap: Record<string, string> = {
  des: "develop",
  pre: "release",
  pro: "main",
};
async function cfFetch<T>(
  config: CloudflareConfig,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!(data as Record<string, unknown>).success) {
    const errors = (
      (data as Record<string, unknown>).errors as Array<{ message: string }>
    )
      ?.map((e) => e.message)
      .join(", ");
    throw new Error(`Cloudflare API error: ${errors}`);
  }

  return (data as Record<string, unknown>).result as T;
}

// ─── Pages ──────────────────────────────────────────────────────────

export interface PagesProject {
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

export interface PagesDeployment {
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

export function createCloudflareService(config: CloudflareConfig) {
  const { accountId, zoneId } = config;

  return {
    // ─── Pages read ───────────────────────────────────────────
    listPagesProjects(): Promise<PagesProject[]> {
      return cfFetch<PagesProject[]>(
        config,
        `/accounts/${accountId}/pages/projects`,
      );
    },

    getPagesProject(name: string): Promise<PagesProject> {
      return cfFetch<PagesProject>(
        config,
        `/accounts/${accountId}/pages/projects/${name}`,
      );
    },

    getDeployments(
      projectName: string,
      perPage = 20,
    ): Promise<PagesDeployment[]> {
      return cfFetch<PagesDeployment[]>(
        config,
        `/accounts/${accountId}/pages/projects/${projectName}/deployments?per_page=${perPage}`,
      );
    },

    // ─── Pages write ──────────────────────────────────────────
    createPagesProjectForEnv(
      projectName: string,
      env: "des" | "pre" | "pro",
      repoOwner: string,
      repoName: string,
    ): Promise<PagesProject> {
      const envSuffix = env === "pro" ? "" : `-${env}`;
      const pagesName = `${projectName}${envSuffix}`;

      const productionBranch = branchMap[env];

      return cfFetch<PagesProject>(
        config,
        `/accounts/${accountId}/pages/projects`,
        {
          method: "POST",
          body: JSON.stringify({
            name: pagesName,
            production_branch: productionBranch,
            build_config: {
              build_command: "pnpm build",
              destination_dir: "dist",
            },
            source: {
              type: "github",
              config: {
                owner: repoOwner,
                repo_name: repoName,
                production_branch: productionBranch,
                pr_comments_enabled: false,
                deployments_enabled: false,
              },
            },
          }),
        },
      );
    },

    addCustomDomain(projectName: string, domain: string): Promise<void> {
      return cfFetch(
        config,
        `/accounts/${accountId}/pages/projects/${projectName}/domains`,
        {
          method: "POST",
          body: JSON.stringify({ name: domain }),
        },
      );
    },

    // ─── DNS ──────────────────────────────────────────────────
    listDnsRecords() {
      return cfFetch<DnsRecord[]>(
        config,
        `/zones/${zoneId}/dns_records?per_page=100`,
      );
    },

    createDnsRecord(name: string, target: string) {
      return cfFetch<DnsRecord>(config, `/zones/${zoneId}/dns_records`, {
        method: "POST",
        body: JSON.stringify({
          type: "CNAME",
          name,
          content: target,
          proxied: true,
          ttl: 1,
        }),
      });
    },

    deleteDnsRecord(recordId: string): Promise<void> {
      return cfFetch(config, `/zones/${zoneId}/dns_records/${recordId}`, {
        method: "DELETE",
      });
    },

    // ─── Setup helpers ────────────────────────────────────────
    async setupEnvDns(
      projectName: string,
      env: "des" | "pre" | "pro",
      pagesSubdomain: string,
      customDomain?: string,
    ) {
      const pagesTarget = pagesSubdomain.endsWith(".pages.dev")
        ? pagesSubdomain
        : `${pagesSubdomain}.pages.dev`;

      const domain = getDomainForEnv(projectName, env, customDomain);
      const envSuffix = env === "pro" ? "" : `-${env}`;
      const pagesProjectName = `${projectName}${envSuffix}`;

      const dnsRecord = await this.createDnsRecord(domain, pagesTarget);
      await this.addCustomDomain(pagesProjectName, domain);

      return { dnsRecord, domain, pagesTarget };
    },
  };
}

// ─── Pure helpers (no config needed) ──────────────────────────────────

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

export function getDomainForEnv(
  projectName: string,
  env: "des" | "pre" | "pro",
  customDomain?: string,
): string {
  if (customDomain) {
    if (env === "pro") return customDomain;
    if (env === "des") return `dev.${customDomain}`;
    return `pre.${customDomain}`;
  }
  if (env === "pro") return `${projectName}.veriel.dev`;
  return `${projectName}-${env}.veriel.dev`;
}

export type CloudflareService = ReturnType<typeof createCloudflareService>;
