import { useState, useEffect } from "react";
import { AppStateProvider, useAppState, useAppDispatch } from "./store";
import { listFolders } from "./api";
import AuthPage from "./components/auth/AuthPage";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/chat/ChatWindow";
import Onboarding from "./components/onboarding/Onboarding";

// ── Toast state lives at app level ───────────────────────────────────────────

interface Toast {
  id: number;
  msg: string;
  type: "success" | "error";
}

let toastId = 0;

function AppInner() {
  const { token } = useAppState();
  const dispatch = useAppDispatch();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);

  const showToast = (msg: string, type: "success" | "error") => {
    const id = ++toastId;
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  };

  useEffect(() => {
    if (!token) {
      setLoadingFolders(true);
      setIsOnboarded(false);
      return;
    }

    setLoadingFolders(true);
    listFolders(token)
      .then((f) => {
        dispatch({ type: "SET_FOLDERS", folders: f });
        if (f.length > 0) {
          setIsOnboarded(true);
          // Select first folder automatically if none selected
          dispatch({ type: "SELECT_FOLDER", folder: f[0] });
        } else {
          setIsOnboarded(false);
        }
      })
      .catch(() => {
        dispatch({ type: "LOGOUT" });
        setIsOnboarded(false);
      })
      .finally(() => {
        setLoadingFolders(false);
      });
  }, [token, dispatch]);

  if (!token) return <AuthPage onToast={showToast} />;

  if (loadingFolders) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-[#121414] text-[#e3e2e2]">
        <div className="flex flex-col items-center gap-sm">
          <span className="material-symbols-outlined text-4xl text-[#cabeff] animate-spin">sync</span>
          <span className="font-body-md text-on-surface-variant">Loading workspaces...</span>
        </div>
      </div>
    );
  }

  if (!isOnboarded) {
    return <Onboarding onComplete={() => setIsOnboarded(true)} onToast={showToast} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-on-surface">
      <Sidebar onToast={showToast} />
      <ChatWindow onToast={showToast} />

      {/* Toast stack */}
      <div
        aria-live="polite"
        style={{ position: "fixed", top: 20, left: "50%", translate: "-50% 0", zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}
      >
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <AppInner />
    </AppStateProvider>
  );
}
