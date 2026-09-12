# SwitchBot Widget

デスクトップに常駐する SwitchBot リモコンウィジェット（Windows 向け）。

タスクトレイに常駐し、枠なしの小さなウィンドウから SwitchBot のデバイスを直接操作します。

## 技術構成

| 層 | 採用 | 役割 |
| --- | --- | --- |
| シェル | **Tauri v2**（Rust） | ウィンドウ・トレイ・常駐。実行ファイル 4.4MB |
| 画面 | **React 19 + TypeScript + Vite** | 表示とユーザー操作 |
| 通信 | Rust の reqwest（rustls） | SwitchBot Open API v1.1。HMAC-SHA256 署名 |
| 資格情報 | Windows 資格情報マネージャー | トークンをファイルに平文で置かない |

トークンとシークレットは Rust 側に閉じていて、WebView（React 側）には渡りません。
画面から外部への通信も行わず、API 呼び出しはすべて Rust 経由です。

### 常駐時のメモリ（この環境での実測値）

| 内訳 | 専有メモリ |
| --- | --- |
| 本体プロセス（Rust） | 約 6 MB |
| WebView2 プロセス群（6 個） | 約 78 MB |
| **合計** | **約 85 MB** |

「専有メモリ」は Private Working Set です。タスクマネージャーに出る WorkingSet は
約 380MB になりますが、その大半は他の WebView2 アプリと共有しているランタイムのページで、
このアプリが増やしている分ではありません。

Chromium のレンダラーを使う以上、描画部分のコストは Electron と同種です。効いているのは
Node.js ランタイムを抱えないことと、`additionalBrowserArgs`（`tauri.conf.json`）で
WebView2 の常駐機能（同期・バックグラウンド通信・コンポーネント更新）を止めている点です。

## インストール

