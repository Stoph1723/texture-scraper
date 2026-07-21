export type TextureSource = "poly-haven" | "kenney" | "opengameart";
export type TextureCategory =
  | "Brick" | "Wood" | "Metal" | "Terrain" | "Fabric" | "Rock" | "Floor" | "Wall";

export type License = "CC0" | "CC-BY" | "CC-BY-SA";

export interface TextureMap {
  type: "diffuse" | "normal" | "roughness" | "ao" | "displacement" | "metallic";
  size: string;
}

export interface Texture {
  id: string;
  name: string;
  source: TextureSource;
  category: TextureCategory;
  license: License;
  downloads: number;
  hotness: number;
  createdAt: string;
  tags: string[];
  description: string;
  thumbnail: string;
  maps: TextureMap[];
  _downloadUrl?: string;
}

export const SOURCE_LABEL: Record<TextureSource, { short: string; full: string }> = {
  "poly-haven": { short: "PH", full: "Poly Haven" },
  kenney: { short: "K", full: "Kenney" },
  opengameart: { short: "OGA", full: "OpenGameArt" },
};

export interface ScrapeResponse {
  textures: Texture[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export let TEXTURES: Texture[] = [];

function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t.includes(q)) return 100;
  let qi = 0;
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++;
  }
  return qi === q.length ? 50 : 0;
}

export function searchLocal(textures: Texture[], query: string): Texture[] {
  if (!query.trim()) return textures;
  const q = query.toLowerCase().trim();
  return textures
    .map((t) => {
      let score = 0;
      score = Math.max(score, fuzzyScore(q, t.name));
      for (const tag of t.tags) score = Math.max(score, fuzzyScore(q, tag) * 0.8);
      score = Math.max(score, fuzzyScore(q, t.category) * 0.6);
      score = Math.max(score, fuzzyScore(q, t.source) * 0.4);
      return { texture: t, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.texture);
}

export async function loadTextures(
  opts?: { search?: string; category?: string; source?: string; limit?: number; offset?: number },
): Promise<ScrapeResponse> {
  const params = new URLSearchParams();
  if (opts?.search) params.set("search", opts.search);
  if (opts?.category && opts.category !== "All") params.set("category", opts.category);
  if (opts?.source && opts.source !== "all") params.set("source", opts.source);
  params.set("limit", String(opts?.limit ?? 50));
  params.set("offset", String(opts?.offset ?? 0));

  const res = await fetch(`/api/scrape?${params.toString()}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data: ScrapeResponse = await res.json();

  if (!opts?.offset) {
    TEXTURES = data.textures;
  } else {
    TEXTURES = [...TEXTURES, ...data.textures];
  }

  return data;
}
