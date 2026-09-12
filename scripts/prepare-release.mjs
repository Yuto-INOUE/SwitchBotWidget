// リリースに添付する成果物と、updater が参照する latest.json を用意する。
// ローカルでも `npm run bundle` のあとに実行して中身を確認できる。
import { copyFileSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const NSIS_DIR = "target/release/bundle/nsis";
const OUT_DIR = "artifacts";

const version = JSON.parse(readFileSync("tauri.conf.json", "utf8")).version;
const repository = process.env.GITHUB_REPOSITORY ?? "Yuto-INOUE/SwitchBotWidget";
const ref = process.env.GITHUB_REF_NAME ?? "";
const tag = ref.startsWith("v") ? ref : `v${version}`;

const setup = readdirSync(NSIS_DIR).find((name) => name.endsWith("-setup.exe"));
if (!setup) throw new Error(`${NSIS_DIR} にインストーラが見つかりません。先に npm run bundle を実行してください`);

mkdirSync(OUT_DIR, { recursive: true });

// 配布時に扱いやすいよう、空白を含まない名前に付け替える
const installer = `SwitchBotWidget-${version}-x64-setup.exe`;
copyFileSync(join(NSIS_DIR, setup), join(OUT_DIR, installer));
copyFileSync(
  "target/release/switchbot-widget.exe",
  join(OUT_DIR, `SwitchBotWidget-${version}-x64-portable.exe`),
);

// 署名はビルド時に TAURI_SIGNING_PRIVATE_KEY が設定されていれば作られる
const signaturePath = join(NSIS_DIR, `${setup}.sig`);
let signature = "";
try {
  signature = readFileSync(signaturePath, "utf8").trim();
} catch {
  throw new Error(
    `${signaturePath} がありません。TAURI_SIGNING_PRIVATE_KEY を設定してビルドし直してください`,
  );
}

const manifest = {
  version,
  notes: `SwitchBot Widget ${version}`,
  pub_date: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
  platforms: {
    "windows-x86_64": {
      signature,
      url: `https://github.com/${repository}/releases/download/${tag}/${installer}`,
    },
  },
};
writeFileSync(join(OUT_DIR, "latest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

for (const name of readdirSync(OUT_DIR)) {
  const size = statSync(join(OUT_DIR, name)).size / 1024 / 1024;
  console.log(`${name}  ${size.toFixed(2)} MB`);
}
console.log(`\n更新の配信先: ${manifest.platforms["windows-x86_64"].url}`);
