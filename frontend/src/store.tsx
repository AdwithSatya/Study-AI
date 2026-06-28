import { createContext, useContext, useReducer, type ReactNode } from "react";
import type { Folder, FileItem, Chat } from "./api";

// ── State shape ────────────────────────────────────────────────────────────────

export interface AppState {
  token: string | null;
  userName: string | null;
  folders: Folder[];
  selectedFolder: Folder | null;
  files: FileItem[];
  chats: Chat[];
  selectedChat: Chat | null;
}

const initialState: AppState = {
  token: localStorage.getItem("noteai_token"),
  userName: localStorage.getItem("noteai_user"),
  folders: [],
  selectedFolder: null,
  files: [],
  chats: [],
  selectedChat: null,
};

// ── Actions ────────────────────────────────────────────────────────────────────

type Action =
  | { type: "SET_AUTH"; token: string; refreshToken: string; userName: string }
  | { type: "LOGOUT" }
  | { type: "SET_FOLDERS"; folders: Folder[] }
  | { type: "ADD_FOLDER"; folder: Folder }
  | { type: "SELECT_FOLDER"; folder: Folder }
  | { type: "UPDATE_FOLDER"; folder_id: string; folder_name: string }
  | { type: "DELETE_FOLDER"; folder_id: string }
  | { type: "SET_FILES"; files: FileItem[] }
  | { type: "ADD_FILE"; file: FileItem }
  | { type: "DELETE_FILE"; file_id: string }
  | { type: "SET_CHATS"; chats: Chat[] }
  | { type: "ADD_CHAT"; chat: Chat }
  | { type: "SELECT_CHAT"; chat: Chat }
  | { type: "UPDATE_CHAT"; chat_id: string; chat_name: string }
  | { type: "DELETE_CHAT"; chat_id: string };

// ── Reducer ────────────────────────────────────────────────────────────────────

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_AUTH":
      localStorage.setItem("noteai_token", action.token);
      localStorage.setItem("noteai_refresh_token", action.refreshToken);
      localStorage.setItem("noteai_user", action.userName);
      return { ...state, token: action.token, userName: action.userName };

    case "LOGOUT":
      localStorage.removeItem("noteai_token");
      localStorage.removeItem("noteai_refresh_token");
      localStorage.removeItem("noteai_user");
      return { ...initialState, token: null, userName: null };

    case "SET_FOLDERS":
      return { ...state, folders: action.folders };

    case "ADD_FOLDER":
      return { ...state, folders: [...state.folders, action.folder] };

    case "SELECT_FOLDER":
      return {
        ...state,
        selectedFolder: action.folder,
        files: [],
        chats: [],
        selectedChat: null,
      };

    case "UPDATE_FOLDER":
      return {
        ...state,
        folders: state.folders.map((f) =>
          f.folder_id === action.folder_id ? { ...f, folder_name: action.folder_name } : f
        ),
        selectedFolder:
          state.selectedFolder?.folder_id === action.folder_id
            ? { ...state.selectedFolder, folder_name: action.folder_name }
            : state.selectedFolder,
      };

    case "DELETE_FOLDER": {
      const isSelected = state.selectedFolder?.folder_id === action.folder_id;
      const updatedFolders = state.folders.filter((f) => f.folder_id !== action.folder_id);
      return {
        ...state,
        folders: updatedFolders,
        selectedFolder: isSelected ? (updatedFolders[0] || null) : state.selectedFolder,
        files: isSelected ? [] : state.files,
        chats: isSelected ? [] : state.chats,
        selectedChat: isSelected ? null : state.selectedChat,
      };
    }

    case "SET_FILES":
      return { ...state, files: action.files };

    case "ADD_FILE":
      return { ...state, files: [...state.files, action.file] };

    case "DELETE_FILE":
      return {
        ...state,
        files: state.files.filter((f) => f.file_id !== action.file_id),
      };

    case "SET_CHATS":
      return { ...state, chats: action.chats };

    case "ADD_CHAT":
      return { ...state, chats: [...state.chats, action.chat] };

    case "SELECT_CHAT":
      return { ...state, selectedChat: action.chat };

    case "UPDATE_CHAT":
      return {
        ...state,
        chats: state.chats.map((c) =>
          c.chat_id === action.chat_id ? { ...c, chat_name: action.chat_name } : c
        ),
        selectedChat:
          state.selectedChat?.chat_id === action.chat_id
            ? { ...state.selectedChat, chat_name: action.chat_name }
            : state.selectedChat,
      };

    case "DELETE_CHAT": {
      const isSelected = state.selectedChat?.chat_id === action.chat_id;
      const updatedChats = state.chats.filter((c) => c.chat_id !== action.chat_id);
      return {
        ...state,
        chats: updatedChats,
        selectedChat: isSelected ? (updatedChats[0] || null) : state.selectedChat,
      };
    }

    default:
      return state;
  }
}

// ── Context ────────────────────────────────────────────────────────────────────

const StateCtx = createContext<AppState>(initialState);
const DispatchCtx = createContext<React.Dispatch<Action>>(() => {});

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <StateCtx.Provider value={state}>
      <DispatchCtx.Provider value={dispatch}>
        {children}
      </DispatchCtx.Provider>
    </StateCtx.Provider>
  );
}

export const useAppState = () => useContext(StateCtx);
export const useAppDispatch = () => useContext(DispatchCtx);
