import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Boxes,
  Code2,
  FileJson2,
  GitBranch,
  Github,
  Network,
  Play,
  Terminal,
  Zap,
} from "lucide-react";
import { CopyCommand } from "@/components/copy-command";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const nav = [
  { href: "#product", label: "Product" },
  { href: "#workflow", label: "Workflow" },
  { href: "#capabilities", label: "Capabilities" },
];

const steps = [
  {
    icon: Terminal,
    title: "Init in your repo",
    body: "Scaffold config, OpenAPI paths, and docs pages beside your API.",
    command: "frond init",
  },
  {
    icon: Play,
    title: "Preview locally",
    body: "Compile the manifest and serve a local reference site instantly.",
    command: "frond docs dev",
  },
  {
    icon: Github,
    title: "Publish & scan",
    body: "Ship versions, connect GitHub, and keep architecture in sync.",
    command: "frond docs publish",
  },
];

const capabilities = [
  {
    icon: FileJson2,
    title: "OpenAPI → hosted docs",
    body: "Beautiful API references with examples and search, generated from your spec.",
  },
  {
    icon: Zap,
    title: "Interactive playground",
    body: "Try endpoints in-browser with environments, auth presets, and history.",
  },
  {
    icon: Code2,
    title: "SDK generation",
    body: "Generate TypeScript and Python clients with frond generate.",
  },
  {
    icon: Network,
    title: "Repo intelligence",
    body: "Map services, dependencies, ADRs, and doc health from GitHub.",
  },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 landing-grid opacity-[0.45] dark:opacity-[0.28]" aria-hidden />

      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero — brand first, one composition */}
        <section className="relative border-b border-border">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:gap-16">
            <div className="landing-fade-up">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary">Frond</p>
              <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem]">
                Docs that grow with your codebase.
              </h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
                Config-as-code API docs, SDKs, and repo intelligence — published from the CLI, kept honest by your GitHub.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Button size="lg" className="landing-cta" asChild>
                  <Link href="/login">
                    Open dashboard
                    <ArrowRight />
                  </Link>
                </Button>
                <CopyCommand command="npm i -g @frond/cli" />
              </div>
            </div>

            {/* Product visual — docs mock, not a card collage */}
            <div className="landing-fade-up landing-fade-up-delay relative min-h-[280px] sm:min-h-[320px]">
              <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
                <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium text-foreground">payments.api</span>
                    <span className="text-border">/</span>
                    <span>v1</span>
                  </div>
                  <span className="rounded-md bg-accent px-2 py-0.5 font-mono text-[10px] text-accent-foreground">
                    live
                  </span>
                </div>
                <div className="grid sm:grid-cols-[140px_1fr]">
                  <aside className="hidden space-y-1 border-r border-border p-3 sm:block">
                    {["Introduction", "Authentication", "Charges", "Refunds", "Webhooks"].map((item, i) => (
                      <div
                        key={item}
                        className={`rounded-md px-2 py-1.5 text-xs ${
                          i === 2 ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {item}
                      </div>
                    ))}
                  </aside>
                  <div className="space-y-4 p-4 sm:p-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary">
                          POST
                        </span>
                        <code className="font-mono text-xs text-foreground">/v1/charges</code>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        Create a charge for a customer. Returns a Charge object when successful.
                      </p>
                    </div>
                    <div className="rounded-md border border-border bg-muted/40 p-3 font-mono text-[11px] leading-5 text-muted-foreground">
                      <div>
                        <span className="text-primary">curl</span> https://api.example.com/v1/charges \
                      </div>
                      <div className="pl-3">-H &quot;Authorization: Bearer …&quot; \</div>
                      <div className="pl-3">-d amount=2000 -d currency=usd</div>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Boxes className="h-3 w-3" /> TypeScript SDK
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <GitBranch className="h-3 w-3" /> 12 endpoints
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section id="workflow" className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="max-w-xl">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Workflow</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">From repo to published docs in minutes.</h2>
            </div>

            <ol className="mt-12 grid gap-0 sm:grid-cols-3">
              {steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <li
                    key={step.title}
                    className="relative border-border py-6 sm:border-l sm:px-6 sm:py-0 first:sm:border-l-0 first:sm:pl-0"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="mt-4 font-mono text-[11px] text-muted-foreground">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-1 text-base font-medium">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                    <code className="mt-4 inline-block font-mono text-xs text-foreground">{step.command}</code>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* Product / terminal */}
        <section id="product" className="border-b border-border bg-muted/30">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">CLI-first</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                Your documentation lives next to the API.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Frond treats docs as code. Validate OpenAPI, preview locally, publish versions, then connect GitHub so architecture and health stay current.
              </p>
              <ul className="mt-8 space-y-3">
                {[
                  { icon: FileJson2, text: "OpenAPI as the source of truth" },
                  { icon: Terminal, text: "One CLI for init, validate, publish, generate" },
                  { icon: Network, text: "Knowledge graph from scanned repositories" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.text} className="flex items-start gap-3 text-sm text-foreground">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      {item.text}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
              <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/35" />
                <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/35" />
                <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/35" />
                <span className="ml-2 inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                  <Terminal className="h-3 w-3" />
                  frond
                </span>
              </div>
              <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-6">
                <span className="text-muted-foreground">$</span>{" "}
                <span className="text-foreground">frond init</span>
                {"\n"}
                <span className="text-primary">✓</span> Created frond/config
                {"\n\n"}
                <span className="text-muted-foreground">$</span>{" "}
                <span className="text-foreground">frond validate</span>
                {"\n"}
                <span className="text-primary">✓</span> OpenAPI ok · 42 paths
                {"\n\n"}
                <span className="text-muted-foreground">$</span>{" "}
                <span className="text-foreground">frond docs publish</span>
                {"\n"}
                <span className="text-primary">✓</span> Published <span className="text-foreground">v1.4.0</span>
              </pre>
            </div>
          </div>
        </section>

        {/* Capabilities */}
        <section id="capabilities" className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="max-w-xl">
              <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">Capabilities</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
                Everything teams need after the first publish.
              </h2>
            </div>

            <ul className="mt-12 divide-y divide-border border-y border-border">
              {capabilities.map((cap) => {
                const Icon = cap.icon;
                return (
                  <li
                    key={cap.title}
                    className="group flex flex-col gap-3 py-6 transition-colors sm:flex-row sm:items-start sm:gap-8 sm:py-7"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-card text-primary transition-colors group-hover:border-primary/40 group-hover:bg-accent">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1 sm:flex sm:items-baseline sm:justify-between sm:gap-10">
                      <h3 className="font-medium text-foreground">{cap.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground sm:mt-0 sm:max-w-md sm:text-right">
                        {cap.body}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="border-b border-border">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-16 sm:flex-row sm:items-center sm:px-6 sm:py-20">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Start with the demo account.</h2>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Sign in as <span className="font-medium text-foreground">demo / demo</span>, create an org, and explore the dashboard.
              </p>
            </div>
            <Button size="lg" asChild>
              <Link href="/login">
                Sign in to Frond
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer>
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <Logo />
            <Separator orientation="vertical" className="hidden h-4 sm:block" />
            <p className="text-sm text-muted-foreground">Developer documentation platform</p>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>© {new Date().getFullYear()} Frond</span>
            <Link href="/login" className="hover:text-foreground">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
