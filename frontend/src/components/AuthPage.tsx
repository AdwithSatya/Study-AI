import { useState, type FormEvent } from "react";
import { registerUser, loginUser } from "../api";
import { useAppDispatch } from "../store";

export default function AuthPage() {
  const dispatch = useAppDispatch();
  const [mode, setMode] = useState<"social" | "email">("social");
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
      const { access_token } = await loginUser(email, password);
      dispatch({ type: "SET_AUTH", token: access_token, userName: name || email.split("@")[0] });
      onToast("Welcome to NoteAI!", "success");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Something went wrong. Please check your credentials.";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleSocialClick = (platform: string) => {
    // Simulate social login by logging in as a demo user
    setError(null);
    setLoading(true);
    setTimeout(async () => {
      try {
        const demoEmail = `${platform.toLowerCase()}_demo@example.com`;
        const demoPassword = "demopassword123";
        
        try {
          await registerUser(`Demo ${platform}`, demoEmail, demoPassword);
        } catch {
          // Already registered, proceed to login
        }
        
        const { access_token } = await loginUser(demoEmail, demoPassword);
        dispatch({ type: "SET_AUTH", token: access_token, userName: `Demo ${platform}` });
      } catch {
        setError(`Failed to authenticate with ${platform}.`);
      } finally {
        setLoading(false);
      }
    }, 1000);
  };

  const onToast = (msg: string, type: "success" | "error") => {
    console.log(`[Toast] ${type}: ${msg}`);
  };

  return (
    <div className="flex items-center justify-center min-h-screen w-screen bg-[#121414] text-[#e3e2e2] p-margin-mobile relative font-sans overflow-hidden">
      {/* Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-[#7c5cff]/5 rounded-full blur-[140px] pointer-events-none"></div>

      <main className="relative z-10 w-full max-w-md bg-[#1f2020]/35 border border-[#484555]/20 rounded-2xl p-md backdrop-blur-md shadow-2xl">
        <div className="flex flex-col items-center text-center space-y-xl">
          
          {/* Branding Section */}
          <div className="space-y-sm">
            <div className="flex justify-center">
              <img
                alt="NoteAI Logo"
                className="w-16 h-16 object-contain drop-shadow-[0_0_20px_rgba(124,92,255,0.35)] animate-[float_6s_ease-in-out_infinite]"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDMSgCrZioZ2PRhiTbZ8tSqZ8EHWZ_Lb-65-xATH9FWkroV8e_xvC84VgQz2KXe6k2rY7nJXrNLSMNwSBq42fNoLyRRGaHHVmF92Z-qWG4XhFlhjBESRn4DkgLsvzm8RxfGeXIvzgrbQUwluCeAMdu_H4H6eK7yL77Sdt7kFNJMr0OCKaRI7rLBS1VIE6_WQjbMJadCYWLMf9q1Gvg-UjeAPAO1Fi4hpNK0lSAUDhHWAm31_l7gC_0R4tuGtD0Jb_keBXg4415i4Qw"
              />
            </div>
            <div>
              <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg font-bold text-on-surface tracking-tight">
                NoteAI
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant mt-xs">
                Your AI-powered study workspace.
              </p>
            </div>
          </div>

          {mode === "social" ? (
            /* Social login buttons */
            <div className="w-full space-y-md">
              <div className="space-y-sm">
                <button
                  disabled={loading}
                  onClick={() => handleSocialClick("Google")}
                  className="w-full flex items-center justify-center gap-sm bg-[#cabeff] text-[#31009a] py-md rounded-2xl font-body-lg text-body-lg font-bold hover:brightness-110 active:scale-[0.98] transition-all"
                >
                  <span className="material-symbols-outlined">account_circle</span>
                  Continue with Google
                </button>
                <button
                  disabled={loading}
                  onClick={() => handleSocialClick("GitHub")}
                  className="w-full flex items-center justify-center gap-sm bg-[#292a2a] text-on-surface py-md rounded-2xl font-body-lg text-body-lg font-bold hover:bg-[#343535] active:scale-[0.98] transition-all border border-[#484555]/30"
                >
                  <svg aria-hidden="true" className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" fillRule="evenodd"></path>
                  </svg>
                  Continue with GitHub
                </button>
              </div>

              <div className="pt-sm">
                <button
                  onClick={() => setMode("email")}
                  className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors py-xs px-sm"
                >
                  Sign in with email
                </button>
              </div>
            </div>
          ) : (
            /* Email login form */
            <div className="w-full space-y-md">
              {/* Tabs */}
              <div className="flex w-full bg-[#1b1c1c] rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => { setTab("login"); setError(null); }}
                  className={`flex-1 text-center py-xs font-body-md rounded-md transition-all text-xs uppercase tracking-wider font-semibold ${tab === "login" ? "bg-[#292a2a] text-[#cabeff] font-bold" : "text-on-surface-variant"}`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setTab("register"); setError(null); }}
                  className={`flex-1 text-center py-xs font-body-md rounded-md transition-all text-xs uppercase tracking-wider font-semibold ${tab === "register" ? "bg-[#292a2a] text-[#cabeff] font-bold" : "text-on-surface-variant"}`}
                >
                  Create Account
                </button>
              </div>

              <form className="space-y-sm" onSubmit={handleSubmit} noValidate>
                {tab === "register" && (
                  <div className="space-y-xs text-left">
                    <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-[11px]">Full Name</label>
                    <input
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-[#0d0e0f] border border-[#484555] rounded-lg py-sm px-sm text-body-md focus:border-[#cabeff] focus:ring-0 outline-none transition-all text-[#e3e2e2]"
                      placeholder="Ada Lovelace"
                      type="text"
                    />
                  </div>
                )}

                <div className="space-y-xs text-left">
                  <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-[11px]">Email</label>
                  <input
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#0d0e0f] border border-[#484555] rounded-lg py-sm px-sm text-body-md focus:border-[#cabeff] focus:ring-0 outline-none transition-all text-[#e3e2e2]"
                    placeholder="ada@example.com"
                    type="email"
                  />
                </div>

                <div className="space-y-xs text-left">
                  <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-[11px]">Password</label>
                  <input
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#0d0e0f] border border-[#484555] rounded-lg py-sm px-sm text-body-md focus:border-[#cabeff] focus:ring-0 outline-none transition-all text-[#e3e2e2]"
                    placeholder="••••••••"
                    type="password"
                  />
                </div>

                {error && (
                  <div className="text-red-400 text-xs py-xs text-left" role="alert">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#7C5CFF] hover:bg-[#6b4ae6] text-white font-title-md py-sm rounded-lg transition-all shadow-lg shadow-[#7C5CFF]/20 font-bold active:scale-[0.98]"
                >
                  {loading ? "Please wait..." : tab === "login" ? "Sign In" : "Create Account"}
                </button>
              </form>

              <div className="pt-sm flex justify-between items-center text-xs">
                <button
                  onClick={() => setMode("social")}
                  className="text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  Other options
                </button>
              </div>
            </div>
          )}

          <footer className="pt-lg w-full border-t border-outline-variant/10">
            <p className="font-label-sm text-label-sm text-outline-variant text-[10px]">
              By continuing, you agree to NoteAI's Terms of Service and Privacy Policy.
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}
