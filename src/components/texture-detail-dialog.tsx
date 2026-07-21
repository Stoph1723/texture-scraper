import { Download, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore, type Settings } from "@/lib/app-store";
import { SOURCE_LABEL, type Texture } from "@/lib/textures";
import { useState } from "react";

interface Props {
  texture: Texture | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TextureDetailDialog({ texture, open, onOpenChange }: Props) {
  const { enqueue, settings } = useAppStore();
  const [resolution, setResolution] = useState<Settings["resolution"]>(settings.resolution);
  const [format, setFormat] = useState<Settings["format"]>(settings.format);

  if (!texture) return null;
  const src = SOURCE_LABEL[texture.source];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl overflow-hidden p-0">
        <div className="grid gap-0 md:grid-cols-[1.1fr_1fr]">
          <div className="relative bg-black">
            <img src={texture.thumbnail} alt={texture.name} className="h-full max-h-[520px] w-full object-cover" />
            <div className="absolute left-3 top-3 flex gap-1.5">
              <Badge>{src.full}</Badge>
              <Badge variant="secondary">{texture.category}</Badge>
              <Badge variant="outline" className="bg-background/70 backdrop-blur">
                {texture.license}
              </Badge>
            </div>
          </div>

          <div className="flex flex-col gap-5 p-6">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-2xl">{texture.name}</DialogTitle>
              <DialogDescription>{texture.description}</DialogDescription>
            </DialogHeader>

            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Included maps
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {texture.maps.map((m) => (
                  <div
                    key={m.type}
                    className="flex items-center justify-between rounded-md border border-border/60 bg-secondary/40 px-2.5 py-1.5 text-xs"
                  >
                    <span className="capitalize text-foreground">{m.type}</span>
                    <span className="font-mono text-muted-foreground">{m.size}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tags
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {texture.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-full border border-border/60 bg-secondary/50 px-2 py-0.5 text-[11px] text-muted-foreground"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Resolution
                </label>
                <Select value={resolution} onValueChange={(v) => setResolution(v as Settings["resolution"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1K">1K</SelectItem>
                    <SelectItem value="2K">2K</SelectItem>
                    <SelectItem value="4K">4K</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Format
                </label>
                <Select value={format} onValueChange={(v) => setFormat(v as Settings["format"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PNG">PNG</SelectItem>
                    <SelectItem value="JPG">JPG</SelectItem>
                    <SelectItem value="EXR">EXR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-auto flex gap-2 pt-2">
              <Button
                className="flex-1"
                onClick={() => {
                  enqueue(texture, { resolution, format });
                  onOpenChange(false);
                }}
              >
                <Download className="mr-2 h-4 w-4" /> Download now
              </Button>
              <Button
                variant="outline"
                onClick={() => enqueue(texture, { resolution, format })}
              >
                <Plus className="mr-2 h-4 w-4" /> Add to queue
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}