import fs from "fs";
import path from "path";

function fixDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const full = path.join(dir, file);

    if (fs.statSync(full).isDirectory()) {
      fixDir(full);
      continue;
    }

    if (!file.endsWith(".js")) continue;

    let content = fs.readFileSync(full, "utf8");

    let changed = false;
    content = content.replace(
      /from\s+["'](\.\.?\/[^"']+)["']/g,
      (match, p1) => {
        if (p1.endsWith(".js") || p1.endsWith(".json")) return match;

        const targetPathFull = path.join(path.dirname(full), p1);

        // Case 1: If it's a directory, check if it has an index.js
        if (fs.existsSync(targetPathFull) && fs.statSync(targetPathFull).isDirectory()) {
             const indexPath = path.join(targetPathFull, "index.js");
             if (fs.existsSync(indexPath)) {
                  changed = true;
                  return match.replace(p1, `${p1}/index.js`);
             }
        }

        // Case 2: Append .js by default for all others
        changed = true;
        return match.replace(p1, `${p1}.js`);
      },
    );

    if (changed) {
      fs.writeFileSync(full, content);
      // console.log(`Fixed imports in ${full}`);
    }
  }
}

fixDir("./dist");
