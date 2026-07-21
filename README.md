# Texture Scraper

> Free PBR texture scraper and download manager. Browse, search, and batch-download seamless textures from Poly Haven, Kenney, and OpenGameArt — all in one place.

**815+ textures** scraped from 3 major free texture sources. Fuzzy search, category filters, source filters, and a built-in download manager with real-time progress tracking.

---

## Features

- **815+ free PBR textures** from Poly Haven, Kenney, and OpenGameArt
- **Fuzzy search** — find textures even with partial or misspelled queries
- **Filter by source** — Poly Haven, Kenney, OpenGameArt, or all
- **Filter by category** — Brick, Wood, Metal, Terrain, Fabric, Rock, Floor, Wall
- **Batch download manager** — queue multiple downloads with real-time speed and progress
- **Resolution selection** — download in 1K, 2K, or 4K
- **Format selection** — PNG, JPG, or EXR
- **Automatic caching** — fast responses after first load
- **Dark/Light theme**

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.10+, aiohttp, BeautifulSoup4, requests |
| **Frontend** | React 19, TypeScript, TanStack Router, Tailwind CSS 4 |
| **Build** | Vite 8, pnpm |
| **Scraping** | Poly Haven API, HTML scraping (Kenney, OpenGameArt) |

## Quick Start

### Prerequisites

- [Python 3.10+](https://python.org/downloads)
- [Node.js 18+](https://nodejs.org)
- [pnpm](https://pnpm.io/installation) (`npm install -g pnpm`)

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/texture-scraper.git
cd texture-scraper
```

### 2. Install Python dependencies

```bash
cd python
pip install -r requirements.txt
cd ..
```

### 3. Install frontend dependencies

```bash
pnpm install
```

### 4. Start the backend API

```bash
cd python
python api_server.py
```

The API server starts on `http://localhost:3456` and pre-loads all textures on first request.

### 5. Start the frontend

```bash
pnpm run dev
```

Open **http://localhost:5173** in your browser. The frontend proxies API requests to the backend automatically.

### Quick start with one command

**Windows:**
```bash
start-backend.bat
```

**Manual (two terminals):**

Terminal 1 — Backend:
```bash
cd python && python api_server.py
```

Terminal 2 — Frontend:
```bash
pnpm run dev
```

## Usage

1. **Browse** — Textures load automatically from all 3 sources
2. **Search** — Type in the search bar for fuzzy matching across names, tags, and categories
3. **Filter** — Click source buttons (PH, Kenney, OGA) or category pills to narrow results
4. **Download** — Click the download icon on any texture card, or open the detail dialog to pick resolution/format
5. **Track** — Go to the Downloads page to monitor progress, speed, and ETA for all active downloads

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/scrape?source=&category=&search=&limit=&offset=` | Search and filter textures |
| `POST` | `/api/download` | Start a texture download |
| `GET` | `/api/download/{jobId}` | Check download progress |
| `GET` | `/api/health` | Health check |

## License

This project is licensed under the **GNU General Public License v3.0** — see the [LICENSE.txt](LICENSE.txt) file for details.

Copyright (c) 2026 Mustapha Elasri
