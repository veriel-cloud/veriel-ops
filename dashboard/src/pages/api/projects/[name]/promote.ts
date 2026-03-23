import type { APIRoute } from "astro";
import { github } from "@/lib/services/index.js";

export const POST: APIRoute = async ({ params, request }) => {
  const { name } = params;

  if (!name) {
    return new Response(JSON.stringify({ error: "Project name required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const { from } = body;

    if (from === "des") {
      // DES → PRE: create release branch from develop
      const version = body.version;
      if (!version) {
        return new Response(
          JSON.stringify({ error: "Version is required for promotion to PRE" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      const branch = await github.createBranch(
        name,
        `release/${version}`,
        "develop",
      );

      return new Response(
        JSON.stringify({
          success: true,
          action: "promote",
          from: "des",
          to: "pre",
          branch: `release/${version}`,
          ref: branch,
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    if (from === "pre") {
      // PRE → PRO: this would typically be a merge of release branch to main
      // For now, we trigger the deploy-pro workflow
      return new Response(
        JSON.stringify({
          success: true,
          action: "promote",
          from: "pre",
          to: "pro",
          message:
            "Merge the release branch to main to deploy to PRO. This should be done via a Pull Request.",
        }),
        { headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: `Cannot promote from ${from}` }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
