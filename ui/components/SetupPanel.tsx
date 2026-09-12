import { useState, type FormEvent } from "react";

type Props = {
  /** 既に接続済みで、設定から入り直した場合だけ戻れる */
  canCancel: boolean;
  busy: boolean;
  onSubmit: (token: string, secret: string) => void;
  onCancel: () => void;
};

export function SetupPanel({ canCancel, busy, onSubmit, onCancel }: Props) {
  const [token, setToken] = useState("");
  const [secret, setSecret] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(token.trim(), secret.trim());
  };

  return (
    <form className="view panel" onSubmit={submit}>
      <h2>SwitchBot に接続する</h2>
      <ol>
        <li>SwitchBot アプリを開く</li>
        <li>プロフィール → 設定</li>
        <li>「アプリバージョン」を 10 回タップ</li>
        <li>現れた「開発者向けオプション」を開く</li>
        <li>トークンとクライアントシークレットをコピー</li>
      </ol>

      <div className="field">
        <label htmlFor="setup-token">トークン</label>
        <input
          id="setup-token"
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={token}
          onChange={(event) => setToken(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="setup-secret">クライアントシークレット</label>
        <input
          id="setup-secret"
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={secret}
          onChange={(event) => setSecret(event.target.value)}
        />
      </div>

      <p>
        入力内容は Windows の資格情報マネージャーに保存され、通信は SwitchBot の API とのみ行われます。
      </p>

      <div className="btn-row">
        <button type="submit" className="btn primary" style={{ flex: 1 }} disabled={busy}>
          {busy ? "接続中…" : "接続する"}
        </button>
        {canCancel && (
          <button type="button" className="btn" onClick={onCancel}>
            戻る
          </button>
        )}
      </div>
    </form>
  );
}
