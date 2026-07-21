"""
Texture Scraper - Scrapes free PBR textures from Poly Haven, Kenney, and OpenGameArt.
License: GPL-3.0, Copyright 2026 Mustapha Elasri
"""

import json
import os
import sys
import time
import hashlib
from pathlib import Path

import requests
from bs4 import BeautifulSoup
import aiohttp


HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
}

CATEGORY_MAP = {
    "brick": "Brick", "wood": "Wood", "metal": "Metal",
    "terrain": "Terrain", "fabric": "Fabric", "rock": "Rock",
    "floor": "Floor", "stone": "Rock", "concrete": "Floor",
    "tile": "Floor", "grass": "Terrain", "ground": "Terrain",
    "sand": "Terrain", "soil": "Terrain", "bark": "Wood",
    "plank": "Wood", "steel": "Metal", "iron": "Metal", "copper": "Metal",
    "water": "Terrain", "marble": "Rock", "asphalt": "Floor",
    "plaster": "Floor", "ceramic": "Floor", "mud": "Terrain",
    "snow": "Terrain", "cliff": "Rock", "ice": "Terrain",
    "glass": "Floor", "paper": "Fabric", "wall": "Wall",
    "roof": "Floor", "carpet": "Fabric", "leather": "Fabric",
    "gravel": "Floor", "dirt": "Terrain", "moss": "Terrain",
    "leaf": "Terrain", "bamboo": "Wood", "granite": "Rock",
    "limestone": "Rock", "sandstone": "Rock", "basalt": "Rock",
    "slate": "Rock", "quartz": "Rock", "pebble": "Rock",
    "cobblestone": "Rock",
}


def _fuzzy_match(query: str, text: str) -> bool:
    q = query.lower()
    t = text.lower()
    if q in t:
        return True
    qi = 0
    for ch in t:
        if qi < len(q) and ch == q[qi]:
            qi += 1
    return qi == len(q)


