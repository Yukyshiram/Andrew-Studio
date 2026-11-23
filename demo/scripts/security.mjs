import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const root = path.resolve(import.meta.dirname, "../..");
const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root })
  .toString()
  .split("\0")
  .filter(Boolean);
const bad = [];
const secret =
  /(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----|APP_KEY=base64:[A-Za-z0-9+/]{40})/;
for (const file of tracked) {
  if (
    /(^|\/)(\.env(\.(?!example$).*)?|auth\.json)$|\.(sqlite|pem|key|zip)$|(^|\/)(node_modules|vendor)\/|modern\/storage\/(?!.*\.gitignore$)/.test(
      file,
    )
  )
    bad.push(file);
  else if (
    fs.existsSync(path.join(root, file)) &&
    secret.test(fs.readFileSync(path.join(root, file), "utf8"))
  )
    bad.push(file);
}
function inspect(dir) {
  for (const file of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, file.name);
    if (file.isDirectory()) inspect(p);
    else if (
      /\.(php|sql|sqlite|env|pem|key)$/i.test(file.name) ||
      secret.test(fs.readFileSync(p, "utf8"))
    )
      bad.push(path.relative(root, p));
  }
}
inspect(path.join(root, "dist"));
if (bad.length) {
  console.error("Archivos que requieren revisión (sin mostrar valores):", [
    ...new Set(bad),
  ]);
  process.exit(1);
}
console.log(
  "Sin secretos de alta confianza ni archivos de servidor/configuración privada en dist. Escaneo heurístico, no certificación.",
);
