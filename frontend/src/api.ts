import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
export const TOKEN_KEY = "noteai_token";
export const REFRESH_TOKEN_KEY = "noteai_refresh_token";

const api = axios.create({ baseURL: BASE_URL });

// Automatically attach JWT to outgoing requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Refresh access token on 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 && 
      !originalRequest._retry && 
      originalRequest.url !== "/auth/login" && 
      originalRequest.url !== "/auth/refresh"
    ) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refreshToken });
          localStorage.setItem(TOKEN_KEY, data.access_token);
          originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
          return api(originalRequest);
        } catch {
          // Invalidate and reload on failed refresh
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          window.location.reload();
        }
      }
    }
    return Promise.reject(error);
  }
);

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
  refresh_token: string;
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

export async function updateFolder(token: string, folder_id: string, folder_name: string) {
  const { data } = await api.put<Folder>(
    `/folders/${folder_id}`,
    { folder_name },
    { headers: authHeaders(token) },
  );
  return data;
}

export async function deleteFolder(token: string, folder_id: string) {
  const { data } = await api.delete<{ detail: string }>(
    `/folders/${folder_id}`,
    { headers: authHeaders(token) },
  );
  return data;
}

export async function updateChat(token: string, chat_id: string, chat_name: string) {
  const { data } = await api.put<Chat>(
    `/chat/${chat_id}`,
    { chat_name },
    { headers: authHeaders(token) },
  );
  return data;
}

export async function deleteChat(token: string, chat_id: string) {
  const { data } = await api.delete<{ detail: string }>(
    `/chat/${chat_id}`,
    { headers: authHeaders(token) },
  );
  return data;
}

export async function deleteFile(token: string, file_id: string) {
  const { data } = await api.delete<{ detail: string }>(
    `/files/${file_id}`,
    { headers: authHeaders(token) },
  );
  return data;
}

export async function logoutUser(refreshToken: string) {
  const { data } = await api.post<{ detail: string }>(
    "/auth/logout",
    { refresh_token: refreshToken }
  );
  return data;
}