class TextureScraper:
    def __init__(self):
        self.cache_dir = Path(__file__).parent / ".cache"
        self.cache_dir.mkdir(exist_ok=True)
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
        self._cache = {}

    def _load_cache(self, key, max_age=7200):
        if key in self._cache:
            ts, data = self._cache[key]
            if time.time() - ts < max_age:
                return data
        cache_file = self.cache_dir / f"{hashlib.md5(key.encode()).hexdigest()}.json"
        if cache_file.exists():
            data = json.loads(cache_file.read_text())
            if time.time() - data.get("timestamp", 0) < max_age:
                result = data.get("result")
                self._cache[key] = (data.get("timestamp", 0), result)
                return result
        return None

    def _save_cache(self, key, result):
        self._cache[key] = (time.time(), result)
        cache_file = self.cache_dir / f"{hashlib.md5(key.encode()).hexdigest()}.json"
        cache_file.write_text(json.dumps({"timestamp": time.time(), "result": result}))

    def _map_category(self, raw):
        lower = raw.lower().strip()
        for key, val in CATEGORY_MAP.items():
            if key in lower:
                return val
        return "Terrain"

    def _polish_name(self, slug):
        name = slug.replace("_", " ").replace("-", " ")
        return " ".join(w.capitalize() for w in name.split())

    def _filter(self, textures, category=None, search=None, limit=None):
        results = []
        for t in textures:
            if category and category.lower() != "all":
                if t["category"].lower() != category.lower():
                    continue
            if search:
                q = search.lower()
                if not (_fuzzy_match(q, t["name"]) or any(_fuzzy_match(q, tag) for tag in t["tags"]) or _fuzzy_match(q, t["category"])):
                    continue
            results.append(t)
            if limit and len(results) >= limit:
                break
        return results

    # ── Poly Haven (API) ──────────────────────────────────

    def _fetch_polyhaven(self):
        cached = self._load_cache("ph_all_v6")
        if cached:
            return cached

        textures = []
        try:
            resp = self.session.get("https://api.polyhaven.com/assets?t=textures", timeout=120)
            data = resp.json()
            items = list(data.items()) if isinstance(data, dict) else []

            for slug, info in items:
                name = info.get("name", self._polish_name(slug))
                cat_raw = info.get("categories", [""])[0] if info.get("categories") else ""
                category_name = self._map_category(cat_raw)

                thumb_path = info.get("thumbnail", "")
                thumbnail = f"https://cdn.polyhaven.com/asset_img/thumbs/{slug}.png?aspect_ratio=1:1&height=180&quality=95"
                if thumb_path:
                    thumbnail = f"https://cdn.polyhaven.com{thumb_path}"

                map_types = info.get("map_types", {})
                maps = []
                for map_key in map_types:
                    map_name = map_key.replace("_", " ").replace("-", " ")
                    maps.append({"type": map_name, "size": "4K"})
                if not maps:
                    maps = [{"type": "diffuse", "size": "4K"}, {"type": "normal", "size": "4K"}, {"type": "roughness", "size": "4K"}]

                textures.append({
                    "id": f"ph-{slug}",
                    "name": name,
                    "source": "poly-haven",
                    "category": category_name,
                    "license": "CC0",
                    "downloads": 0,
                    "hotness": 0,
                    "createdAt": "2024-01-01T00:00:00Z",
                    "tags": [cat_raw.lower(), "seamless", "pbr", "polyhaven"],
                    "description": f"High quality {category_name.lower()} texture from Poly Haven. Seamless PBR maps.",
                    "thumbnail": thumbnail,
                    "maps": maps,
                    "_downloadUrl": f"https://api.polyhaven.com/files/{slug}",
                })
            print(f"[scraper] Poly Haven: loaded {len(textures)} textures", file=sys.stderr)
        except Exception as e:
            print(f"[scraper] Error fetching Poly Haven: {e}", file=sys.stderr)

        self._save_cache("ph_all_v6", textures)
        return textures

    def scrape_poly_haven(self, category=None, search=None, limit=None):
        return self._filter(self._fetch_polyhaven(), category, search, limit)

    # ── Kenney ─────────────────────────────────────────────

    def _fetch_kenney(self):
        cached = self._load_cache("kenney_all_v6")
        if cached:
            return cached

        textures = []
        try:
            resp = self.session.get("https://kenney.nl/assets/category:Textures", timeout=30)
            soup = BeautifulSoup(resp.text, "lxml")
            cards = soup.select(".asset") or soup.select("[class*=asset]")

            for card in cards:
                link = card.find("a", href=True)
                if not link:
                    continue
                href = link.get("href", "")
                h2 = card.select_one("h2 a") or card.select_one("h2")
                name = h2.get_text(strip=True) if h2 else "Unknown"
                cover = card.select_one(".cover") or card.select_one("[class*=cover]")
                thumbnail = ""
                if cover:
                    style = cover.get("style", "")
                    if "url(" in style:
                        thumbnail = style.split("url(")[1].split(")")[0].strip('"').strip("'")
                slug = href.strip("/").split("/")[-1] if href else name.lower().replace(" ", "-")

                textures.append({
                    "id": f"k-{slug}",
                    "name": name,
                    "source": "kenney",
                    "category": "Terrain",
                    "license": "CC0",
                    "downloads": 0,
                    "hotness": 0,
                    "createdAt": "2024-01-01T00:00:00Z",
                    "tags": ["textures", "seamless", "pbr", "kenney"],
                    "description": f"Free texture pack from Kenney. {name} - CC0 licensed.",
                    "thumbnail": thumbnail,
                    "maps": [{"type": "diffuse", "size": "1K"}],
                    "_downloadUrl": f"https://kenney.nl/assets/{slug}",
                })
            print(f"[scraper] Kenney: loaded {len(textures)} textures", file=sys.stderr)
        except Exception as e:
            print(f"[scraper] Error fetching Kenney: {e}", file=sys.stderr)

        self._save_cache("kenney_all_v6", textures)
        return textures

    def scrape_kenney(self, category=None, search=None, limit=None):
        return self._filter(self._fetch_kenney(), category, search, limit)

    # ── OpenGameArt ────────────────────────────────────────

    def _fetch_opengameart(self):
        cached = self._load_cache("oga_all_v6")
        if cached:
            return cached

        textures = []
        url = "https://opengameart.org/art-search-advanced?keys=&title=&field_art_type_tid%5B%5D=14&field_art_tags_tid_op=or&field_art_tags_tid=&name=&field_art_licenses_tid_op=or&sort_by=count&sort_order=DESC"

        try:
            resp = self.session.get(url, timeout=30)
            soup = BeautifulSoup(resp.text, "lxml")
            content_links = []
            seen_hrefs = set()
            for a in soup.find_all("a", href=True):
                href = a["href"]
                text = a.get_text(strip=True)
                if "/content/" in href and "forumtopic" not in href and "faq" not in href.lower() and href.split("#")[0] not in seen_hrefs and text and len(text) > 3:
                    clean_href = href.split("#")[0]
                    seen_hrefs.add(clean_href)
                    content_links.append((text, clean_href))

            for name, href in content_links:
                slug = href.strip("/").split("/")[-1]
                textures.append({
                    "id": f"oga-{slug}",
                    "name": name,
                    "source": "opengameart",
                    "category": self._map_category(name),
                    "license": "CC-BY",
                    "downloads": 0,
                    "hotness": 0,
                    "createdAt": "2024-01-01T00:00:00Z",
                    "tags": ["textures", "seamless", "pbr", "opengameart"],
                    "description": f"Free texture from OpenGameArt. {name}.",
                    "thumbnail": "",
                    "maps": [{"type": "diffuse", "size": "2K"}],
                    "_downloadUrl": f"https://opengameart.org{href}",
                })
            print(f"[scraper] OpenGameArt: loaded {len(textures)} textures", file=sys.stderr)
        except Exception as e:
            print(f"[scraper] Error fetching OpenGameArt: {e}", file=sys.stderr)

        self._save_cache("oga_all_v6", textures)
        return textures

    def scrape_opengameart(self, category=None, search=None, limit=None):
        return self._filter(self._fetch_opengameart(), category, search, limit)

    # ── All Sources ────────────────────────────────────────

    def scrape_all(self, category=None, search=None, limit=None):
        results = []
        results.extend(self.scrape_poly_haven(category, search, limit))
        results.extend(self.scrape_kenney(category, search, limit))
        results.extend(self.scrape_opengameart(category, search, limit))
        return results

    def preload_all(self):
        print("[scraper] Pre-loading all texture sources...", file=sys.stderr)
        self._fetch_polyhaven()
        self._fetch_kenney()
        self._fetch_opengameart()
        total = len(self._cache.get("ph_all_v6", (0, []))[1]) + \
                len(self._cache.get("kenney_all_v6", (0, []))[1]) + \
                len(self._cache.get("oga_all_v6", (0, []))[1])
        print(f"[scraper] Pre-load complete: {total} textures cached", file=sys.stderr)


