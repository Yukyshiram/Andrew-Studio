import fs from "node:fs";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { createHash } from "node:crypto";

const modern = path.resolve(import.meta.dirname, "..");
const configCode =
    'require "vendor/autoload.php"; $app = require "bootstrap/app.php"; $app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap(); $connection = Illuminate\\Support\\Facades\\DB::connection(); echo json_encode(array_intersect_key($connection->getConfig(), array_flip(["driver", "host", "database", "unix_socket"])), JSON_THROW_ON_ERROR);';
const config = JSON.parse(
    execFileSync(
        "docker",
        ["compose", "exec", "-T", "app", "php", "-r", configCode],
        { cwd: modern, encoding: "utf8" },
    ),
);
const database = execFileSync(
    "docker",
    [
        "compose",
        "exec",
        "-T",
        "db",
        "sh",
        "-c",
        'printf "%s" "$MYSQL_DATABASE"',
    ],
    { cwd: modern, encoding: "utf8" },
).trim();
if (
    config.driver !== "mysql" ||
    config.host !== "db" ||
    config.unix_socket ||
    config.database !== database ||
    !/^[A-Za-z0-9_]+$/.test(database)
) {
    throw new Error(
        "La conexión de la aplicación no coincide con el MySQL local que se va a respaldar. No se modificó la base.",
    );
}
const directory = path.resolve(modern, "../.local/backups");
fs.mkdirSync(directory, { recursive: true });
const filename = `library-before-v3-${new Date().toISOString().replace(/[:.]/g, "-")}.sql`;
const target = path.join(directory, filename);
const child = spawn(
    "docker",
    [
        "compose",
        "exec",
        "-T",
        "db",
        "sh",
        "-c",
        'MYSQL_PWD="$MYSQL_PASSWORD" mysqldump --user="$MYSQL_USER" --single-transaction --no-tablespaces --skip-lock-tables --set-gtid-purged=OFF --default-character-set=utf8mb4 "$MYSQL_DATABASE"',
    ],
    { cwd: modern, stdio: ["ignore", "pipe", "pipe"] },
);
const completed = new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
});
child.stderr.resume();
await pipeline(child.stdout, fs.createWriteStream(target, { flags: "wx" }));
if ((await completed) !== 0 || fs.statSync(target).size < 1000) {
    throw new Error(
        "El respaldo no se completó. Se conserva el archivo parcial para revisión; no apliques migraciones.",
    );
}
const hash = createHash("sha256");
for await (const chunk of fs.createReadStream(target)) hash.update(chunk);
const manifest = {
    file: filename,
    bytes: fs.statSync(target).size,
    sha256: hash.digest("hex"),
    createdAt: new Date().toISOString(),
    restoreVerified: false,
};
fs.writeFileSync(`${target}.json`, JSON.stringify(manifest, null, 2) + "\n", {
    flag: "wx",
});
console.log(
    JSON.stringify({
        backupCreated: true,
        file: target,
        bytes: manifest.bytes,
        sha256: manifest.sha256,
        restoreVerified: false,
    }),
);
