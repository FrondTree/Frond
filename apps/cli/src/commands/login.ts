import { createServer } from "node:http";
import open from "open";
import chalk from "chalk";
import ora from "ora";
import { saveCredentials } from "../utils.js";

export async function loginCommand(opts: { apiUrl: string }) {
  const redirectUri = "http://localhost:9876/callback";
  const authUrl = `${opts.apiUrl}/v1/auth/google?redirect_uri=${encodeURIComponent(redirectUri)}`;

  console.log(chalk.bold("\nFrond Login"));
  console.log(chalk.dim("Opening browser for Google sign-in...\n"));

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

  await saveCredentials({ apiUrl: opts.apiUrl, token });
  spinner.succeed("Authenticated with Frond");
  console.log(chalk.dim("Credentials saved to ~/.frond/credentials.json\n"));
}
