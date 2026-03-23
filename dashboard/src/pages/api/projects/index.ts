import type { APIRoute } from "astro";
import { github, cloudflare, r2 } from "@/lib/services/index.js";

export const GET: APIRoute = async () => {
  try {
    const [repos, pagesProjects, builds] = await Promise.all([
      github.listOrgRepos(),
      cloudflare.listPagesProjects(),
      r2.listAllProjectBuilds(),
    ]);

    const pagesMap = new Map(
      pagesProjects.map((p) => [p.name, p]),
    );

    const projects = repos
      .filter((repo) => repo.name !== ".github")
      .map((repo) => {
        const pages = pagesMap.get(repo.name);
        const projectBuilds = builds.filter((b) => b.project === repo.name);

        return {
          name: repo.name,
          repo: repo.full_name,
          description: repo.description,
          domain: pages
            ? pages.domains?.[0] ?? `${repo.name}.pages.dev`
            : `${repo.name}.veriel.dev`,
          customDomain: (pages?.domains?.length ?? 0) > 0,
          createdAt: repo.created_at,
          updatedAt: repo.updated_at,
          defaultBranch: repo.default_branch,
          pages: pages
            ? {
                subdomain: pages.subdomain,
                productionBranch: pages.production_branch,
                latestDeployment: pages.latest_deployment,
                domains: pages.domains,
              }
            : null,
          builds: {
            des: projectBuilds.filter((b) => b.environment === "des").length,
            pre: projectBuilds.filter((b) => b.environment === "pre").length,
            pro: projectBuilds.filter((b) => b.environment === "pro").length,
          },
        };
      });

    return new Response(JSON.stringify({ projects }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, type, customDomain, description } = body;

    if (!name) {
      return new Response(
        JSON.stringify({ error: "Project name is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const org = import.meta.env.GITHUB_ORG || "veriel-cloud";

    // 1. Create GitHub repo
    const repo = await github.createRepo(name, {
      description: description ?? `${type ?? "web"} project managed by veriel-ops`,
      isPrivate: true,
    });

    // 2. Add workflow callers to main
    await github.addWorkflowCallers(name, name);

    // 3. Create develop branch
    await github.createBranch(name, "develop", "main");

    // 4. Create Cloudflare Pages project
    const pagesProject = await cloudflare.createPagesProject(name, org, name);

    // 5. Create DNS records
    const dnsRecords = await cloudflare.setupProjectDns(name, customDomain);

    // 6. Add custom domains to Pages
    await cloudflare.setupCustomDomains(name, customDomain);

    // 7. Create webhook if configured
    const webhookUrl = import.meta.env.WEBHOOK_URL;
    const webhookSecret = import.meta.env.GITHUB_WEBHOOK_SECRET;
    if (webhookUrl && webhookSecret) {
      await github.createWebhook(name, webhookUrl, webhookSecret);
    }

    const baseDomain = customDomain ?? `${name}.veriel.dev`;

    return new Response(
      JSON.stringify({
        success: true,
        project: {
          name,
          repo: repo.full_name,
          urls: {
            des: `https://dev.${baseDomain}`,
            pre: `https://pre.${baseDomain}`,
            pro: `https://${baseDomain}`,
          },
          github: repo.html_url,
          pages: pagesProject.subdomain,
          dns: dnsRecords.map((r) => r.name),
        },
      }),
      { status: 201, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
