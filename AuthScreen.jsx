import { useState } from "react";

export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/auth/${mode === "login" ? "login" : "register"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.message || `The sign-in service returned HTTP ${response.status}. Make sure the API server is running.`);
      }
      if (!result.user) {
        throw new Error("The sign-in service returned an unexpected response. Check that the API server and MongoDB are running.");
      }
      onAuthenticated(result.user);
    } catch (requestError) {
      setError(requestError.message || "Could not connect to the sign-in service. Make sure the API server and MongoDB are running.");
    } finally {
      setBusy(false);
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setError("");
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <a className="brand auth-brand" href="#" aria-label="Spendwise">
          <span className="brand-mark">s</span>
          <span>spendwise<span className="brand-period">.</span></span>
        </a>
        <div className="auth-spark" aria-hidden="true">✳</div>
        <p className="eyebrow">{mode === "login" ? "WELCOME BACK" : "A FRESH START"}</p>
        <h1 id="auth-title">{mode === "login" ? "Good to see you." : "Make room for clarity."}</h1>
        <p className="auth-copy">{mode === "login" ? "Sign in to pick up where you left off." : "Create an account to keep your expenses safe and organized."}</p>
        <form className="auth-form" onSubmit={submit}>
          <label htmlFor="auth-email">Email address</label>
          <input id="auth-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength="254" />
          <label htmlFor="auth-password">Password</label>
          <div className="password-field">
            <input id="auth-password" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder={mode === "login" ? "Your password" : "At least 8 characters"} value={password} onChange={(event) => setPassword(event.target.value)} required minLength="8" maxLength="72" />
            <button type="button" className="password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "Hide" : "Show"}</button>
          </div>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <button type="submit" className="submit-button auth-submit" disabled={busy}>{busy ? "One moment…" : mode === "login" ? "Sign in" : "Create account"} <span>↗</span></button>
        </form>
        <p className="auth-switch">
          {mode === "login" ? "New to Spendwise?" : "Already have an account?"}
          <button type="button" onClick={() => changeMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Create an account" : "Sign in"}</button>
        </p>
        <div className="auth-privacy"><span>♧</span> Your account and expenses are private to you.</div>
      </section>
    </main>
  );
}
