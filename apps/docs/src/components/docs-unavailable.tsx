import Link from "next/link";

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
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold text-zinc-100">
        {unpublished ? "Docs not published yet" : missing ? "Project not found" : "Docs unavailable"}
      </h1>
      <p className="mt-3 max-w-lg text-sm text-zinc-400">
        {unpublished ? (
          <>
            <code className="text-emerald-400">
              /{org}/{project}
            </code>{" "}
            exists in Frond, but nothing has been published to the docs site yet.
          </>
        ) : missing ? (
          <>
            No organization/project matched{" "}
            <code className="text-emerald-400">
              /{org}/{project}
            </code>
            .
          </>
        ) : (
          <>Could not load docs ({error}). Is the API running on :8080?</>
        )}
      </p>
      {unpublished && (
        <pre className="mt-6 max-w-xl overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-left text-xs text-zinc-300">
{`frond init
frond docs publish --project-id <project-uuid>`}
        </pre>
      )}
      <p className="mt-6 text-xs text-zinc-500">
        Creating an org/project in the dashboard does not publish docs by itself.{" "}
        <Link href="/" className="text-emerald-400 hover:underline">
          Back
        </Link>
      </p>
    </div>
  );
}
