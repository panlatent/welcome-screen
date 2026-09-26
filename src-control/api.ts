import { t } from "../shared/i18n";
import type { MetaInfo, WelcomeConfig } from "../shared/types";

/** The connection token is invalid or has been reset */
export class UnauthorizedError extends Error {
  constructor() {
    super(t("error.unauthorized"));
  }
}

const REMEMBER_KEY = "welcome-remembered-token";

/** Connection token: from the QR URL first, else the token remembered from the last
 * successful connection (for home-screen shortcuts) */
export let token = new URLSearchParams(location.search).get("t") ?? "";

function loadRememberedToken(): string {
  try {
    return localStorage.getItem(REMEMBER_KEY) ?? "";
  } catch {
    return "";
  }
}

function setToken(newToken: string) {
  token = newToken;
  try {
    localStorage.setItem(REMEMBER_KEY, newToken);
  } catch {
    /* unavailable e.g. in private mode — ignore */
  }
  const search = new URLSearchParams(location.search);
  search.set("t", newToken);
  window.history.replaceState(null, "", `?${search.toString()}`);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${path}${sep}t=${encodeURIComponent(token)}`, init);
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) {
    let msg = t("error.request", { status: res.status });
    try {
      const data = (await res.json()) as { error?: string };
      if (data?.error) msg = data.error;
    } catch {
      /* non-JSON error body — keep the default message */
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

/** Convert an uploaded file's relative path to a same-origin URL */
export function fileUrl(path: string): string {
  return path ? `/${path}` : "";
}

export const api = {
  meta: () => request<MetaInfo>("/api/meta"),
  config: () => request<WelcomeConfig>("/api/config"),
  save: (config: WelcomeConfig) =>
    request<WelcomeConfig>("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    }),
  /** XHR upload to support progress callbacks (fetch has no upload progress) */
  upload: (
    file: File,
    kind: "background" | "logo",
    onProgress?: (pct: number) => void,
  ) =>
    new Promise<{ path: string }>((resolve, reject) => {
      const fd = new FormData();
      fd.append("kind", kind);
      fd.append("file", file, file.name);
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `/api/upload?t=${encodeURIComponent(token)}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onload = () => {
        if (xhr.status === 401) return reject(new UnauthorizedError());
        try {
          const data = JSON.parse(xhr.responseText) as {
            path?: string;
            error?: string;
          };
          if (xhr.status >= 200 && xhr.status < 300 && data.path) {
            resolve(data as { path: string });
          } else {
            reject(
              new Error(
                data.error ?? t("error.upload", { status: xhr.status }),
              ),
            );
          }
        } catch {
          reject(new Error(t("error.upload", { status: xhr.status })));
        }
      };
      xhr.onerror = () => reject(new Error(t("error.uploadInterrupted")));
      xhr.send(fd);
    }),
  showQr: () => request<{ ok: boolean }>("/api/qr", { method: "POST" }),
  resetToken: async () => {
    const res = await request<{ token: string; url: string }>("/api/token", {
      method: "POST",
    });
    setToken(res.token);
    return res;
  },
};

/** Remember the token after a successful connection; used when the URL has none */
export function initTokenFallback(): boolean {
  if (!token) {
    const remembered = loadRememberedToken();
    if (remembered) {
      setToken(remembered);
      return true;
    }
  }
  return false;
}

export function rememberToken() {
  if (token) setToken(token);
}
