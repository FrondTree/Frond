import Link from "next/link";
import { ArrowRight, BookOpen, Code2, Sparkles, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--frond-border)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold tracking-tight">Frond</span>
          <nav className="flex items-center gap-6 text-sm text-zinc-400">
            <Link href="#features" className="hover:text-white">
              Features
            </Link>
            <Link href="/docs" className="hover:text-white">
              Docs
            </Link>
            <Link
              href="/login"
              className="rounded-lg bg-indigo-500 px-4 py-2 font-medium text-white hover:bg-indigo-400"
            >
              Sign in with Google
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 py-24 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1 text-sm text-indigo-300">
            <Sparkles className="h-4 w-4" />
            Fern, but better
          </div>
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            Documentation that
            <br />
            <span className="text-indigo-400">developers love</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400">
            Config-as-code API docs, interactive playgrounds, SDK generation, and
            versioned publishing — all from your repo with the Frond CLI.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-6 py-3 font-medium text-white hover:bg-indigo-400"
            >
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <code className="rounded-lg border border-[var(--frond-border)] bg-[var(--frond-surface)] px-4 py-3 text-sm text-zinc-300">
              npm install -g @frond/cli
            </code>
          </div>
        </section>

        <section id="features" className="border-t border-[var(--frond-border)] bg-[var(--frond-surface)] py-24">
          <div className="mx-auto grid max-w-6xl gap-8 px-6 sm:grid-cols-3">
            <Feature
              icon={<BookOpen className="h-6 w-6 text-indigo-400" />}
              title="OpenAPI → Beautiful Docs"
              description="Drop your OpenAPI spec in frond/ and get a polished API reference with examples and search."
            />
            <Feature
              icon={<Zap className="h-6 w-6 text-indigo-400" />}
              title="Interactive Playground"
              description="Try endpoints in-browser with auth presets, environments, and request history."
            />
            <Feature
              icon={<Code2 className="h-6 w-6 text-indigo-400" />}
              title="SDK Generation"
              description="Generate TypeScript and Python SDKs with frond generate. Publish to npm on your terms."
            />
          </div>
        </section>

        <section className="py-24">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-3xl font-bold">Ship docs in minutes</h2>
            <pre className="mt-8 overflow-x-auto rounded-xl border border-[var(--frond-border)] bg-[var(--frond-surface)] p-6 text-left text-sm text-zinc-300">
{`npm install -g @frond/cli
frond init
frond docs dev
frond login
frond docs publish --project-id <id>`}
            </pre>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--frond-border)] py-8 text-center text-sm text-zinc-500">
        © {new Date().getFullYear()} Frond. Developer documentation platform.
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--frond-border)] bg-[var(--frond-bg)] p-6">
      <div className="mb-4">{icon}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-zinc-400">{description}</p>
    </div>
  );
}
