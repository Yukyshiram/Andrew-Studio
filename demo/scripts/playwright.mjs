import { spawnSync } from "node:child_process";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "../..");
const result = spawnSync(
  process.execPath,
  [
    path.join(root, "node_modules/@playwright/test/cli.js"),
    ...process.argv.slice(2),
    ...(process.argv[2] === "test"
      ? ["--config", "demo/playwright.config.ts"]
      : []),
  ],
  {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      PLAYWRIGHT_BROWSERS_PATH:
        process.env.PLAYWRIGHT_BROWSERS_PATH ||
        path.join(root, ".local/browsers"),
    },
  },
);
process.exit(result.status ?? 1);
