import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export default function DocsHome() {
  return (
    <div className="relative flex min-h-screen flex-col docs-atmosphere">
      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      <div className="relative flex flex-1 flex-col items-center justify-center px-6">
        <div className="max-w-lg text-center docs-fade-in">
          <div className="text-[15px] font-semibold tracking-tight text-docs-fg">
            Frond<span className="text-docs-accent">.</span>
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-docs-fg sm:text-5xl">Documentation</h1>
          <p className="mt-4 text-base leading-relaxed text-docs-muted">
            Published API docs live at{" "}
            <code className="rounded-md bg-docs-code px-1.5 py-0.5 font-mono text-sm text-docs-accent-fg">
              /:org/:project
            </code>
          </p>
          <p className="mt-8 text-sm text-docs-muted">
            Example:{" "}
            <Link
              href="/acme/payments"
              className="font-medium text-docs-accent underline-offset-4 hover:underline"
            >
              /acme/payments
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
