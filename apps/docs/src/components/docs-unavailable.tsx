import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export function DocsUnavailable({
  org,
  project,
  error,
}: {
  org: string;
  project: string;
  error: string;
}) {
  const unpublished = error === "no_published_docs";
  const missing = error === "not_found";

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center docs-atmosphere">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      <div className="relative max-w-lg docs-fade-in">
        <div className="text-[15px] font-semibold tracking-tight text-docs-fg">
          Frond<span className="text-docs-accent">.</span>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-docs-fg">
          {unpublished ? "Docs not published yet" : missing ? "Project not found" : "Docs unavailable"}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-docs-muted">
          {unpublished ? (
            <>
              <code className="rounded-md bg-docs-code px-1.5 py-0.5 font-mono text-docs-accent-fg">
                /{org}/{project}
              </code>{" "}
              exists in Frond, but nothing has been published to the docs site yet.
            </>
          ) : missing ? (
            <>
              No organization/project matched{" "}
              <code className="rounded-md bg-docs-code px-1.5 py-0.5 font-mono text-docs-accent-fg">
                /{org}/{project}
              </code>
              .
            </>
          ) : (
            <>Could not load docs ({error}). Is the API running on :8080?</>
          )}
        </p>
        {unpublished && (
          <pre className="mt-6 overflow-auto rounded-xl border border-docs-border bg-docs-card p-4 text-left font-mono text-xs text-docs-fg shadow-docs-sm">
{`frond init
frond docs publish --project-id <project-uuid>`}
          </pre>
        )}
        <p className="mt-6 text-xs text-docs-muted">
          Creating an org/project in the dashboard does not publish docs by itself.{" "}
          <Link href="/" className="font-medium text-docs-accent underline-offset-4 hover:underline">
            Back
          </Link>
        </p>
      </div>
    </div>
  );
}
