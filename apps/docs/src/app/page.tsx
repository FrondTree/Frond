import Link from "next/link";

export default function DocsHome() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <h1 className="text-3xl font-bold">Frond Docs</h1>
      <p className="mt-4 max-w-md text-zinc-400">
        Published documentation is served at{" "}
        <code className="text-indigo-400">/:org/:project</code>
      </p>
      <p className="mt-6 text-sm text-zinc-500">
        Example:{" "}
        <Link href="/my-org/my-api" className="text-indigo-400 hover:underline">
          /my-org/my-api
        </Link>
      </p>
    </div>
  );
}