async def resolve_download_url(api_url, session, resolution="2K", fmt="jpg"):
    """Resolve a download API URL to an actual file URL."""
    if "api.polyhaven.com/files/" in api_url:
        slug = api_url.split("/")[-1]
        try:
            async with session.get(api_url, headers=HEADERS, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    for map_type in ["Diffuse", "diffuse"]:
                        if map_type in data:
                            res_data = data[map_type]
                            for res_key in [resolution.lower(), "2k", "1k", "4k"]:
                                if res_key in res_data:
                                    fmt_data = res_data[res_key]
                                    for f in [fmt.lower(), "jpg", "png"]:
                                        if f in fmt_data:
                                            return fmt_data[f]["url"]
        except Exception:
            pass
        return f"https://polyhaven.com/textures/{slug}"

    if "kenney.nl/assets/" in api_url and "/download" not in api_url:
        slug = api_url.strip("/").split("/")[-1]
        try:
            async with session.get(f"https://kenney.nl/assets/{slug}", headers=HEADERS, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                if resp.status == 200:
                    html = await resp.text()
                    soup = BeautifulSoup(html, "lxml")
                    modal = soup.select_one("#inline-download")
                    if modal:
                        for a in modal.find_all("a", href=True):
                            href = a.get("href", "")
                            if "media" in href or ".zip" in href:
                                return href if href.startswith("http") else f"https://kenney.nl{href}"
        except Exception:
            pass
        return f"https://kenney.nl/assets/{slug}/download"

    if "opengameart.org/content/" in api_url:
        try:
            async with session.get(api_url, headers=HEADERS, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                if resp.status == 200:
                    html = await resp.text()
                    soup = BeautifulSoup(html, "lxml")
                    for a in soup.find_all("a", href=True):
                        href = a.get("href", "")
                        if href.endswith(".zip") or href.endswith(".rar") or href.endswith(".7z"):
                            return href if href.startswith("http") else f"https://opengameart.org{href}"
        except Exception:
            pass

    return api_url


async def download_texture(url, dest, progress_callback=None, resolution="2K", fmt="jpg"):
    """Download a texture file."""
    os.makedirs(os.path.dirname(dest) if os.path.dirname(dest) else ".", exist_ok=True)

    async with aiohttp.ClientSession() as session:
        actual_url = await resolve_download_url(url, session, resolution, fmt)
        print(f"[download] Resolved URL: {actual_url[:100]}", file=sys.stderr)

        async with session.get(actual_url, headers=HEADERS, timeout=aiohttp.ClientTimeout(total=600), allow_redirects=True) as resp:
            if resp.status != 200:
                return {"error": f"HTTP {resp.status} from {actual_url}"}
            total = resp.content_length or 0
            downloaded = 0
            with open(dest, "wb") as f:
                async for chunk in resp.content.iter_chunked(8192):
                    f.write(chunk)
                    downloaded += len(chunk)
                    if progress_callback:
                        progress_callback(downloaded, total)

    return {"path": dest, "size": os.path.getsize(dest), "url": actual_url}


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Texture Scraper")
    parser.add_argument("--source", choices=["poly-haven", "kenney", "opengameart", "all"], default="all")
    parser.add_argument("--category", type=str, default=None)
    parser.add_argument("--search", type=str, default=None)
    parser.add_argument("--limit", type=int, default=20)
    args = parser.parse_args()

    scraper = TextureScraper()
    if args.source == "all":
        results = scraper.scrape_all(args.category, args.search, args.limit)
    else:
        fn = getattr(scraper, f"scrape_{args.source.replace('-', '_')}")
        results = fn(args.category, args.search, args.limit)
    print(json.dumps(results, indent=2))
