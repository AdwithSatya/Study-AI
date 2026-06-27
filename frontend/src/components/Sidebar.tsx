import { useState, useEffect } from "react";
import {
  listFolders, createFolder,
  listChats, createChat,
  type Folder, type Chat,
} from "../api";
import { useAppState, useAppDispatch } from "../store";

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

  // Load folders on mount
  useEffect(() => {
    if (!token) return;
    listFolders(token)
      .then((f) => dispatch({ type: "SET_FOLDERS", folders: f }))
      .catch(() => {});
  }, [token, dispatch]);

  // Load chats when folder changes
  useEffect(() => {
    if (!token || !selectedFolder) return;
    listChats(token, selectedFolder.folder_id)
      .then((c) => dispatch({ type: "SET_CHATS", chats: c }))
      .catch(() => {});
  }, [token, selectedFolder, dispatch]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newFolderName.trim()) return;
    try {
      const f: Folder = await createFolder(token, newFolderName.trim());
      dispatch({ type: "ADD_FOLDER", folder: f });
      dispatch({ type: "SELECT_FOLDER", folder: f });
      setNewFolderName("");
      setNewFolderMode(false);
      onToast(`✅ Workspace "${f.folder_name}" created`, "success");
    } catch {
      onToast("❌ Failed to create workspace", "error");
    }
  };

  const handleCreateChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedFolder || !newChatName.trim()) return;
    try {
      const c: Chat = await createChat(token, selectedFolder.folder_id, newChatName.trim());
      dispatch({ type: "ADD_CHAT", chat: c });
      dispatch({ type: "SELECT_CHAT", chat: c });
      setNewChatName("");
      setNewChatMode(false);
      onToast(`💬 Chat "${c.chat_name}" created`, "success");
    } catch {
      onToast("❌ Failed to create chat", "error");
    }
  };

  const initials = (name: string) =>
    name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <aside className="w-72 bg-surface-container border-r border-outline-variant flex flex-col h-full shrink-0">
      {/* Header / Logo */}
      <div className="flex items-center gap-sm px-md py-sm border-b border-outline-variant">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary">
          <span className="material-symbols-outlined text-[20px] font-bold">auto_awesome</span>
        </div>
        <div className="font-headline-lg-mobile text-headline-lg-mobile font-bold text-on-surface">
          NoteAI
        </div>
      </div>

      {/* Main navigation list */}
      <div className="flex-grow overflow-y-auto py-md space-y-md custom-scrollbar">
        {/* Workspaces Section */}
        <div>
          <div className="px-md py-xs flex justify-between items-center text-on-surface-variant mb-xs">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-[11px]">Workspaces</span>
            <button
              onClick={() => setNewFolderMode(!newFolderMode)}
              className="text-on-surface-variant hover:text-primary transition-colors flex items-center"
            >
              <span className="material-symbols-outlined text-[18px]">{newFolderMode ? "remove" : "add"}</span>
            </button>
          </div>

          {newFolderMode && (
            <form onSubmit={handleCreateFolder} className="mx-sm my-xs p-sm bg-surface-container-low rounded-lg space-y-sm border border-outline-variant/30">
              <input
                required
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full bg-[#0d0e0f] border border-[#484555] rounded-lg py-xs px-sm text-body-md focus:border-primary outline-none transition-all text-[#e3e2e2]"
                placeholder="Workspace name..."
                type="text"
              />
              <div className="flex gap-sm">
                <button type="submit" className="flex-grow bg-primary text-white font-label-sm py-1 rounded-lg hover:brightness-110 transition-all text-[11px] font-bold">
                  Create
                </button>
                <button type="button" onClick={() => setNewFolderMode(false)} className="px-sm font-label-sm text-on-surface-variant hover:text-on-surface transition-colors text-[11px]">
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="space-y-0.5 px-xs">
            {folders.map((f) => {
              const isSelected = selectedFolder?.folder_id === f.folder_id;
              return (
                <button
                  key={f.folder_id}
                  onClick={() => dispatch({ type: "SELECT_FOLDER", folder: f })}
                  className={`flex items-center gap-sm w-full pl-4 py-2 hover:bg-surface-container-high transition-all rounded-lg text-left ${isSelected ? "bg-surface-container-high text-primary font-bold border-l-2 border-primary" : "text-on-surface-variant"}`}
                >
                  <span className="material-symbols-outlined text-[18px]">folder</span>
                  <span className="font-body-md text-body-md truncate">{f.folder_name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chats Section */}
        {selectedFolder && (
          <div>
            <div className="px-md py-xs flex justify-between items-center text-on-surface-variant mb-xs">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider text-[11px]">Conversations</span>
              <button
                onClick={() => setNewChatMode(!newChatMode)}
                className="text-on-surface-variant hover:text-primary transition-colors flex items-center"
              >
                <span className="material-symbols-outlined text-[18px]">{newChatMode ? "remove" : "add"}</span>
              </button>
            </div>

            {newChatMode && (
              <form onSubmit={handleCreateChat} className="mx-sm my-xs p-sm bg-surface-container-low rounded-lg space-y-sm border border-outline-variant/30">
                <input
                  required
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  className="w-full bg-[#0d0e0f] border border-[#484555] rounded-lg py-xs px-sm text-body-md focus:border-primary outline-none transition-all text-[#e3e2e2]"
                  placeholder="Chat topic..."
                  type="text"
                />
                <div className="flex gap-sm">
                  <button type="submit" className="flex-grow bg-primary text-white font-label-sm py-1 rounded-lg hover:brightness-110 transition-all text-[11px] font-bold">
                    Create
                  </button>
                  <button type="button" onClick={() => setNewChatMode(false)} className="px-sm font-label-sm text-on-surface-variant hover:text-on-surface transition-colors text-[11px]">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-0.5 px-xs">
              {chats.map((c) => {
                const isSelected = selectedChat?.chat_id === c.chat_id;
                return (
                  <button
                    key={c.chat_id}
                    onClick={() => dispatch({ type: "SELECT_CHAT", chat: c })}
                    className={`flex items-center gap-sm w-full pl-4 py-2 hover:bg-surface-container-high transition-all rounded-lg text-left ${isSelected ? "bg-surface-container-high text-primary font-bold border-l-2 border-primary" : "text-on-surface-variant"}`}
                  >
                    <span className="material-symbols-outlined text-[18px]">chat_bubble</span>
                    <span className="font-body-md text-body-md truncate">{c.chat_name}</span>
                  </button>
                );
              })}

              {chats.length === 0 && !newChatMode && (
                <div className="text-center py-sm text-outline-variant text-[11px] italic">
                  No chats yet. Click + to start one.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer / Profile */}
      <div className="mt-auto border-t border-outline-variant p-sm flex items-center gap-sm bg-surface-container-low rounded-xl mx-xs mb-sm">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold shrink-0">
          {initials(userName || "User")}
        </div>
        <div className="flex flex-col overflow-hidden">
          <span className="font-body-md text-body-md font-bold truncate text-on-surface">{userName}</span>
          <span className="font-label-sm text-label-sm text-on-surface-variant truncate text-[11px]">Premium Researcher</span>
        </div>
        <button
          onClick={() => dispatch({ type: "LOGOUT" })}
          className="ml-auto text-on-surface-variant hover:text-primary transition-colors flex items-center"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
        </button>
      </div>
    </aside>
  );
}
