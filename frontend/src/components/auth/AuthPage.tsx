import { useState, type FormEvent } from "react";
import { registerUser, loginUser } from "../../api";
import { useAppDispatch } from "../../store";

interface Props {
  onToast?: (msg: string, type: "success" | "error") => void;
}

export default function AuthPage({ onToast }: Props) {
  const dispatch = useAppDispatch();
  const [tab, setTab] = useState<"login" | "register">("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (tab === "register") {
        await registerUser(name, email, password);
      }
      const { access_token, refresh_token } = await loginUser(email, password);
      dispatch({
        type: "SET_AUTH",
        token: access_token,
        refreshToken: refresh_token,
        userName: name || email.split("@")[0],
      });
      onToast?.("Welcome to NoteAI!", "success");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Something went wrong. Please check your credentials.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="auth-page"
      style={{ position: "relative", overflow: "hidden" }}
    >
      {/* Ambient orbs — purely visual, pointer-events none, no layout impact */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `
          radial-gradient(ellipse 50% 40% at 20% 35%, rgba(124,92,255,0.12) 0%, transparent 60%),
          radial-gradient(ellipse 40% 50% at 80% 65%, rgba(167,139,250,0.07) 0%, transparent 60%)
        `
      }} />

      <main className="auth-card" style={{ position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>auto_awesome</span>
          </div>
          <span className="auth-logo-text">NoteAI</span>
        </div>

        {/* Tagline */}
        <p style={{
          textAlign: "center", fontSize: 13, color: "var(--text-2)",
          marginBottom: 24, lineHeight: 1.5
        }}>
          Your AI-powered study workspace
        </p>

        {/* Tabs */}
        <div className="auth-tabs">
          <button
            type="button"
            onClick={() => { setTab("login"); setError(null); }}
            className={`auth-tab${tab === "login" ? " active" : ""}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab("register"); setError(null); }}
            className={`auth-tab${tab === "register" ? " active" : ""}`}
          >
            Create Account
          </button>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {tab === "register" && (
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                placeholder="Ada Lovelace"
                type="text"
              />
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Email</label>
            <input
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="ada@example.com"
              type="email"
            />
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <input
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
              type="password"
            />
          </div>

          {error && (
            <div className="auth-error" role="alert">{error}</div>
          )}

          <button type="submit" disabled={loading} className="btn-primary">
            {loading
              ? "Please wait..."
              : tab === "login" ? "Sign In" : "Create Account"
            }
          </button>
        </form>

        {/* Footer */}
        <p style={{
          marginTop: 24, textAlign: "center", fontSize: 11,
          color: "var(--text-3)", borderTop: "1px solid var(--border)", paddingTop: 16
        }}>
          By continuing, you agree to NoteAI's Terms of Service and Privacy Policy.
        </p>
      </main>
    </div>
  );
}
