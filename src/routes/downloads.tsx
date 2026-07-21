import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Download,
  Inbox,
  Pause,
  Play,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAppStore, type DownloadJob } from "@/lib/app-store";
import { SOURCE_LABEL } from "@/lib/textures";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/downloads")({
  head: () => ({
    meta: [
      { title: "Downloads — Texture Scraper" },
      { name: "description", content: "Track active, queued, and completed texture downloads." },
    ],
  }),
  component: DownloadsPage,
});

function DownloadsPage() {
  const { jobs, pause, resume, cancel, remove, reorder, clearCompleted } = useAppStore();

  const active = jobs.filter((j) => j.status === "downloading" || j.status === "queued" || j.status === "paused");
  const finished = jobs.filter((j) => j.status === "completed" || j.status === "cancelled");

  const totalSpeed = jobs
    .filter((j) => j.status === "downloading")
    .reduce((sum, j) => sum + j.speedMbs, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-black sm:text-3xl">Download manager</h1>
          <p className="text-sm text-muted-foreground">
            {active.length} in progress · {finished.length} completed
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden rounded-lg border border-border/60 bg-secondary/40 px-3 py-2 text-right sm:block">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Speed</div>
            <div className="font-mono text-sm font-semibold text-primary">
              {totalSpeed.toFixed(1)} MB/s
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={clearCompleted} disabled={finished.length === 0}>
            <Trash2 className="mr-1.5 h-4 w-4" /> Clear finished
          </Button>
        </div>
      </header>

      <Section title="Active queue" empty={active.length === 0} emptyLabel="Nothing downloading. Add textures from Browse.">
        {active.map((job, i) => (
          <JobRow
            key={job.id}
            job={job}
            canMoveUp={i > 0}
            canMoveDown={i < active.length - 1}
            onPause={() => pause(job.id)}
            onResume={() => resume(job.id)}
            onCancel={() => cancel(job.id)}
            onRemove={() => remove(job.id)}
            onUp={() => reorder(job.id, "up")}
            onDown={() => reorder(job.id, "down")}
          />
        ))}
      </Section>

      {finished.length > 0 && (
        <Section title="Completed" empty={false}>
          {finished.map((job) => (
            <JobRow
              key={job.id}
              job={job}
              canMoveUp={false}
              canMoveDown={false}
              onPause={() => {}}
              onResume={() => {}}
              onCancel={() => {}}
              onRemove={() => remove(job.id)}
              onUp={() => {}}
              onDown={() => {}}
            />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  children,
  empty,
  emptyLabel,
}: {
  title: string;
  children?: React.ReactNode;
  empty: boolean;
  emptyLabel?: string;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </h2>
      {empty ? (
        <div className="grid place-items-center rounded-xl border border-dashed border-border/60 py-14 text-center text-sm text-muted-foreground">
          <div className="flex flex-col items-center gap-2">
            <Inbox className="h-6 w-6" />
            {emptyLabel}
          </div>
        </div>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </section>
  );
}

function JobRow({
  job,
  canMoveUp,
  canMoveDown,
  onPause,
  onResume,
  onCancel,
  onRemove,
  onUp,
  onDown,
}: {
  job: DownloadJob;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onRemove: () => void;
  onUp: () => void;
  onDown: () => void;
}) {
  const isDone = job.status === "completed";
  const isCancelled = job.status === "cancelled";
  const src = SOURCE_LABEL[job.texture.source];

  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border/60 bg-card p-3 sm:grid-cols-[64px_minmax(0,1fr)_auto]",
      )}
    >
      <img
        src={job.texture.thumbnail}
        alt=""
        className="hidden h-16 w-16 shrink-0 rounded-lg object-cover sm:block"
      />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-sm font-semibold text-foreground">{job.texture.name}</span>
          <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
            {src.short}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {job.resolution} · {job.format} · {job.sizeMb.toFixed(0)} MB
          </span>
          <StatusPill status={job.status} />
        </div>
        <div className="mt-2 flex items-center gap-3">
          <Progress value={job.progress} className="h-1.5" />
          <span className="w-14 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
            {job.progress.toFixed(0)}%
          </span>
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
          <span>
            {job.status === "downloading"
              ? `${job.speedMbs.toFixed(1)} MB/s`
              : job.status === "paused"
                ? "Paused"
                : isDone
                  ? "Saved to library"
                  : isCancelled
                    ? "Cancelled"
                    : "Waiting for slot"}
          </span>
          {job.status === "downloading" && (
            <span>
              ETA{" "}
              {job.speedMbs > 0
                ? `${Math.max(1, Math.round(((100 - job.progress) / 100) * (job.sizeMb / job.speedMbs)))}s`
                : "—"}
            </span>
          )}
        </div>
      </div>

      <div className="col-span-2 flex justify-end gap-1 sm:col-span-1">
        {!isDone && !isCancelled && (
          <>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onUp} disabled={!canMoveUp} aria-label="Move up">
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onDown} disabled={!canMoveDown} aria-label="Move down">
              <ArrowDown className="h-4 w-4" />
            </Button>
            {job.status === "paused" ? (
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onResume} aria-label="Resume">
                <Play className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={onPause}
                disabled={job.status !== "downloading"}
                aria-label="Pause"
              >
                <Pause className="h-4 w-4" />
              </Button>
            )}
            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onCancel} aria-label="Cancel">
              <X className="h-4 w-4" />
            </Button>
          </>
        )}
        {(isDone || isCancelled) && (
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onRemove} aria-label="Remove">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: DownloadJob["status"] }) {
  const map: Record<DownloadJob["status"], { label: string; cls: string; icon?: React.ReactNode }> = {
    downloading: { label: "Downloading", cls: "bg-primary/15 text-primary border-primary/30", icon: <Download className="h-3 w-3" /> },
    queued: { label: "Queued", cls: "bg-secondary text-muted-foreground border-border" },
    paused: { label: "Paused", cls: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
    completed: { label: "Done", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", icon: <CheckCircle2 className="h-3 w-3" /> },
    cancelled: { label: "Cancelled", cls: "bg-destructive/15 text-destructive border-destructive/30" },
  };
  const s = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold", s.cls)}>
      {s.icon}
      {s.label}
    </span>
  );
}