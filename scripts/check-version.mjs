// タグ（v0.2.0）と各ファイルのバージョン表記がそろっているか確かめる
import { readFileSync } from "node:fs";

const tag = (process.argv[2] ?? "").replace(/^v/, "");
if (!tag) {
  console.error("タグを引数に渡してください（例: node scripts/check-version.mjs v0.1.0）");
  process.exit(1);
}

const versions = {
  "tauri.conf.json": JSON.parse(readFileSync("tauri.conf.json", "utf8")).version,
  "package.json": JSON.parse(readFileSync("package.json", "utf8")).version,
  "Cargo.toml": readFileSync("Cargo.toml", "utf8").match(/^version = "(.+)"$/m)?.[1],
};

const mismatched = Object.entries(versions).filter(([, value]) => value !== tag);
if (mismatched.length > 0) {
  console.error(`タグ ${tag} と一致しないバージョン表記があります:`);
  for (const [file, value] of mismatched) console.error(`  ${file}: ${value}`);
  console.error("\nnpm run version:set -- <新しいバージョン> でまとめて更新できます。");
  process.exit(1);
}
console.log(`バージョン ${tag} は 3 ファイルとも一致しています。`);
