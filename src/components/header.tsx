import { Link, useRouterState } from "@tanstack/react-router";
import { Blocks, Download, Settings as SettingsIcon } from "lucide-react";
import { useAppStore } from "@/lib/app-store";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Browse", icon: Blocks },
  { to: "/downloads", label: "Downloads", icon: Download },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

export function Header() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { jobs } = useAppStore();
  const active = jobs.filter((j) => j.status === "downloading" || j.status === "queued").length;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-6 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div
            className="grid h-9 w-9 place-items-center rounded-lg text-primary-foreground shadow-[var(--shadow-glow)]"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Blocks className="h-5 w-5" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold tracking-tight">Texture Scraper</span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              PBR library
            </span>
          </div>
        </Link>

        <nav className="ml-4 flex items-center gap-1">
          {NAV.map((item) => {
            const isActive =
              item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "relative flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
                {item.to === "/downloads" && active > 0 ? (
                  <span className="ml-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                    {active}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto hidden items-center gap-2 text-xs text-muted-foreground md:flex">
          <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)]" />
          <span>Scraper online</span>
        </div>
      </div>
    </header>
  );
}