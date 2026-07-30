import { cpSync, mkdirSync, rmSync, writeFileSync, existsSync, readdirSync, statSync } from "fs";
import { join } from "path";

const root = process.cwd();
const dist = join(root, "dist");
rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, "data"), { recursive: true });
mkdirSync(join(dist, "media"), { recursive: true });

const files = [
  "index.html", "app.js", "play.js", "games.js",
  "_headers", "_redirects", "README.md"
];
for (const f of files) {
  const p = join(root, f);
  if (existsSync(p)) cpSync(p, join(dist, f));
}
if (existsSync(join(root, "data"))) {
  for (const f of readdirSync(join(root, "data"))) {
    cpSync(join(root, "data", f), join(dist, "data", f));
  }
}
// skip mp4 > 20MB
const mediaDir = join(root, "media");
if (existsSync(mediaDir)) {
  for (const f of readdirSync(mediaDir)) {
    const fp = join(mediaDir, f);
    const st = statSync(fp);
    if (st.isFile() && st.size < 20 * 1024 * 1024) {
      cpSync(fp, join(dist, "media", f));
    }
  }
}
writeFileSync(
  join(dist, "media", "README.txt"),
  "Large promo video is served from GitHub CDN, not Pages (25 MiB limit).\n"
);
console.log("dist ready (mp4 excluded if >20MB)");
