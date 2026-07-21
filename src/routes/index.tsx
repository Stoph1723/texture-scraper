import { createFileRoute } from "@tanstack/react-router";
import { Search, SlidersHorizontal, X, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { TextureCard } from "@/components/texture-card";
import { TextureDetailDialog } from "@/components/texture-detail-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/lib/app-store";
import {
  SOURCE_LABEL,
  loadTextures,
  searchLocal,
  type Texture,
  type TextureCategory,
  type TextureSource,
} from "@/lib/textures";
import { cn } from "@/lib/utils";

const CATEGORIES: (TextureCategory | "All")[] = [
  "All", "Brick", "Wood", "Metal", "Terrain", "Fabric", "Rock", "Floor", "Wall",
];

type Sort = "hot" | "latest" | "name" | "downloads";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Browse textures — Texture Scraper" },
      { name: "description", content: "Search and filter seamless PBR textures across Poly Haven, Kenney, and OpenGameArt." },
    ],
  }),
  component: BrowsePage,
});

function BrowsePage() {
  const { enqueue } = useAppStore();
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<TextureSource | "all">("all");
  const [category, setCategory] = useState<TextureCategory | "All">("All");
  const [sort, setSort] = useState<Sort>("hot");
  const [selected, setSelected] = useState<Texture | null>(null);
  const [open, setOpen] = useState(false);

  const [serverTextures, setServerTextures] = useState<Texture[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const currentOffset = useRef(0);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doFetch = useCallback(
    async (src: string, cat: string, search: string, offset: number, append: boolean) => {
      setLoading(true);
      try {
        const data = await loadTextures({
          search: search || undefined,
          category: cat !== "All" ? cat : undefined,
          source: src !== "all" ? src : undefined,
          limit: 200,
          offset,
        });
        if (append) {
          setServerTextures((prev) => [...prev, ...data.textures]);
        } else {
          setServerTextures(data.textures);
        }
        setTotalCount(data.total);
        setHasMore(data.hasMore);
        currentOffset.current = offset + data.textures.length;
      } catch (err) {
        console.error("Failed to load textures:", err);
        if (!append) setServerTextures([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    doFetch(source, category, query, 0, false);
  }, []);

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      currentOffset.current = 0;
      doFetch(source, category, query, 0, false);
    }, 350);
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
  }, [source, category]);

  const handleSearchSubmit = () => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    currentOffset.current = 0;
    doFetch(source, category, query, 0, false);
  };

  const handleLoadMore = () => {
    doFetch(source, category, query, currentOffset.current, true);
  };

  const localFiltered = searchLocal(serverTextures, query);

  const sorted = (() => {
    const list = localFiltered.slice();
    switch (sort) {
      case "hot": list.sort((a, b) => b.hotness - a.hotness); break;
      case "latest": list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)); break;
      case "name": list.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "downloads": list.sort((a, b) => b.downloads - a.downloads); break;
    }
    return list;
  })();

  const openDetail = (t: Texture) => { setSelected(t); setOpen(true); };
  const quickDownload = (t: Texture) => {
    enqueue(t);
    toast.success(`Queued: ${t.name}`, { description: "Track progress in Downloads." });
  };

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6">
      <section className="mb-8 flex flex-col gap-2">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
          Browse the texture library
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {totalCount} seamless PBR textures from Poly Haven, Kenney, and OpenGameArt.
          Search with fuzzy matching, filter by source and category.
        </p>
      </section>

      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
            placeholder="Search textures, tags, categories (fuzzy matching)…"
            className="h-11 pl-9 pr-9 text-sm"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); currentOffset.current = 0; doFetch(source, category, "", 0, false); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <Select value={source} onValueChange={(v) => setSource(v as TextureSource | "all")}>
          <SelectTrigger className="h-11 w-full md:w-[190px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {Object.entries(SOURCE_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.full}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
          <SelectTrigger className="h-11 w-full md:w-[160px]">
            <SlidersHorizontal className="mr-1 h-4 w-4 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hot">Hot</SelectItem>
            <SelectItem value="latest">Latest</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="downloads">Downloads</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {CATEGORIES.map((c) => {
          const active = category === c;
          return (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
                active
                  ? "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
                  : "border-border/60 bg-secondary/40 text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {c}
            </button>
          );
        })}
      </div>

      {loading && sorted.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-border/60 py-24 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Loading textures…</p>
        </div>
      ) : sorted.length === 0 ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-border/60 py-24 text-center">
          <div>
            <p className="text-lg font-semibold">No textures match your filters</p>
            <p className="mt-1 text-sm text-muted-foreground">Try clearing the search or category.</p>
            <Button variant="outline" className="mt-4" onClick={() => { setQuery(""); setCategory("All"); setSource("all"); }}>
              Reset filters
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="mb-3 text-xs text-muted-foreground">
            Showing {sorted.length} textures {query && `matching "${query}"`}
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {sorted.map((t) => (
              <TextureCard key={t.id} texture={t} onOpen={() => openDetail(t)} onDownload={() => quickDownload(t)} />
            ))}
          </div>

          {hasMore && !query && (
            <div className="mt-8 flex justify-center">
              <Button variant="outline" size="lg" onClick={handleLoadMore} disabled={loading} className="min-w-[200px]">
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…</>
                ) : (
                  `Load more (${sorted.length} of ${totalCount})`
                )}
              </Button>
            </div>
          )}
        </>
      )}

      <TextureDetailDialog texture={selected} open={open} onOpenChange={setOpen} />
    </div>
  );
}
