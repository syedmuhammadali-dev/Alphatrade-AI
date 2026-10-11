import { useState } from "react";
import { login, ApiError } from "../../lib/api";

export function LoginForm({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      onLoggedIn();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach AlphaTrade AI.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Sign in to AlphaTrade AI</h1>
      <input type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <input
        type="password"
        placeholder="Password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit" className="primary" disabled={busy} style={{ width: "100%" }}>
        {busy ? "Signing in…" : "Sign In"}
      </button>
      {error && <p className="error-text">{error}</p>}
    </form>
  );
}
