import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
export const TOKEN_KEY = "noteai_token";

const api = axios.create({ baseURL: BASE_URL });

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

export interface UserOut {
  user_id: string;
  user_name: string;
  email: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface Folder {
  folder_id: string;
  folder_name: string;
}

export interface FileItem {
  file_id: string;
  file_name: string;
  status: string;
}

export interface Chat {
  chat_id: string;
  chat_name: string;
}

export interface AskResponse {
  answer: string;
  sources: string[];
}

export interface UploadResponse {
  filename: string;
  chunks_stored: number;
}

export async function registerUser(user_name: string, email: string, password: string) {
  const { data } = await api.post<UserOut>("/auth/register", {
    user_name,
    email,
    password,
  });
  return data;
}

export async function loginUser(email: string, password: string) {
  const { data } = await api.post<TokenResponse>("/auth/login", { email, password });
  return data;
}

export async function listFolders(token: string) {
  const { data } = await api.get<{ folders: Folder[] }>("/folders/list", {
    headers: authHeaders(token),
  });
  return data.folders;
}

export async function createFolder(token: string, folder_name: string) {
  const { data } = await api.post<Folder>(
    "/folders/create",
    { folder_name },
    { headers: authHeaders(token) },
  );
  return data;
}

export async function listFiles(token: string, folder_id: string) {
  const { data } = await api.get<{ files: FileItem[] }>("/files/list", {
    params: { folder_id },
    headers: authHeaders(token),
  });
  return data.files;
}

export async function uploadFile(token: string, folder_id: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post<UploadResponse>("/files/upload", form, {
    params: { folder_id },
    headers: authHeaders(token),
  });
  return data;
}

export async function listChats(token: string, folder_id: string) {
  const { data } = await api.get<{ chats: Chat[] }>("/chat/list", {
    params: { folder_id },
    headers: authHeaders(token),
  });
  return data.chats;
}

export async function createChat(token: string, folder_id: string, chat_name: string) {
  const { data } = await api.post<Chat>(
    "/chat/create",
    { folder_id, chat_name },
    { headers: authHeaders(token) },
  );
  return data;
}

export async function askQuestion(token: string, chat_id: string, question: string) {
  const { data } = await api.post<AskResponse>(
    "/chat/ask",
    { chat_id, question },
    { headers: authHeaders(token) },
  );
  return data;
}
