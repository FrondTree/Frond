import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const CREDENTIALS_PATH = path.join(homedir(), ".frond", "credentials.json");

export interface Credentials {
  token?: string;
  apiKey?: string;
  apiUrl: string;
}

export async function loadCredentials(): Promise<Credentials> {
  const apiUrl = process.env.FROND_API_URL ?? "http://localhost:8080";
  const envApiKey = process.env.FROND_API_KEY;
  const envToken = process.env.FROND_TOKEN;
  try {
    const raw = await readFile(CREDENTIALS_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Credentials;
    return {
      ...parsed,
      apiUrl: process.env.FROND_API_URL ?? parsed.apiUrl ?? apiUrl,
      apiKey: envApiKey ?? parsed.apiKey,
      token: envToken ?? parsed.token,
    };
  } catch {
    return { apiUrl, apiKey: envApiKey, token: envToken };
  }
}

export async function saveCredentials(creds: Credentials): Promise<void> {
  await mkdir(path.dirname(CREDENTIALS_PATH), { recursive: true });
  await writeFile(CREDENTIALS_PATH, JSON.stringify(creds, null, 2), {
    mode: 0o600,
  });
}

export function authHeader(creds: Credentials): Record<string, string> {
  if (creds.apiKey) return { "X-Frond-Api-Key": creds.apiKey };
  if (creds.token) return { Authorization: `Bearer ${creds.token}` };
  return {};
}
