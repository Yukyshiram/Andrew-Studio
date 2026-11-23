import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const browsers = path.resolve(root, "..", ".local", "browsers");
const result = spawnSync(
    process.execPath,
    [
        path.join(root, "node_modules", "@playwright", "test", "cli.js"),
        ...process.argv.slice(2),
    ],
    {
        cwd: root,
        stdio: "inherit",
        env: {
            ...process.env,
            PLAYWRIGHT_BROWSERS_PATH:
                process.env.PLAYWRIGHT_BROWSERS_PATH || browsers,
        },
    },
);
process.exit(result.status ?? 1);
