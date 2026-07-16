import chalk from "chalk";
import ora from "ora";
import { saveCredentials, loadCredentials } from "../utils.js";

export async function loginCommand(opts: {
  apiUrl: string;
  apiKey?: string;
  token?: string;
}) {
  const apiUrl = opts.apiUrl || process.env.FROND_API_URL || "http://localhost:8080";

  // API key login (Fern-style CI / local)
  if (opts.apiKey || process.env.FROND_API_KEY) {
    const apiKey = opts.apiKey || process.env.FROND_API_KEY!;
    if (!apiKey.startsWith("frond_")) {
      throw new Error("API key should start with frond_ (create one in Dashboard → API keys)");
    }
    const spinner = ora("Saving API key").start();
    await saveCredentials({ apiUrl, apiKey, token: undefined });
    spinner.succeed("Authenticated with API key");
    console.log(chalk.dim("Credentials saved to ~/.frond/credentials.json"));
    console.log(chalk.dim("\nNext:"));
    console.log(`  ${chalk.cyan("frond docs publish --project-id <uuid>")}`);
    console.log(`  or set projectId in frond/frond.config.json\n`);
    return;
  }

  // JWT token (e.g. from demo login)
  if (opts.token || process.env.FROND_TOKEN) {
    const token = opts.token || process.env.FROND_TOKEN!;
    await saveCredentials({ apiUrl, token, apiKey: undefined });
    console.log(chalk.green("✓"), "Authenticated with token");
    console.log(chalk.dim("Credentials saved to ~/.frond/credentials.json\n"));
    return;
  }

  // Fallback: Google OAuth browser flow
  const { createServer } = await import("node:http");
  const open = (await import("open")).default;

  const redirectUri = "http://localhost:9876/callback";
  const authUrl = `${apiUrl}/v1/auth/google?redirect_uri=${encodeURIComponent(redirectUri)}`;

  console.log(chalk.bold("\nFrond Login"));
  console.log(chalk.dim("Opening browser for Google sign-in..."));
  console.log(chalk.dim("Or use: frond login --api-key frond_...\n"));

  const spinner = ora("Waiting for authentication").start();

  const token = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Login timed out after 2 minutes"));
    }, 120_000);

    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", "http://localhost:9876");
      if (url.pathname === "/callback") {
        const t = url.searchParams.get("token");
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(
          "<html><body><h2>Logged in to Frond! You can close this window.</h2></body></html>",
        );
        clearTimeout(timeout);
        server.close();
        if (t) resolve(t);
        else reject(new Error("No token in callback"));
      }
    });

    server.listen(9876, () => {
      void open(authUrl);
    });

    server.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  await saveCredentials({ apiUrl, token });
  spinner.succeed("Authenticated with Frond");
  console.log(chalk.dim("Credentials saved to ~/.frond/credentials.json\n"));
}

export async function whoamiCommand() {
  const creds = await loadCredentials();
  if (!creds.apiKey && !creds.token) {
    console.log(chalk.yellow("Not authenticated."));
    console.log(`Run ${chalk.cyan("frond login --api-key frond_...")} or create a key in the dashboard.`);
    return;
  }
  console.log(chalk.bold("Frond credentials"));
  console.log(`  API URL : ${creds.apiUrl}`);
  if (creds.apiKey) {
    console.log(`  Auth    : API key (${creds.apiKey.slice(0, 12)}…)`);
  } else {
    console.log(`  Auth    : JWT token`);
  }

  try {
    if (creds.token) {
      const res = await fetch(`${creds.apiUrl}/v1/auth/me`, {
        headers: { Authorization: `Bearer ${creds.token}` },
      });
      if (res.ok) {
        const user = (await res.json()) as { email?: string; name?: string };
        console.log(`  User    : ${user.name || user.email || "ok"}`);
      }
    } else {
      console.log(chalk.dim("  (API keys authenticate publish/CI; use JWT for /me)"));
    }
  } catch {
    /* ignore */
  }
  console.log();
}
