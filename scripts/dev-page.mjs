import { spawn } from "node:child_process";
import { parseArgs } from "./utils.mjs";

const args = parseArgs(process.argv.slice(2));
const extraArgs = [];

if (args.page) {
  extraArgs.push("--page", args.page);
}

if (args.port) {
  extraArgs.push("--port", args.port);
}

const child = spawn(process.execPath, ["./scripts/dev-user.mjs", "--mode", "page", ...extraArgs], {
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
