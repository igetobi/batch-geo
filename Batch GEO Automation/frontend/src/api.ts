/**
 * Typed API client for the BatchGeo Map Generator backend.
 * All authenticated endpoints require a Bearer token stored in memory.
 */

// ---------------------------------------------------------------------------
// Types (mirroring backend Pydantic models)
// ---------------------------------------------------------------------------

export interface ClientProfile {
  business_name: string;
  phone: string;
  email: string;
  website: string;
  city: string;
  state: string;
  gmb_cid?: string | null;
  image_urls?: string[];
  social_urls?: string[];
  video_iframes?: Record<string, string>;
  // legacy fields
  logo_url?: string | null;
  social_url?: string | null;
  iframe_embed_html?: string | null;
}

export interface BoundingBox {
  min_lat: number;
  max_lat: number;
  min_lon: number;
  max_lon: number;
}

export interface MapRequest {
  client: ClientProfile;
  services: string[];
  landmarks: string[];
  geo_modifiers: string[];
  pin_count: number;
  map_title: string;
  map_slug: string;
  bounding_box?: BoundingBox | null;
  seed?: number | null;
}

export interface GeneratedPin {
  keyword_title: string;
  latitude: number;
  longitude: number;
}

export interface MapResult {
  pins: GeneratedPin[];
  csv_text: string;
  description: string;
  map_url: string | null;
  embed_code: string | null;
}

export type JobState =
  | "generating"
  | "publishing"
  | "done"
  | "needs_manual_finish"
  | "error";

export interface ManualFinishPayload {
  csv_text: string;
  map_title: string;
  instructions: string[];
}

export interface JobStatus {
  id: string;
  state: JobState;
  message: string | null;
  payload?: ManualFinishPayload | null;
}

export interface SavedMap {
  id: string;
  title: string;
  slug: string;
  map_url: string | null;
  embed_code: string | null;
  csv_text: string;
  description: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Token store — persisted in sessionStorage so a page refresh keeps the user
// logged in, but the session clears when the tab is closed.
// ---------------------------------------------------------------------------

const TOKEN_KEY = "bgmap_token";

// Restore token from sessionStorage on module load.
let _token: string | null = (() => {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
})();

export function setToken(token: string): void {
  _token = token;
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    // sessionStorage unavailable — keep in-memory only
  }
}

export function clearToken(): void {
  _token = null;
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function hasToken(): boolean {
  return _token !== null;
}

// ---------------------------------------------------------------------------
// Base fetch helper
// ---------------------------------------------------------------------------

const BASE_URL = import.meta.env.VITE_API_URL ?? "";

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (_token) {
    headers["Authorization"] = `Bearer ${_token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      detail = body?.detail ?? detail;
    } catch {
      // ignore parse error
    }
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// API endpoints
// ---------------------------------------------------------------------------

export async function login(
  username: string,
  password: string
): Promise<{ token: string }> {
  return apiFetch<{ token: string }>("/api/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function generateMap(request: MapRequest): Promise<MapResult> {
  return apiFetch<MapResult>("/api/generate", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function publishMap(
  map_result: MapResult,
  request: MapRequest
): Promise<{ job_id: string }> {
  return apiFetch<{ job_id: string }>("/api/publish", {
    method: "POST",
    body: JSON.stringify({ map_result, request }),
  });
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  return apiFetch<JobStatus>(`/api/jobs/${jobId}`);
}

export async function listMaps(): Promise<SavedMap[]> {
  return apiFetch<SavedMap[]>("/api/maps");
}

export interface FetchGmbImagesResult {
  image_urls: string[];
}

export async function fetchGmbImages(
  business_name: string,
  city: string,
  state: string
): Promise<FetchGmbImagesResult> {
  return apiFetch<FetchGmbImagesResult>("/api/fetch-gmb-images", {
    method: "POST",
    body: JSON.stringify({ business_name, city, state }),
  });
}

export interface FetchCitationsResult {
  gmb_cid: string | null;
  citations: string[];
}

export async function fetchCitationsFromSheet(
  sheet_url: string
): Promise<FetchCitationsResult> {
  return apiFetch<FetchCitationsResult>("/api/fetch-citations", {
    method: "POST",
    body: JSON.stringify({ sheet_url }),
  });
}

export function downloadCsv(csvText: string, filename: string): void {
  const blob = new Blob([csvText], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadXlsx(csvText: string, filename: string): Promise<void> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = sessionStorage.getItem("bgmap_token");
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(`${BASE_URL}/api/download-xlsx`, {
    method: "POST",
    headers,
    body: JSON.stringify({ csv_text: csvText, filename }),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export function pollJobUntilDone(
  jobId: string,
  onUpdate: (status: JobStatus) => void,
  intervalMs = 2000
): () => void {
  let cancelled = false;

  async function tick() {
    if (cancelled) return;
    try {
      const status = await getJobStatus(jobId);
      onUpdate(status);
      if (
        status.state !== "publishing" &&
        status.state !== "generating"
      ) {
        return; // terminal state — stop polling
      }
    } catch {
      // network glitch — keep trying
    }
    if (!cancelled) {
      setTimeout(tick, intervalMs);
    }
  }

  setTimeout(tick, intervalMs);
  return () => {
    cancelled = true;
  };
}
