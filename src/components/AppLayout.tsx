import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  BrainCircuit,
  CheckSquare,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  ScrollText,
  Settings,
  ShieldCheck,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/upload", label: "Upload Document", icon: Upload, requires: "upload" },
  { to: "/approvals", label: "Approvals", icon: CheckSquare },
  { to: "/reports", label: "Reports", icon: ScrollText },
  { to: "/insights", label: "AI Insights", icon: BrainCircuit },
  { to: "/audit", label: "Audit Log", icon: ShieldCheck },
  { to: "/users", label: "Users", icon: Users, requires: "admin" },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const { auth, role, isAdmin, canUpload } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const items = NAV.filter((item) => {
    if (!("requires" in item)) return true;
    if (item.requires === "admin") return isAdmin;
    if (item.requires === "upload") return canUpload;
    return true;
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  };

  const sidebar = (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link to="/dashboard" className="flex items-center gap-3 px-2 py-1">
        <span className="bg-gradient-brand flex size-9 items-center justify-center rounded-xl text-background">
          <BrainCircuit className="size-5" />
        </span>
        <span>
          <span className="block text-sm font-semibold tracking-[0.18em]">NEXORA</span>
          <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">
            AI Finance Control
          </span>
        </span>
      </Link>

      <nav className="flex-1 space-y-1" aria-label="Main navigation">
        {items.map((item) => {
          const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                active
                  ? "nav-active font-medium text-foreground"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              )}
            >
              <item.icon className={cn("size-4.5 shrink-0", active && "text-primary")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="glass rounded-xl p-3">
        <p className="truncate text-sm font-medium">{auth?.fullName ?? auth?.email ?? "—"}</p>
        <p className="mt-0.5 text-xs capitalize text-primary">{role}</p>
      </div>
    </div>
  );

  return (
    <div className="relative z-10 flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar/80 backdrop-blur-xl lg:block">
        <div className="sticky top-0 h-screen">{sidebar}</div>
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 border-r border-sidebar-border bg-sidebar">
            <button
              className="absolute right-3 top-4 rounded-lg p-2 text-muted-foreground hover:bg-secondary"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
            >
              <X className="size-4" />
            </button>
            {sidebar}
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background/70 px-4 py-3 backdrop-blur-xl sm:px-6">
          <button
            className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-secondary lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="size-4" />
          </button>

          <p className="hidden text-sm text-muted-foreground sm:block">
            Financial Document Intelligence
          </p>

          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/approvals"
              className="rounded-lg border border-border p-2 text-muted-foreground transition-colors hover:bg-secondary"
              aria-label="Pending approvals"
            >
              <Bell className="size-4" />
            </Link>
            <div className="hidden text-right sm:block">
              <p className="max-w-40 truncate text-sm">{auth?.email ?? "—"}</p>
              <p className="text-xs capitalize text-primary">{role}</p>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
