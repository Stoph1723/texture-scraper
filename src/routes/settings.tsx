import { createFileRoute } from "@tanstack/react-router";
import { Folder, Monitor, Moon, Sun } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useAppStore, type Settings } from "@/lib/app-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Texture Scraper" },
      { name: "description", content: "Configure download folder, default resolution, format, and theme." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { settings, updateSettings } = useAppStore();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <h1 className="text-2xl font-black sm:text-3xl">Settings</h1>
        <p className="text-sm text-muted-foreground">Defaults applied to new downloads.</p>
      </header>

      <div className="space-y-6">
        <Card title="Storage" description="Where scraped textures land on disk.">
          <Label htmlFor="folder" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Download folder
          </Label>
          <div className="mt-1.5 flex gap-2">
            <div className="relative flex-1">
              <Folder className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="folder"
                value={settings.folder}
                onChange={(e) => updateSettings({ folder: e.target.value })}
                className="pl-9 font-mono text-sm"
              />
            </div>
            <Button variant="outline" onClick={() => toast.info("Folder picker would open in the desktop build.")}>
              Browse…
            </Button>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-secondary/40 px-4 py-3">
            <div>
              <div className="text-sm font-semibold">Auto-organize by category</div>
              <div className="text-xs text-muted-foreground">Creates /Brick, /Wood, /Metal subfolders automatically.</div>
            </div>
            <Switch
              checked={settings.autoOrganize}
              onCheckedChange={(v) => updateSettings({ autoOrganize: v })}
            />
          </div>
        </Card>

        <Card title="Defaults" description="Applied when you press Download from the browse grid.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Resolution
              </Label>
              <Select
                value={settings.resolution}
                onValueChange={(v) => updateSettings({ resolution: v as Settings["resolution"] })}
              >
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1K">1K — 1024px</SelectItem>
                  <SelectItem value="2K">2K — 2048px</SelectItem>
                  <SelectItem value="4K">4K — 4096px</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Image format
              </Label>
              <Select
                value={settings.format}
                onValueChange={(v) => updateSettings({ format: v as Settings["format"] })}
              >
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PNG">PNG — lossless</SelectItem>
                  <SelectItem value="JPG">JPG — smaller</SelectItem>
                  <SelectItem value="EXR">EXR — HDR pipeline</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Parallel downloads
              </Label>
              <span className="font-mono text-sm font-semibold text-primary">{settings.parallel}</span>
            </div>
            <Slider
              className="mt-3"
              min={1}
              max={8}
              step={1}
              value={[settings.parallel]}
              onValueChange={([v]) => updateSettings({ parallel: v })}
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Higher values finish faster but hit source servers harder.
            </p>
          </div>
        </Card>

        <Card title="Appearance" description="Choose how the app looks.">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
            {(["dark", "light"] as const).map((t) => {
              const active = settings.theme === t;
              const Icon = t === "dark" ? Moon : Sun;
              return (
                <button
                  key={t}
                  onClick={() => updateSettings({ theme: t })}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-4 text-left transition-all",
                    active
                      ? "border-primary bg-primary/10 shadow-[var(--shadow-glow)]"
                      : "border-border/60 bg-secondary/40 hover:border-primary/40",
                  )}
                >
                  <div
                    className={cn(
                      "grid h-10 w-10 place-items-center rounded-lg",
                      active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold capitalize">{t}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {t === "dark" ? "Studio-friendly default" : "Bright environments"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
            <Monitor className="h-3.5 w-3.5" /> Theme is applied instantly across the app.
          </div>
        </Card>
      </div>
    </div>
  );
}

function Card({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card p-6">
      <div className="mb-5">
        <h2 className="text-base font-bold">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}