import { useState, useEffect } from "react";
import {
  listFolders, createFolder, updateFolder, deleteFolder,
  listChats, createChat, updateChat, deleteChat, logoutUser,
  type Folder, type Chat,
} from "../api";
import { useAppState, useAppDispatch } from "../store";
import ConfirmDialog from "./ui/ConfirmDialog";

interface Props {
  onToast: (msg: string, type: "success" | "error") => void;
}

export default function Sidebar({ onToast }: Props) {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { token, userName, selectedFolder, selectedChat, folders, chats } = state;

  const [newFolderMode, setNewFolderMode] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newChatMode, setNewChatMode] = useState(false);
  const [newChatName, setNewChatName] = useState("");

  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingChatName, setEditingChatName] = useState("");

  // Confirm dialog state instead of window.confirm
  const [confirm, setConfirm] = useState<{
    title: string; body: string; onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    if (!token) return;
    listFolders(token)
      .then((f) => dispatch({ type: "SET_FOLDERS", folders: f }))
      .catch(() => {});
  }, [token, dispatch]);

  useEffect(() => {
    if (!token || !selectedFolder) return;
    listChats(token, selectedFolder.folder_id)
      .then((c) => {
        dispatch({ type: "SET_CHATS", chats: c });
        if (c.length > 0) dispatch({ type: "SELECT_CHAT", chat: c[0] });
      })
      .catch(() => {});
  }, [token, selectedFolder, dispatch]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newFolderName.trim()) return;
    try {
      const f: Folder = await createFolder(token, newFolderName.trim());
      dispatch({ type: "ADD_FOLDER", folder: f });
      dispatch({ type: "SELECT_FOLDER", folder: f });
      setNewFolderName(""); setNewFolderMode(false);
      onToast(`Workspace "${f.folder_name}" created`, "success");
    } catch { onToast("Failed to create workspace", "error"); }
  };

  const handleRenameFolder = async (e: React.FormEvent, folderId: string) => {
    e.preventDefault();
    if (!token || !editingFolderName.trim()) return;
    try {
      await updateFolder(token, folderId, editingFolderName.trim());
      dispatch({ type: "UPDATE_FOLDER", folder_id: folderId, folder_name: editingFolderName.trim() });
      setEditingFolderId(null);
      onToast("Workspace renamed", "success");
    } catch { onToast("Failed to rename workspace", "error"); }
  };

  const handleDeleteFolder = (folderId: string, folderName: string) => {
    if (!token) return;
    setConfirm({
      title: "Delete workspace?",
      body: `"${folderName}" and all its files, chats, and messages will be permanently deleted.`,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await deleteFolder(token, folderId);
          dispatch({ type: "DELETE_FOLDER", folder_id: folderId });
          onToast("Workspace deleted", "success");
        } catch { onToast("Failed to delete workspace", "error"); }
      },
    });
  };

  const handleCreateChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedFolder || !newChatName.trim()) return;
    try {
      const c: Chat = await createChat(token, selectedFolder.folder_id, newChatName.trim());
      dispatch({ type: "ADD_CHAT", chat: c });
      dispatch({ type: "SELECT_CHAT", chat: c });
      setNewChatName(""); setNewChatMode(false);
      onToast(`Chat "${c.chat_name}" created`, "success");
    } catch { onToast("Failed to create chat", "error"); }
  };

  const handleRenameChat = async (e: React.FormEvent, chatId: string) => {
    e.preventDefault();
    if (!token || !editingChatName.trim()) return;
    try {
      await updateChat(token, chatId, editingChatName.trim());
      dispatch({ type: "UPDATE_CHAT", chat_id: chatId, chat_name: editingChatName.trim() });
      setEditingChatId(null);
      onToast("Conversation renamed", "success");
    } catch { onToast("Failed to rename conversation", "error"); }
  };

  const handleDeleteChat = (chatId: string, chatName: string) => {
    if (!token) return;
    setConfirm({
      title: "Delete conversation?",
      body: `"${chatName}" and all its messages will be permanently deleted.`,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await deleteChat(token, chatId);
          dispatch({ type: "DELETE_CHAT", chat_id: chatId });
          onToast("Conversation deleted", "success");
        } catch { onToast("Failed to delete conversation", "error"); }
      },
    });
  };

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem("noteai_refresh_token");
    if (refreshToken) {
      try { await logoutUser(refreshToken); } catch { /* ignore */ }
    }
    dispatch({ type: "LOGOUT" });
  };

  const initials = (name: string) =>
    name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <>
      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          body={confirm.body}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}

      <aside className="sidebar">
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo-icon">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>auto_awesome</span>
          </div>
          <div>
            <div className="sidebar-logo-name">NoteAI</div>
            <div className="sidebar-logo-sub">Study Workspace</div>
          </div>
        </div>

        {/* Scrollable nav */}
        <div className="sidebar-scroll">

          {/* ── Workspaces ────────────────────────────────────────── */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span className="sidebar-section-label">Workspaces</span>
              <button
                onClick={() => setNewFolderMode(!newFolderMode)}
                className="icon-btn"
                title={newFolderMode ? "Cancel" : "New workspace"}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  {newFolderMode ? "remove" : "add"}
                </span>
              </button>
            </div>

            {newFolderMode && (
              <form onSubmit={handleCreateFolder} className="new-item-form">
                <input
                  autoFocus required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="new-item-input"
                  placeholder="Workspace name..."
                  type="text"
                />
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    type="submit"
                    className="icon-btn confirm"
                    style={{ flex: 1, width: "auto", borderRadius: 6, fontSize: 12, fontWeight: 700 }}
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => { setNewFolderMode(false); setNewFolderName(""); }}
                    className="icon-btn"
                    style={{ width: "auto", padding: "0 10px", fontSize: 12 }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="item-list">
              {folders.map((f) => {
                const isSelected = selectedFolder?.folder_id === f.folder_id;

                if (editingFolderId === f.folder_id) {
                  return (
                    <form
                      key={f.folder_id}
                      onSubmit={(e) => handleRenameFolder(e, f.folder_id)}
                      style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 6px", borderRadius: 8, background: "var(--bg-hover)" }}
                    >
                      <input
                        autoFocus
                        value={editingFolderName}
                        onChange={(e) => setEditingFolderName(e.target.value)}
                        onBlur={() => setEditingFolderId(null)}
                        style={{ background: "transparent", border: "none", outline: "none", flex: 1, fontSize: 13, color: "var(--text-1)", fontFamily: "inherit" }}
                      />
                      <button type="submit" className="icon-btn confirm" style={{ width: 22, height: 22 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check</span>
                      </button>
                      <button type="button" onClick={() => setEditingFolderId(null)} className="icon-btn">
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
                      </button>
                    </form>
                  );
                }

                return (
                  <div key={f.folder_id} className="item-row" style={{ display: "flex", alignItems: "center" }}>
                    <button
                      onClick={() => dispatch({ type: "SELECT_FOLDER", folder: f })}
                      className={`item-btn${isSelected ? " active" : ""}`}
                      style={{ flex: 1 }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16, flexShrink: 0 }}>folder</span>
                      <span className="item-btn-text">{f.folder_name}</span>
                    </button>
                    <div className="item-actions">
                      <button
                        onClick={() => { setEditingFolderId(f.folder_id); setEditingFolderName(f.folder_name); }}
                        className="icon-btn"
                        title="Rename"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteFolder(f.folder_id, f.folder_name)}
                        className="icon-btn danger"
                        title="Delete"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {folders.length === 0 && !newFolderMode && (
                <div style={{ textAlign: "center", padding: "12px 8px", color: "var(--text-3)", fontSize: 12 }}>
                  No workspaces yet.
                </div>
              )}
            </div>
          </div>

          {/* ── Conversations ──────────────────────────────────────── */}
          {selectedFolder && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span className="sidebar-section-label">Conversations</span>
                <button
                  onClick={() => setNewChatMode(!newChatMode)}
                  className="icon-btn"
                  title={newChatMode ? "Cancel" : "New conversation"}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    {newChatMode ? "remove" : "add"}
                  </span>
                </button>
              </div>

              {newChatMode && (
                <form onSubmit={handleCreateChat} className="new-item-form">
                  <input
                    autoFocus required
                    value={newChatName}
                    onChange={(e) => setNewChatName(e.target.value)}
                    className="new-item-input"
                    placeholder="Chat topic..."
                    type="text"
                  />
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="submit"
                      className="icon-btn confirm"
                      style={{ flex: 1, width: "auto", borderRadius: 6, fontSize: 12, fontWeight: 700 }}
                    >
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => { setNewChatMode(false); setNewChatName(""); }}
                      className="icon-btn"
                      style={{ width: "auto", padding: "0 10px", fontSize: 12 }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              <div className="item-list">
                {chats.map((c) => {
                  const isSelected = selectedChat?.chat_id === c.chat_id;

                  if (editingChatId === c.chat_id) {
                    return (
                      <form
                        key={c.chat_id}
                        onSubmit={(e) => handleRenameChat(e, c.chat_id)}
                        style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 6px", borderRadius: 8, background: "var(--bg-hover)" }}
                      >
                        <input
                          autoFocus
                          value={editingChatName}
                          onChange={(e) => setEditingChatName(e.target.value)}
                          onBlur={() => setEditingChatId(null)}
                          style={{ background: "transparent", border: "none", outline: "none", flex: 1, fontSize: 13, color: "var(--text-1)", fontFamily: "inherit" }}
                        />
                        <button type="submit" className="icon-btn confirm" style={{ width: 22, height: 22 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check</span>
                        </button>
                        <button type="button" onClick={() => setEditingChatId(null)} className="icon-btn">
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
                        </button>
                      </form>
                    );
                  }

                  return (
                    <div key={c.chat_id} className="item-row">
                      <button
                        onClick={() => dispatch({ type: "SELECT_CHAT", chat: c })}
                        className={`item-btn${isSelected ? " active" : ""}`}
                        style={{ flex: 1 }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16, flexShrink: 0 }}>chat_bubble</span>
                        <span className="item-btn-text">{c.chat_name}</span>
                      </button>
                      <div className="item-actions">
                        <button
                          onClick={() => { setEditingChatId(c.chat_id); setEditingChatName(c.chat_name); }}
                          className="icon-btn"
                          title="Rename"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteChat(c.chat_id, c.chat_name)}
                          className="icon-btn danger"
                          title="Delete"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {chats.length === 0 && !newChatMode && (
                  <div style={{ textAlign: "center", padding: "12px 8px", color: "var(--text-3)", fontSize: 12, fontStyle: "italic" }}>
                    No chats yet. Click + to start one.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer / Profile */}
        <div className="sidebar-footer">
          <div className="user-avatar">{initials(userName || "User")}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="user-name">{userName || "User"}</div>
          </div>
          <button onClick={handleLogout} className="logout-btn" title="Sign out">
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
