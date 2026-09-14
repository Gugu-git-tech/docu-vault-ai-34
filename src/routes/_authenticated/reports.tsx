import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Banknote, FileSpreadsheet, FileText, Receipt, Wallet } from "lucide-react";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import {
  ChartContainer,
  ErrorState,
  GlassCard,
  LoadingState,
  PageHeader,
  StatCard,
} from "@/components/common";
import { exportReportExcel, exportReportPdf } from "@/lib/export";
import { compactMoney, money, shortDate, titleCase } from "@/lib/format";
import { getReport, type ReportFilters } from "@/lib/reports.functions";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Financial reports — Nexora" },
      {
        name: "description",
        content:
          "Filter captured spend by date, vendor, status and amount, then export board-ready PDF and Excel reports.",
      },
      { property: "og:title", content: "Financial reports — Nexora" },
      {
        property: "og:description",
        content: "Spend, VAT and vendor analysis with PDF and Excel export.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

const PIE_COLORS = ["#38bdf8", "#22c55e", "#f59e0b", "#ef4444", "#a855f7"];

function ReportsPage() {
  const fetchReport = useServerFn(getReport);
  const [draft, setDraft] = useState<ReportFilters>({ status: "all" });
  const [filters, setFilters] = useState<ReportFilters>({ status: "all" });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["report", filters],
    queryFn: () => fetchReport({ data: filters }),
  });

  const subtitle = `${filters.from ?? "All time"} → ${filters.to ?? "today"}${
    filters.vendor ? ` · ${filters.vendor}` : ""
  } · ${filters.status ?? "all"} status`;

  const field =
    "rounded-xl border border-input bg-surface/70 px-3 py-2 text-sm outline-none focus:border-primary/60";

  return (
    <>
      <PageHeader
        title="Financial reports"
        description="Every figure below is calculated from the documents stored in your workspace."
        actions={
          <>
            <button
              disabled={!data || data.rows.length === 0}
              onClick={() => {
                if (!data) return;
                exportReportPdf(data, subtitle);
                toast.success("PDF report downloaded.");
              }}
              className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm transition-colors hover:bg-secondary disabled:opacity-40"
            >
              <FileText className="size-4" />
              Export PDF
            </button>
            <button
              disabled={!data || data.rows.length === 0}
              onClick={() => {
                if (!data) return;
                exportReportExcel(data);
                toast.success("Excel workbook downloaded.");
              }}
              className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm transition-colors hover:bg-secondary disabled:opacity-40"
            >
              <FileSpreadsheet className="size-4" />
              Export Excel
            </button>
          </>
        }
      />

      <GlassCard className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <input
            type="date"
            aria-label="From date"
            value={draft.from ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value || undefined }))}
            className={field}
          />
          <input
            type="date"
            aria-label="To date"
            value={draft.to ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value || undefined }))}
            className={field}
          />
          <input
            placeholder="Vendor"
            aria-label="Vendor"
            value={draft.vendor ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, vendor: e.target.value || undefined }))}
            className={field}
          />
          <select
            aria-label="Status"
            value={draft.status ?? "all"}
            onChange={(e) =>
              setDraft((d) => ({ ...d, status: e.target.value as ReportFilters["status"] }))
            }
            className={field}
          >
            {["all", "pending", "approved", "rejected", "duplicate"].map((s) => (
              <option key={s} value={s} className="bg-popover">
                {s === "all" ? "All statuses" : titleCase(s)}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Min amount"
            aria-label="Minimum amount"
            value={draft.minAmount ?? ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                minAmount: e.target.value === "" ? undefined : Number(e.target.value),
              }))
            }
            className={field}
          />
          <button
            onClick={() => setFilters(draft)}
            className="rounded-xl border border-primary/50 bg-primary/10 px-4 py-2 text-sm text-primary transition-colors hover:bg-primary/20"
          >
            Apply filters
          </button>
        </div>
      </GlassCard>

      {isLoading ? (
        <LoadingState label="Calculating report…" />
      ) : isError ? (
        <ErrorState
          message={error instanceof Error ? error.message : undefined}
          retry={() => refetch()}
        />
      ) : !data ? null : (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Documents"
              value={data.summary.documentCount}
              icon={Receipt}
              tone="primary"
            />
            <StatCard
              label="Total spend"
              value={money(data.summary.totalSpend)}
              icon={Wallet}
              tone="cyan"
            />
            <StatCard
              label="VAT captured"
              value={money(data.summary.totalVat)}
              icon={Banknote}
              tone="violet"
            />
            <StatCard
              label="Approved spend"
              value={money(data.summary.approvedSpend)}
              hint={`${money(data.summary.pendingSpend)} still pending`}
              icon={FileText}
              tone="success"
            />
          </div>

          <div className="mb-4 grid gap-4 xl:grid-cols-2">
            <ChartContainer title="Spend by month" description="Total value of captured documents">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.byMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickFormatter={(v: number) => compactMoney(v)}
                  />
                  <Tooltip
                    formatter={(v: number) => money(v)}
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid rgba(148,163,184,0.25)",
                      borderRadius: 12,
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="total" name="Total" stroke="#38bdf8" strokeWidth={2} />
                  <Line type="monotone" dataKey="vat" name="VAT" stroke="#a855f7" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>

            <ChartContainer title="Top vendors" description="Highest total captured spend">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byVendor.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                  <XAxis dataKey="vendor" stroke="#94a3b8" fontSize={10} interval={0} angle={-15} height={50} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickFormatter={(v: number) => compactMoney(v)}
                  />
                  <Tooltip
                    formatter={(v: number) => money(v)}
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid rgba(148,163,184,0.25)",
                      borderRadius: 12,
                    }}
                  />
                  <Bar dataKey="total" name="Total" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>

            <ChartContainer title="Status mix" description="Documents by workflow outcome">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.byStatus}
                    dataKey="count"
                    nameKey="status"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {data.byStatus.map((entry, i) => (
                      <Cell key={entry.status} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid rgba(148,163,184,0.25)",
                      borderRadius: 12,
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>

            <ChartContainer title="VAT by month" description="Recoverable tax captured per month">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.byMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickFormatter={(v: number) => compactMoney(v)}
                  />
                  <Tooltip
                    formatter={(v: number) => money(v)}
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid rgba(148,163,184,0.25)",
                      borderRadius: 12,
                    }}
                  />
                  <Bar dataKey="vat" name="VAT" fill="#a855f7" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          <GlassCard className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-200 text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    {["Vendor", "Number", "Date", "Subtotal", "VAT", "Total", "Status"].map((h) => (
                      <th key={h} className="whitespace-nowrap px-4 py-3 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                      <td className="max-w-48 truncate px-4 py-3">{r.vendor ?? "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                        {r.invoice_number ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {shortDate(r.doc_date)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">{money(r.subtotal, r.currency)}</td>
                      <td className="whitespace-nowrap px-4 py-3">{money(r.vat_amount, r.currency)}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium">
                        {money(r.total_amount, r.currency)}
                      </td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </>
      )}
    </>
  );
}
