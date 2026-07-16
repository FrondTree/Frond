#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { initCommand } from "./commands/init.js";
import { validateCommand } from "./commands/validate.js";
import { doctorCommand } from "./commands/doctor.js";
import { docsDevCommand } from "./commands/docs-dev.js";
import { docsPublishCommand } from "./commands/docs-publish.js";
import { docsBuildCommand } from "./commands/docs-build.js";
import { generateCommand } from "./commands/generate.js";
import { loginCommand } from "./commands/login.js";
import { diffCommand } from "./commands/diff.js";

const program = new Command();

program
  .name("frond")
  .description("Frond — developer documentation platform")
  .version("0.1.0");

program
  .command("init")
  .description("Initialize a new Frond documentation project")
  .action(initCommand);

program
  .command("validate")
  .description("Validate Frond configuration and OpenAPI specs")
  .action(validateCommand);

program
  .command("doctor")
  .description("Diagnose configuration and documentation health issues")
  .action(doctorCommand);

program
  .command("login")
  .description("Authenticate with Frond cloud via Google")
  .option("--api-url <url>", "Frond API URL", process.env.FROND_API_URL ?? "http://localhost:8080")
  .action(loginCommand);

const docs = program.command("docs").description("Documentation commands");

docs
  .command("dev")
  .description("Start local documentation dev server")
  .option("-p, --port <port>", "Port", "3002")
  .action(docsDevCommand);

docs
  .command("publish")
  .description("Publish documentation to Frond cloud")
  .option("--project-id <id>", "Project UUID (required)")
  .action(docsPublishCommand);

docs
  .command("build")
  .description("Build a static docs bundle (manifest + assets)")
  .option("-o, --out <dir>", "Output directory", "frond-out")
  .action(docsBuildCommand);

program
  .command("generate")
  .description("Generate SDKs from OpenAPI")
  .option("-g, --group <group>", "Generator group", "local")
  .action(generateCommand);

program
  .command("diff")
  .description("Compare two API versions")
  .option("--from <version>", "Source version id")
  .option("--to <version>", "Target version id")
  .action(diffCommand);

program.parseAsync(process.argv).catch((err: Error) => {
  console.error(chalk.red("Error:"), err.message);
  process.exit(1);
});
