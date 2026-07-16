"use client";

import Link from "next/link";
import { ArrowLeft, ExternalLink, Github } from "lucide-react";
import { CopyCommand } from "@/components/copy-command";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-6 border-t border-border/80 pt-10 sm:grid-cols-[4rem_1fr]">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
        {n}
      </div>
      <div className="min-w-0 space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {children}
      </div>
    </section>
  );
}

export default function DocsGuidePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-12 pb-8">
      <div className="space-y-6">
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            Overview
          </Link>
        </Button>
        <PageHeader
          title="Publish your docs"
          description="Create a project in the dashboard, then use the CLI to init, validate, and publish. Hosted docs appear at localhost:3001/{org}/{project}."
        />
      </div>

      <div className="space-y-2 rounded-lg border bg-muted/30 px-5 py-4">
        <p className="text-sm font-medium">From the Frond monorepo root</p>
        <p className="text-sm text-muted-foreground">Build the CLI once, then run the steps below.</p>
        <div className="pt-2">
          <CopyCommand command="pnpm --filter @frond/cli build" className="w-full justify-between" />
        </div>
      </div>

      <div className="space-y-0">
        <Step n={1} title="Create org & project">
          <p className="text-sm leading-relaxed text-muted-foreground">
            On Overview, create an organization and a documentation project. Copy the project UUID —
            you will need it for publish.
          </p>
        </Step>

        <Step n={2} title="Initialize Frond in your repo">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Run this in the API repo you want to document. It creates a{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">frond/</code> folder with config,
            OpenAPI, and guide pages.
          </p>
          <CopyCommand command="node apps/cli/dist/index.js init" className="w-full justify-between" />
        </Step>

        <Step n={3} title="Validate & preview">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Check the config, then preview locally (hot reload on port 3002).
          </p>
          <div className="space-y-3">
            <CopyCommand command="node apps/cli/dist/index.js validate" className="w-full justify-between" />
            <CopyCommand command="node apps/cli/dist/index.js docs dev" className="w-full justify-between" />
          </div>
        </Step>

        <Step n={4} title="Authenticate with an API key">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Create a key under{" "}
            <Link href="/dashboard/api-keys" className="text-foreground underline-offset-2 hover:underline">
              API keys
            </Link>
            , then save it to the CLI (Fern-style):
          </p>
          <CopyCommand
            command="node apps/cli/dist/index.js login --api-key frond_YOUR_KEY"
            className="w-full justify-between"
          />
          <p className="text-sm text-muted-foreground">
            Or set <code className="rounded bg-muted px-1.5 py-0.5 text-xs">FROND_API_KEY</code> in CI.
            Demo JWT still works via{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">FROND_TOKEN</code>.
          </p>
        </Step>

        <Step n={5} title="Publish">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Add <code className="rounded bg-muted px-1.5 py-0.5 text-xs">projectId</code> to{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">frond/frond.config.json</code>{" "}
            (UUID from Overview), or pass it on the command line.
          </p>
          <div className="space-y-3">
            <CopyCommand
              command='node apps/cli/dist/index.js docs publish'
              className="w-full justify-between"
            />
            <CopyCommand
              command="node apps/cli/dist/index.js docs publish --project-id <uuid>"
              className="w-full justify-between"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button variant="outline" size="sm" asChild>
              <a href="http://localhost:3001" target="_blank" rel="noreferrer">
                Open docs host
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/api-keys">Manage API keys</Link>
            </Button>
          </div>
        </Step>
      </div>

      <section className="space-y-4 border-t pt-10">
        <h2 className="text-lg font-semibold tracking-tight">What next</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Connect GitHub to scan repos, detect drift, and keep docs living with your code.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/dashboard/github">
              <Github className="h-4 w-4" />
              Connect GitHub
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Manage projects</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
