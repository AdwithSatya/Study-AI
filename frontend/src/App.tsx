import { useState } from 'react'
import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'

function App() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div style={{ display: "flex", width: "100%", height: "100vh" }}>
      <Sidebar onUploadSuccess={showToast} />
      <ChatWindow />
      
      {/* Global Toast Notification */}
      {toastMessage && (
        <div style={{
          position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)",
          background: toastMessage.includes("✅") ? "var(--success)" : "var(--error)",
          color: "#000", padding: "10px 20px", borderRadius: 8,
          boxShadow: "var(--shadow)", zIndex: 1000, fontWeight: 500, fontSize: 14,
          animation: "slideDown 0.3s ease-out"
        }}>
          {toastMessage}
        </div>
      )}
      
      <style>{`
        @keyframes slideDown {
          from { transform: translate(-50%, -20px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default App
