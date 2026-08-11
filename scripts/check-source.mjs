import { readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";

const sourceRoot = join(process.cwd(), "src");

function listJavaScriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return listJavaScriptFiles(path);
      return entry.isFile() && entry.name.endsWith(".js") ? [path] : [];
    })
    .sort();
}

const sourceFiles = listJavaScriptFiles(sourceRoot);
for (const sourceFile of sourceFiles) {
  const result = spawnSync(process.execPath, ["--check", sourceFile], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log(`Source syntax OK (${sourceFiles.length} files under ${relative(process.cwd(), sourceRoot)}).`);
