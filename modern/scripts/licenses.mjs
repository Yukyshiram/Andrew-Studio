import fs from "node:fs";
import path from "node:path";

const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const packages = Object.entries(lock.packages)
    .filter(([location]) => location)
    .map(([location, pkg]) => {
        const manifestPath = path.join(location, "package.json");
        const installed = fs.existsSync(manifestPath)
            ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
            : {};
        return {
            name: installed.name || location.split("node_modules/").at(-1),
            version: pkg.version,
            license: installed.license || pkg.license || "REVISAR",
            development: !!pkg.dev,
            optional: !!pkg.optional,
        };
    });
const report = {
    generatedAt: new Date().toISOString(),
    applicationLicense: "GPL-3.0-only",
    packages,
};
fs.mkdirSync("../docs/evidence", { recursive: true });
fs.writeFileSync(
    "../docs/evidence/npm-licenses.json",
    JSON.stringify(report, null, 2),
);
const pending = packages.filter((pkg) => pkg.license === "REVISAR");
console.log(
    `${packages.length} licencias inventariadas; ${pending.length} pendientes de identificación.`,
);
if (pending.length) process.exitCode = 1;

const notices = [
    "Andrew's Bibliotecary 2.0 — avisos de dependencias frontend",
    "La aplicación se distribuye bajo GPL-3.0-only. Las dependencias conservan sus licencias originales.",
    "Estos textos se copian sin cambios de los paquetes instalados desde package-lock.json.",
];
const missingNotices = [];
for (const [location, pkg] of Object.entries(lock.packages)) {
    if (
        !location ||
        pkg.dev ||
        !fs.existsSync(path.join(location, "package.json"))
    )
        continue;
    const manifest = JSON.parse(
        fs.readFileSync(path.join(location, "package.json"), "utf8"),
    );
    const files = fs
        .readdirSync(location)
        .filter(
            (name) =>
                /^(licen[cs]e|copying|notice)([.\-].*)?$/i.test(name) &&
                fs.statSync(path.join(location, name)).isFile(),
        );
    if (!files.length) {
        const supplemental = path.join(
            "legal",
            `${manifest.name.replaceAll("/", "-")}-LICENSE.txt`,
        );
        if (fs.existsSync(supplemental)) {
            notices.push(
                `\n${"=".repeat(72)}\n${manifest.name} ${pkg.version} — aviso upstream suplementario (procedencia en legal/)\n${"=".repeat(72)}\n`,
                fs.readFileSync(supplemental, "utf8"),
            );
        } else {
            missingNotices.push(manifest.name);
        }
        continue;
    }
    for (const file of files) {
        notices.push(
            `\n${"=".repeat(72)}\n${manifest.name} ${pkg.version} — ${file}\n${"=".repeat(72)}\n`,
            fs.readFileSync(path.join(location, file), "utf8"),
        );
    }
}
fs.mkdirSync("public/licenses", { recursive: true });
fs.writeFileSync(
    "public/licenses/THIRD_PARTY_NOTICES.txt",
    notices.join("\n\n"),
);
fs.copyFileSync("LICENSE", "public/licenses/APPLICATION-GPL-3.0.txt");
console.log(
    `Avisos frontend conservados; ${missingNotices.length} paquetes instalados sin texto de licencia localizado.`,
);
if (missingNotices.length) {
    console.error(missingNotices.join(", "));
    process.exitCode = 1;
}
