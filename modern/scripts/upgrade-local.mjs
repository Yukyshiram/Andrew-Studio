import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const modern = path.resolve(import.meta.dirname, "..");
const maintenance = path.join(modern, "storage/framework/down");
if (fs.existsSync(maintenance))
    throw new Error(
        "Ya existe un modo de mantenimiento. Se conserva; no se inició la actualización.",
    );
const backup = JSON.parse(
    execFileSync(
        process.execPath,
        [path.join(import.meta.dirname, "backup-local.mjs")],
        { encoding: "utf8", cwd: modern },
    ),
);
function snapshot(columns = null) {
    const encoded = Buffer.from(JSON.stringify(columns)).toString("base64");
    const code = `require "vendor/autoload.php"; $app = require "bootstrap/app.php"; $app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap(); $previous = json_decode(base64_decode("${encoded}"), true); $out = []; foreach (["users", "books", "import_batches", "audit_events"] as $table) { $columns = $previous[$table]["columns"] ?? Illuminate\\Support\\Facades\\Schema::getColumnListing($table); $rows = Illuminate\\Support\\Facades\\DB::table($table)->select($columns)->orderBy("id")->get(); $out[$table] = ["columns" => $columns, "rows" => $rows->count(), "sha256" => hash("sha256", json_encode($rows, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR))]; } echo json_encode($out, JSON_THROW_ON_ERROR);`;
    return JSON.parse(
        execFileSync(
            "docker",
            ["compose", "exec", "-T", "app", "php", "-r", code],
            { cwd: modern, encoding: "utf8" },
        ),
    );
}
function artisan(...args) {
    execFileSync(
        "docker",
        ["compose", "exec", "-T", "app", "php", "artisan", ...args],
        { cwd: modern, stdio: "inherit" },
    );
}
let verified = false;
try {
    artisan("down", "--retry=15");
    const before = snapshot();
    artisan("migrate", "--force", "--no-interaction");
    const after = snapshot(before);
    verified = Object.keys(before).every(
        (table) =>
            before[table].rows === after[table].rows &&
            before[table].sha256 === after[table].sha256,
    );
    const report = {
        recordedAt: new Date().toISOString(),
        backup: path.basename(backup.file),
        existingDataPreserved: verified,
        before,
        after,
        restoreVerified: false,
    };
    fs.writeFileSync(
        `${backup.file}.upgrade.json`,
        JSON.stringify(report, null, 2) + "\n",
        { flag: "wx" },
    );
    if (!verified)
        throw new Error(
            "La comparación detectó cambios en datos previos. Se conserva el respaldo y el mantenimiento para revisión.",
        );
    console.log(
        JSON.stringify({
            existingDataPreserved: true,
            backup: backup.file,
            additiveMigration: true,
            demoSeedExecuted: false,
            restoreVerified: false,
        }),
    );
} finally {
    if (verified) artisan("up");
    else
        console.error(
            "No se levantó el mantenimiento automáticamente; revisa el resultado antes de continuar.",
        );
}
