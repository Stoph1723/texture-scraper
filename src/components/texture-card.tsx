import { Download, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SOURCE_LABEL, type Texture } from "@/lib/textures";
import { cn } from "@/lib/utils";

interface Props {
  texture: Texture;
  onOpen: () => void;
  onDownload: () => void;
}

const SOURCE_STYLE: Record<Texture["source"], string> = {
  "poly-haven": "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  kenney: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  opengameart: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
};

export function TextureCard({ texture, onOpen, onDownload }: Props) {
  const src = SOURCE_LABEL[texture.source];
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border/60 bg-card transition-all hover:border-primary/50 hover:shadow-[var(--shadow-glow)]">
      <button
        onClick={onOpen}
        className="relative block aspect-square w-full overflow-hidden"
        aria-label={`Preview ${texture.name}`}
      >
        <img
          src={texture.thumbnail}
          alt={texture.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/10 to-transparent opacity-70" />
        <div className="absolute left-2 top-2 flex gap-1.5">
          <span
            className={cn(
              "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold tracking-wide",
              SOURCE_STYLE[texture.source],
            )}
            title={src.full}
          >
            {src.short}
          </span>
          <Badge variant="secondary" className="border-border/60 text-[10px]">
            {texture.category}
          </Badge>
        </div>
        <div className="absolute right-2 top-2">
          <span className="rounded-md bg-background/70 px-1.5 py-0.5 text-[10px] font-semibold text-foreground backdrop-blur-sm">
            {texture.license}
          </span>
        </div>
      </button>

      <div className="flex items-center justify-between gap-2 p-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-foreground">{texture.name}</h3>
          <p className="text-[11px] text-muted-foreground">
            {texture.downloads.toLocaleString()} downloads
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onOpen} aria-label="Preview">
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            className="h-8 w-8"
            onClick={onDownload}
            aria-label="Download"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}