[Releases](https://github.com/Yuto-INOUE/SwitchBotWidget/releases) から
`SwitchBotWidget-x.y.z-x64-setup.exe` をダウンロードして実行してください。
インストールせずに試すなら `-portable.exe` をそのまま起動できます。

コード署名をしていないので、初回起動時に Windows SmartScreen の警告が出ます。
「詳細情報」→「実行」で進めてください。

インストーラ版は設定画面から更新を確認でき、新しいバージョンがあればその場で適用できます
（起動時の自動確認は設定で切れます）。

## 使いかた

### 1. トークンを取得する

1. スマートフォンの SwitchBot アプリを開く
2. **プロフィール → 設定**
3. **アプリバージョン**を 10 回タップ
4. 現れた**開発者向けオプション**を開く
5. **トークン**と**クライアントシークレット**をコピー

### 2. 接続する

初回起動時に入力欄が出るので、トークンとシークレットを貼り付けて「接続する」を押します。
入力値は接続確認に成功した場合のみ Windows 資格情報マネージャー（`SwitchBotWidget`）に保存されます。

### 3. 常駐操作

| 操作 | 動作 |
| --- | --- |
| トレイアイコンを左クリック | ウィンドウの表示 / 非表示 |
| トレイアイコンを右クリック | メニュー（表示・更新・設定・終了） |
| ヘッダーをドラッグ | ウィンドウの移動（位置は記憶され、画面の端に吸着します） |
| ヘッダーのリストアイコン | 表示するデバイスを選ぶ画面 |
| `×` ボタン | ウィンドウを隠す（常駐は継続） |
| `Esc` | 別画面なら一覧へ戻る / 一覧ならウィンドウを隠す |
| `F5` | デバイスの再読み込み |
| 設定 → アプリを終了 | 完全に終了 |

「Windows 起動時に常駐」を有効にすると、次回ログオン時からウィンドウを出さずトレイにだけ常駐します。

### 画面の端への吸着

ドラッグを終えた位置がモニタの端から 24px（論理）以内なら、その辺にぴったり寄せます。
上下左右それぞれで判定するので、角に置けば両方に吸着します。基準はタスクバーを除いた
作業領域なので、下端に寄せてもタスクバーの下に潜り込みません。

マルチモニタでは、**隣のモニタが接している辺には吸着しません**。吸着してしまうと
その方向へウィンドウを送り出せなくなるためです。判定はモニタの辺全体ではなく
「ウィンドウが実際に接触区間にかかっているか」で行うので、たとえば下側に小さいモニタが
ぶら下がっている構成なら、そのモニタの真上では吸着せず、横にずれた位置では下端に吸着します。

拡大率がモニタごとに異なる環境でも正しく働くよう、Per-Monitor V2 の DPI 対応を
マニフェスト（`windows-app.manifest`）で宣言しています。吸着が不要なら設定画面の
「画面の端に吸着させる」で切れます。

### 表示するデバイスを絞る

PC から操作したいデバイスは限られるので、メイン画面に出すものは専用画面で選びます。
ヘッダーのリストアイコン（または設定 →「表示するデバイスを選ぶ」）から開きます。

- 行をクリックで表示 / 非表示を切り替え
- 「表示中」の行の ▲▼ で並び順を変更（非表示のデバイスは飛び越えます）
- ハブ本体など操作できない機器は「操作に対応していない機器」としてまとめて表示

選ばれたデバイスだけが、1 台あたり大きめのカードで一覧に並びます。状態の自動取得も
表示中のデバイスだけが対象です。

## 対応している操作

| デバイス | 操作 |
| --- | --- |
| Bot | ON / OFF / 押す |
| プラグ、プラグミニ、リレースイッチ | ON / OFF |
| スマート電球、テープライト、シーリングライト | ON / OFF、明るさ、色、色温度 |
| カーテン、ブラインドポール | 開 / 停 / 閉、開度指定 |
| スマートロック | 施錠 / 解錠 |
| 温湿度計、ハブ2、各種センサー | 温度・湿度・電池残量の表示 |
| ロボット掃除機 | 開始 / 停止 / 充電に戻る |
| 加湿器、空気清浄機、サーキュレーター | ON / OFF |
| 赤外線エアコン | ON / OFF、温度、モード、風量 |
| 赤外線 TV / STB / DVD / スピーカー | ON / OFF、音量、チャンネル |
| 赤外線 照明・扇風機・その他 | ON / OFF、明るさ、風量、首振り |

赤外線リモコンは仕様上こちらから状態を読み出せないため、エアコンの設定値は**最後に送った内容**を
ローカルに記憶して表示しています。電源が切れている状態で温度だけ変えた場合は、送信せず記憶だけ更新します。

## 設定とデータの保存先

| 内容 | 場所 |
| --- | --- |
| トークン / シークレット | Windows 資格情報マネージャー（汎用資格情報 `SwitchBotWidget`） |
| ウィンドウ位置・並び順・表示設定 | `%APPDATA%\jp.local.switchbot-widget\config.json` |
| 自動起動 | `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` |

「接続を解除」を押すと資格情報だけを削除します。

## API の呼び出し回数について

SwitchBot Open API は **1 日あたり 10,000 回**の上限があります。

- 状態の自動更新は既定で **5 分ごと**（設定で変更・無効化できます）
- ウィンドウを隠している間、および一覧以外の画面では更新しません
- 状態を取得するのは実機デバイスのみで、同時 3 件までに絞っています

デバイスが多い場合は更新間隔を延ばすか、表示するデバイスを絞ってください。

## 開発

```sh
npm install          # 初回のみ

npm test             # 画面ロジックのテスト（vitest）
cargo test           # 署名生成などのテスト

npm run dev:app      # HMR 付きで起動（Vite dev サーバ + Tauri）
npm run build:app    # リリースビルド（フロントエンド → cargo build --release）
npm run bundle       # NSIS インストーラを作る
```

`cargo build` 単体でもビルドできます。`custom-protocol` feature が既定で有効なので、
`dist/` の中身が実行ファイルに埋め込まれます（事前に `npm run build` が必要）。
HMR を使う `npm run dev:app` はこの feature を外し、`devUrl` の Vite サーバを見に行きます。

### 構成

```
src/                  Rust
├── main.rs             Tauri コマンド、トレイ、ウィンドウ管理
├── switchbot.rs        SwitchBot Open API v1.1 クライアント（HMAC-SHA256 署名）
└── store.rs            設定ファイル・資格情報・自動起動

ui/                   React
├── App.tsx             画面の組み立てと遷移
├── lib/                画面に依存しないロジック（ここだけでテストできる）
│   ├── types.ts          Rust 側と対応する型
│   ├── bridge.ts         Tauri コマンドの型付き入口
│   ├── profile.ts        機種 → 操作できることの解釈
│   ├── commands.ts       送信するコマンドの組み立て
│   ├── status.ts         API レスポンスの読み取り
│   ├── ordering.ts       並び順・表示 / 非表示
│   ├── labels.ts         機種名の日本語化
│   └── color.ts          #rrggbb ⇔ R:G:B
├── hooks/              状態管理（React 依存）
│   ├── useDevices.ts     一覧・状態取得・コマンド送信
│   ├── useConfig.ts      設定の読み書き
│   ├── useToast.ts       ステータスバーの一時表示
│   └── useDebouncedCommit.ts  スライダーの確定タイミング
└── components/         表示のみ（ロジックを持たない）
```

`lib/` は React にも DOM にも依存しないので、`npm test` だけで検証できます。
`components/` は props と `lib/` の純関数を呼ぶだけで、API 呼び出しと状態更新は `hooks/` に閉じています。

### リリースする

1. バージョンを上げる（3 ファイルまとめて書き換わります）

   ```sh
   npm run version:set -- 0.2.0
   cargo check            # Cargo.lock を合わせる
   ```

2. コミットしてタグを打つ

   ```sh
   git commit -am "0.2.0"
   git tag v0.2.0
   git push --follow-tags
   ```

3. `.github/workflows/release.yml` が走り、テスト → インストーラのビルド →
   **下書きの** リリース作成までを行います。内容を確認して公開してください。

タグと `tauri.conf.json` / `package.json` / `Cargo.toml` のバージョンが食い違うと、
ワークフローが `scripts/check-version.mjs` で止めます。

### 自動更新の仕組み

- ビルド時に `TAURI_SIGNING_PRIVATE_KEY`（GitHub Secrets）でインストーラに署名します
- `scripts/prepare-release.mjs` が署名を読み取って `latest.json` を作り、リリースに添付します
- アプリは `releases/latest/download/latest.json` を見に行き、公開鍵で署名を検証してから更新します

公開鍵は `tauri.conf.json` の `plugins.updater.pubkey` に入っています。
**秘密鍵を失うと既存ユーザーへ更新を配信できなくなります**。生成した鍵
（`~/.tauri/switchbot-widget.key`）は別の場所にも控えておいてください。

手元で署名付きのインストーラを作る場合:

```sh
export TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.tauri/switchbot-widget.key)"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""
npm run bundle && npm run release:prepare   # artifacts/ に出力されます
```

## ライセンス

[MIT License](LICENSE) — Copyright (c) 2026 Yuto Inoue

SwitchBot は株式会社 SwitchBot の商標です。このアプリは公式のものではありません。
