import fs from "node:fs";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "../..");
const lock = JSON.parse(
  fs.readFileSync(path.join(root, "package-lock.json"), "utf8"),
);
const notices = [
  "ANDREW'S BIBLIOTECARY — DEMO ESTÁTICA\nProyecto GPL-3.0-only. Los componentes de terceros conservan sus licencias originales.\n",
];
const missing = [];
const inventory = [];
for (const [entry, info] of Object.entries(lock.packages)) {
  if (!entry || info.dev) continue;
  const dir = path.join(root, entry);
  if (!fs.existsSync(dir)) continue;
  const pkg = JSON.parse(
    fs.readFileSync(path.join(dir, "package.json"), "utf8"),
  );
  const files = fs
    .readdirSync(dir)
    .filter(
      (name) =>
        /^(licen[sc]e|copying|notice|ofl)([.-]|$)/i.test(name) &&
        fs.statSync(path.join(dir, name)).isFile(),
    );
  const label = `${pkg.name}@${pkg.version} (${pkg.license ?? info.license ?? "consultar aviso"})`;
  inventory.push({
    name: pkg.name,
    version: pkg.version,
    license: pkg.license ?? info.license,
  });
  if (
    !files.length &&
    pkg.name === "react-remove-scroll-bar" &&
    pkg.version === "2.3.8"
  ) {
    notices.push(
      label +
        "\n" +
        fs.readFileSync(
          path.join(root, "modern/legal/react-remove-scroll-bar-LICENSE.txt"),
          "utf8",
        ),
    );
  } else if (!files.length) missing.push(label);
  else
    notices.push(
      label +
        "\n" +
        files
          .map((file) => fs.readFileSync(path.join(dir, file), "utf8"))
          .join("\n"),
    );
}
if (missing.length) throw new Error("Avisos pendientes: " + missing.join(", "));
const out = path.join(root, "demo/public/licenses");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(
  path.join(out, "THIRD_PARTY_NOTICES.txt"),
  notices.join("\n\n" + "=".repeat(72) + "\n\n"),
);
fs.copyFileSync(
  path.join(root, "LICENSE"),
  path.join(out, "APPLICATION-GPL-3.0.txt"),
);
fs.mkdirSync(path.join(root, "docs/evidence"), { recursive: true });
fs.writeFileSync(
  path.join(root, "docs/evidence/demo-licenses.json"),
  JSON.stringify(inventory, null, 2) + "\n",
);
console.log(
  `Avisos de ${inventory.length} dependencias de ejecución conservados.`,
);
