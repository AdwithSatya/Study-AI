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
  | { type: "SET_AUTH"; token: string; userName: string }
  | { type: "LOGOUT" }
  | { type: "SET_FOLDERS"; folders: Folder[] }
  | { type: "ADD_FOLDER"; folder: Folder }
  | { type: "SELECT_FOLDER"; folder: Folder }
  | { type: "SET_FILES"; files: FileItem[] }
  | { type: "ADD_FILE"; file: FileItem }
  | { type: "SET_CHATS"; chats: Chat[] }
  | { type: "ADD_CHAT"; chat: Chat }
  | { type: "SELECT_CHAT"; chat: Chat };

// ── Reducer ────────────────────────────────────────────────────────────────────

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_AUTH":
      localStorage.setItem("noteai_token", action.token);
      localStorage.setItem("noteai_user", action.userName);
      return { ...state, token: action.token, userName: action.userName };

    case "LOGOUT":
      localStorage.removeItem("noteai_token");
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

    case "SET_FILES":
      return { ...state, files: action.files };

    case "ADD_FILE":
      return { ...state, files: [...state.files, action.file] };

    case "SET_CHATS":
      return { ...state, chats: action.chats };

    case "ADD_CHAT":
      return { ...state, chats: [...state.chats, action.chat] };

    case "SELECT_CHAT":
      return { ...state, selectedChat: action.chat };

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
