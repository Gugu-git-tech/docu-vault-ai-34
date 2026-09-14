import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BrainCircuit, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

import { EmptyState, ErrorState, GlassCard, PageHeader } from "@/components/common";
import { getInsights, type Insight, type ReportFilters } from "@/lib/reports.functions";

export const Route = createFileRoute("/_authenticated/insights")({
  head: () => ({
    meta: [
      { title: "AI insights — Nexora" },
      {
        name: "description",
        content:
          "AI analysis of your real spending data: trends, vendor concentration, VAT anomalies and duplicate risk.",
      },
      { property: "og:title", content: "AI insights — Nexora" },
      {
        property: "og:description",
        content: "Trends, vendor concentration, VAT anomalies and duplicate risk from your own data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InsightsPage,
});

const SEVERITY: Record<Insight["severity"], string> = {
  info: "border-primary/40 bg-primary/5 text-primary",
  positive: "border-success/40 bg-success/5 text-success",
  warning: "border-warning/40 bg-warning/5 text-warning",
};

function InsightsPage() {
  const analyse = useServerFn(getInsights);
  const [range, setRange] = useState<ReportFilters>({});

  const mutation = useMutation({
    mutationFn: (filters: ReportFilters) => analyse({ data: filters }),
  });

  const result = mutation.data;
  const field =
    "rounded-xl border border-input bg-surface/70 px-3 py-2 text-sm outline-none focus:border-primary/60";

  return (
    <>
      <PageHeader
        title="AI insights"
        description="Analysis is generated from your stored documents only — no figures are invented."
        actions={
          <button
            onClick={() => mutation.mutate(range)}
            disabled={mutation.isPending}
            className="flex items-center gap-2 rounded-xl border border-primary/50 bg-primary/10 px-4 py-2 text-sm text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
          >
            {mutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {mutation.isPending ? "Analysing…" : "Generate insights"}
          </button>
        }
      />

      <GlassCard className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            type="date"
            aria-label="From date"
            value={range.from ?? ""}
            onChange={(e) => setRange((r) => ({ ...r, from: e.target.value || undefined }))}
            className={field}
          />
          <input
            type="date"
            aria-label="To date"
            value={range.to ?? ""}
            onChange={(e) => setRange((r) => ({ ...r, to: e.target.value || undefined }))}
            className={field}
          />
          <p className="self-center text-xs text-muted-foreground">
            Leave dates empty to analyse everything captured so far.
          </p>
        </div>
      </GlassCard>

      {mutation.isError ? (
        <ErrorState
          message={mutation.error instanceof Error ? mutation.error.message : undefined}
          retry={() => mutation.mutate(range)}
        />
      ) : !result ? (
        <EmptyState
          title="No analysis yet"
          description="Choose an optional date range and generate insights from your captured documents."
          icon={BrainCircuit}
        />
      ) : !result.sufficient_data ? (
        <EmptyState
          title="Not enough data yet"
          description={result.message}
          icon={BrainCircuit}
          action={
            <Link
              to="/upload"
              className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-secondary"
            >
              Upload a document
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {result.insights.map((insight, i) => (
            <GlassCard key={i} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs ${SEVERITY[insight.severity]}`}
                >
                  {insight.category}
                </span>
              </div>
              <h2 className="text-base font-semibold">{insight.title}</h2>
              <p className="text-sm text-muted-foreground">{insight.detail}</p>
            </GlassCard>
          ))}
        </div>
      )}
    </>
  );
}
