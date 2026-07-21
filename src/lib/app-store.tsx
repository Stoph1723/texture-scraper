import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Texture } from "./textures";

export type DownloadStatus =
  | "queued"
  | "downloading"
  | "paused"
  | "completed"
  | "cancelled";

export interface DownloadJob {
  id: string;
  texture: Texture;
  resolution: "1K" | "2K" | "4K";
  format: "PNG" | "JPG" | "EXR";
  progress: number; // 0-100
  sizeMb: number;
  speedMbs: number;
  status: DownloadStatus;
  addedAt: number;
}

export interface Settings {
  folder: string;
  resolution: "1K" | "2K" | "4K";
  format: "PNG" | "JPG" | "EXR";
  parallel: number;
  autoOrganize: boolean;
  theme: "dark" | "light";
}

const DEFAULT_SETTINGS: Settings = {
  folder: "~/Downloads/Textures",
  resolution: "2K",
  format: "PNG",
  parallel: 3,
  autoOrganize: true,
  theme: "dark",
};

interface AppStore {
  jobs: DownloadJob[];
  settings: Settings;
  enqueue: (
    texture: Texture,
    opts?: { resolution?: Settings["resolution"]; format?: Settings["format"] },
  ) => void;
  pause: (id: string) => void;
  resume: (id: string) => void;
  cancel: (id: string) => void;
  remove: (id: string) => void;
  clearCompleted: () => void;
  reorder: (id: string, direction: "up" | "down") => void;
  updateSettings: (patch: Partial<Settings>) => void;
}

const Ctx = createContext<AppStore | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<DownloadJob[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const tickRef = useRef<number | null>(null);

  // Apply theme class
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (settings.theme === "light") root.classList.add("light");
    else root.classList.remove("light");
  }, [settings.theme]);

  // Real download progress polling
  useEffect(() => {
    tickRef.current = window.setInterval(() => {
      setJobs((prev) => {
        const downloading = prev.filter((j) => j.status === "downloading" && j.id.includes("-"));
        if (downloading.length === 0) return prev;

        for (const job of downloading) {
          fetch(`/api/download/${job.id}`)
            .then((res) => res.json())
            .then((data) => {
              if (data.progress !== undefined) {
                setJobs((p) =>
                  p.map((j) => {
                    if (j.id !== job.id) return j;
                    const speedMbs = data.speedBytesPerSec ? data.speedBytesPerSec / (1024 * 1024) : 0;
                    if (data.status === "completed") {
                      return { ...j, progress: 100, status: "completed" as const, speedMbs: 0 };
                    }
                    if (data.status === "failed") {
                      return { ...j, status: "cancelled" as const, speedMbs: 0 };
                    }
                    return {
                      ...j,
                      progress: data.progress || 0,
                      speedMbs,
                      sizeMb: data.totalBytes ? data.totalBytes / (1024 * 1024) : j.sizeMb,
                    };
                  }),
                );
              }
            })
            .catch(() => {});
        }

        return prev;
      });
    }, 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
    };
  }, []);

  const enqueue = useCallback<AppStore["enqueue"]>((texture, opts) => {
    const jobId = `${texture.id}-${Date.now()}`;
    const resolution = opts?.resolution ?? DEFAULT_SETTINGS.resolution;
    const format = opts?.format ?? DEFAULT_SETTINGS.format;

    setJobs((prev) => [
      ...prev,
      {
        id: jobId,
        texture,
        resolution,
        format,
        progress: 0,
        sizeMb: 20 + Math.random() * 180,
        speedMbs: 0,
        status: "downloading" as const,
        addedAt: Date.now(),
      },
    ]);

    const downloadUrl = (texture as Record<string, unknown>)._downloadUrl as string | undefined;
    if (downloadUrl) {
      fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: downloadUrl,
          textureId: texture.id,
          destDir: settings.folder,
          resolution,
          format: format.toLowerCase(),
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.jobId) {
            setJobs((prev) =>
              prev.map((j) => (j.id === jobId ? { ...j, id: data.jobId } : j)),
            );
          }
        })
        .catch((err) => {
          console.error("Download failed:", err);
          setJobs((prev) =>
            prev.map((j) =>
              j.id === jobId ? { ...j, status: "cancelled" as const, speedMbs: 0 } : j,
            ),
          );
        });
    }
  }, [settings.folder]);

  const pause = useCallback((id: string) => {
    setJobs((p) => p.map((j) => (j.id === id && j.status === "downloading" ? { ...j, status: "paused", speedMbs: 0 } : j)));
  }, []);
  const resume = useCallback((id: string) => {
    setJobs((p) => p.map((j) => (j.id === id && j.status === "paused" ? { ...j, status: "queued" } : j)));
  }, []);
  const cancel = useCallback((id: string) => {
    setJobs((p) => p.map((j) => (j.id === id ? { ...j, status: "cancelled", speedMbs: 0 } : j)));
  }, []);
  const remove = useCallback((id: string) => {
    setJobs((p) => p.filter((j) => j.id !== id));
  }, []);
  const clearCompleted = useCallback(() => {
    setJobs((p) => p.filter((j) => j.status !== "completed" && j.status !== "cancelled"));
  }, []);
  const reorder = useCallback((id: string, direction: "up" | "down") => {
    setJobs((p) => {
      const idx = p.findIndex((j) => j.id === id);
      if (idx === -1) return p;
      const target = direction === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= p.length) return p;
      const next = [...p];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }, []);
  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  const value = useMemo<AppStore>(
    () => ({ jobs, settings, enqueue, pause, resume, cancel, remove, clearCompleted, reorder, updateSettings }),
    [jobs, settings, enqueue, pause, resume, cancel, remove, clearCompleted, reorder, updateSettings],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAppStore must be used within AppStoreProvider");
  return v;
}