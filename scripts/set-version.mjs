// tauri.conf.json / package.json / Cargo.toml のバージョンをまとめて書き換える
import { readFileSync, writeFileSync } from "node:fs";

const version = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(version ?? "")) {
  console.error("使い方: npm run version:set -- 0.2.0");
  process.exit(1);
}

const updateJson = (path) => {
  const data = JSON.parse(readFileSync(path, "utf8"));
  data.version = version;
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
};

updateJson("tauri.conf.json");
updateJson("package.json");
writeFileSync(
  "Cargo.toml",
  readFileSync("Cargo.toml", "utf8").replace(/^version = ".+"$/m, `version = "${version}"`),
);

console.log(`バージョンを ${version} にしました。`);
console.log("Cargo.lock を合わせるため、続けて cargo check を実行してください。");
