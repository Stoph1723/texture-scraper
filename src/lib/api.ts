const API_BASE = "";

export interface TextureMap {
  type: string;
  size: string;
}

export interface Texture {
  id: string;
  name: string;
  source: "poly-haven" | "kenney" | "opengameart";
  category: string;
  license: string;
  downloads: number;
  hotness: number;
  createdAt: string;
  tags: string[];
  description: string;
  thumbnail: string;
  maps: TextureMap[];
}

export interface ScrapeOptions {
  source?: string;
  category?: string;
  search?: string;
  limit?: number;
}

export interface DownloadJob {
  jobId: string;
  status: string;
}

export interface DownloadStatus {
  progress: number;
  status: string;
  path?: string;
  result?: { path: string; size: number };
}

let cachedTextures: Texture[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000;

export async function fetchTextures(options: ScrapeOptions = {}): Promise<Texture[]> {
  const now = Date.now();
  if (cachedTextures && now - cacheTimestamp < CACHE_TTL && !options.search && !options.category) {
    return cachedTextures;
  }

  const params = new URLSearchParams();
  if (options.source) params.set("source", options.source);
  if (options.category) params.set("category", options.category);
  if (options.search) params.set("search", options.search);
  if (options.limit) params.set("limit", String(options.limit));

  try {
    const res = await fetch(`${API_BASE}/api/scrape?${params.toString()}`);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();

    if (!options.search && !options.category) {
      cachedTextures = data;
      cacheTimestamp = now;
    }

    return data;
  } catch (err) {
    console.error("Failed to fetch textures:", err);
    return [];
  }
}

export async function startDownload(url: string, textureId: string, destDir?: string): Promise<DownloadJob> {
  const res = await fetch(`${API_BASE}/api/download`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, textureId, destDir }),
  });
  if (!res.ok) throw new Error(`Download error: ${res.status}`);
  return res.json();
}

export async function getDownloadStatus(jobId: string): Promise<DownloadStatus> {
  const res = await fetch(`${API_BASE}/api/download/${jobId}`);
  if (!res.ok) throw new Error(`Status error: ${res.status}`);
  return res.json();
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}
