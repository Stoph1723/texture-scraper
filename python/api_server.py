"""
API server for the Texture Scraper.
Run: python api_server.py
Pre-fetches all texture sources on startup for fast queries.
"""

import asyncio
import json
import os
import time
from pathlib import Path

from aiohttp import web

from scraper import TextureScraper, download_texture


scraper = TextureScraper()
active_downloads = {}


async def handle_scrape(request: web.Request) -> web.Response:
    source = request.query.get("source", "all")
    category = request.query.get("category", None)
    search = request.query.get("search", None)
    limit = int(request.query.get("limit", "50"))
    offset = int(request.query.get("offset", "0"))

    loop = asyncio.get_event_loop()

    def do_scrape():
        if source == "all":
            total = len(scraper.scrape_all(category, search))
            results = scraper.scrape_all(category, search, total)
        elif source == "poly-haven":
            total = len(scraper.scrape_poly_haven(category, search))
            results = scraper.scrape_poly_haven(category, search, total)
        elif source == "kenney":
            total = len(scraper.scrape_kenney(category, search))
            results = scraper.scrape_kenney(category, search, total)
        elif source == "opengameart":
            total = len(scraper.scrape_opengameart(category, search))
            results = scraper.scrape_opengameart(category, search, total)
        else:
            total = len(scraper.scrape_all(category, search))
            results = scraper.scrape_all(category, search, total)
        return total, results

    total, all_results = await loop.run_in_executor(None, do_scrape)
    paginated = all_results[offset:offset + limit]

    return web.json_response({
        "textures": paginated,
        "total": total,
        "offset": offset,
        "limit": limit,
        "hasMore": offset + limit < total,
    })


async def handle_download(request: web.Request) -> web.Response:
    body = await request.json()
    url = body.get("url")
    texture_id = body.get("textureId", "unknown")
    dest_dir = body.get("destDir", os.path.expanduser("~/Downloads/Textures"))
    resolution = body.get("resolution", "2K")
    fmt = body.get("format", "jpg")

    if not url:
        return web.json_response({"error": "url is required"}, status=400)

    os.makedirs(dest_dir, exist_ok=True)
    dest = os.path.join(dest_dir, f"{texture_id}_{resolution}.{fmt}")
    job_id = f"{texture_id}-{int(time.time() * 1000)}"

    active_downloads[job_id] = {
        "progress": 0,
        "status": "downloading",
        "path": dest,
        "downloadedBytes": 0,
        "totalBytes": 0,
        "speedBytesPerSec": 0,
    }

    async def run_download():
        try:
            last_bytes = [0]
            last_time = [time.time()]

            def on_progress(downloaded, total):
                now = time.time()
                elapsed = now - last_time[0]
                if elapsed >= 0.3:
                    speed = (downloaded - last_bytes[0]) / elapsed if elapsed > 0 else 0
                    active_downloads[job_id]["speedBytesPerSec"] = speed
                    last_bytes[0] = downloaded
                    last_time[0] = now
                active_downloads[job_id]["downloadedBytes"] = downloaded
                active_downloads[job_id]["totalBytes"] = total
                if total > 0:
                    active_downloads[job_id]["progress"] = min(99, downloaded * 100 // total)

            result = await download_texture(url, dest, on_progress, resolution, fmt)
            if "error" in result:
                active_downloads[job_id]["status"] = "failed"
                active_downloads[job_id]["error"] = result["error"]
            else:
                active_downloads[job_id]["status"] = "completed"
                active_downloads[job_id]["progress"] = 100
                active_downloads[job_id]["result"] = result
                active_downloads[job_id]["speedBytesPerSec"] = 0
        except Exception as e:
            active_downloads[job_id]["status"] = "failed"
            active_downloads[job_id]["error"] = str(e)

    asyncio.create_task(run_download())
    return web.json_response({"jobId": job_id, "status": "started"})


async def handle_download_status(request: web.Request) -> web.Response:
    job_id = request.match_info["jobId"]
    job = active_downloads.get(job_id)
    if not job:
        return web.json_response({"error": "not found"}, status=404)
    return web.json_response(job)


async def handle_health(request: web.Request) -> web.Response:
    return web.json_response({"status": "ok"})


def create_app() -> web.Application:
    app = web.Application()
    app.router.add_get("/api/scrape", handle_scrape)
    app.router.add_post("/api/download", handle_download)
    app.router.add_get("/api/download/{jobId}", handle_download_status)
    app.router.add_get("/api/health", handle_health)
    return app


if __name__ == "__main__":
    app = create_app()

    async def start_preload(app):
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, scraper.preload_all)

    app.on_startup.append(start_preload)

    print("Texture Scraper API running on http://localhost:3456")
    web.run_app(app, port=3456)
