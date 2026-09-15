import { AlertTriangle, Inbox, Loader2, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function GlassCard({
  className,
  children,
  glow = false,
}: {
  className?: string;
  children: ReactNode;
  glow?: boolean;
}) {
  return (
    <div
      className={cn(
        "glass rounded-2xl p-5 transition-all duration-300",
        glow && "glow-ring",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: LucideIcon;
  tone?: "primary" | "cyan" | "violet" | "success" | "destructive" | "warning";
}) {
  const tones: Record<string, string> = {
    primary: "text-primary",
    cyan: "text-cyan",
    violet: "text-violet",
    success: "text-success",
    destructive: "text-destructive",
    warning: "text-warning",
  };
  return (
    <GlassCard className="group relative overflow-hidden hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 truncate text-2xl font-semibold tracking-tight">{value}</p>
          {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <span
          className={cn(
            "rounded-xl border border-border bg-secondary/60 p-2.5 transition-colors",
            tones[tone],
          )}
          aria-hidden="true"
        >
          <Icon className="size-5" />
        </span>
      </div>
    </GlassCard>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  processing: "border-primary/40 bg-primary/10 text-primary",
  pending: "border-warning/40 bg-warning/10 text-warning",
  approved: "border-success/40 bg-success/10 text-success",
  rejected: "border-destructive/40 bg-destructive/10 text-destructive",
  duplicate: "border-violet/40 bg-violet/10 text-violet",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium capitalize",
        STATUS_STYLES[status] ?? "border-border bg-secondary text-muted-foreground",
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {status}
    </span>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      className="flex min-h-40 flex-col items-center justify-center gap-3 text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-6 animate-spin text-primary" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border p-8 text-center">
      <span className="rounded-2xl border border-border bg-secondary/60 p-3 text-primary">
        <Icon className="size-6" />
      </span>
      <div>
        <p className="font-medium">{title}</p>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({
  message,
  retry,
}: {
  message?: string | undefined;
  retry?: (() => void) | undefined;
}) {
  return (
    <div
      className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center"
      role="alert"
    >
      <AlertTriangle className="size-6 text-destructive" />
      <p className="text-sm text-muted-foreground">
        {message ?? "Something went wrong while loading this section."}
      </p>
      {retry ? (
        <button
          onClick={retry}
          className="rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:bg-secondary"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}

export function ChartContainer({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <GlassCard className={cn("flex flex-col", className)}>
      <div className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="h-64 w-full">{children}</div>
    </GlassCard>
  );
}
