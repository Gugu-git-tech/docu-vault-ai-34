import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  BrainCircuit,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  Percent,
  Wallet,
  XCircle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartContainer, ErrorState, GlassCard, LoadingState, PageHeader, StatCard } from "@/components/common";
import { compactMoney, money } from "@/lib/format";
import { getReport } from "@/lib/reports.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Nexora AI Document Control" },
      {
        name: "description",
        content: "Live spend, VAT, approval and duplicate metrics across all captured invoices and credit notes.",
      },
      { property: "og:title", content: "Dashboard — Nexora AI Document Control" },
      { property: "og:description", content: "Live spend, VAT and approval metrics for your finance team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

const tooltipStyle = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "0.75rem",
  color: "var(--popover-foreground)",
  fontSize: "0.8rem",
};

function DashboardPage() {
  const fetchReport = useServerFn(getReport);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["report", "dashboard"],
    queryFn: () => fetchReport({ data: {} }),
  });

  if (isLoading) return <LoadingState label="Loading your financial overview…" />;
  if (isError || !data)
    return <ErrorState message={error instanceof Error ? error.message : undefined} retry={() => refetch()} />;

  const countBy = (status: string) => data.byStatus.find((s) => s.status === status)?.count ?? 0;
  const volume = data.byMonth.map((m) => ({ month: m.month, count: m.count }));

  return (
    <>
      <PageHeader
        title="Executive dashboard"
        description="Every figure below is calculated live from your processed invoices and credit notes."
        actions={
          <Link
            to="/insights"
            className="bg-gradient-brand flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-background transition-transform hover:brightness-110 active:scale-[0.99]"
          >
            <BrainCircuit className="size-4" />
            AI insights
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total documents" value={data.summary.documentCount} icon={FileText} />
        <StatCard label="Pending approvals" value={countBy("pending")} icon={Clock} tone="warning" />
        <StatCard label="Approved" value={countBy("approved")} icon={CheckCircle2} tone="success" />
        <StatCard label="Rejected" value={countBy("rejected")} icon={XCircle} tone="destructive" />
        <StatCard label="Duplicate warnings" value={countBy("duplicate")} icon={Copy} tone="violet" />
        <StatCard label="Total spend" value={money(data.summary.totalSpend)} icon={Wallet} tone="cyan" />
        <StatCard label="Total VAT" value={money(data.summary.totalVat)} icon={Percent} tone="cyan" />
        <StatCard
          label="Approved spend"
          value={money(data.summary.approvedSpend)}
          hint={`${money(data.summary.pendingSpend)} still pending`}
          icon={CheckCircle2}
          tone="success"
        />
      </div>

      {data.summary.documentCount === 0 ? (
        <GlassCard className="mt-6 text-center">
          <p className="font-medium">No documents captured yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload your first invoice or credit note to populate these metrics.
          </p>
          <Link
            to="/upload"
            className="mt-4 inline-flex rounded-xl border border-border px-4 py-2 text-sm transition-colors hover:bg-secondary"
          >
            Upload a document
          </Link>
        </GlassCard>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <ChartContainer title="Spending trend" description="Total value by document month">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.byMonth}>
                <defs>
                  <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickFormatter={(v: number) => compactMoney(v)}
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => money(v)} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  fill="url(#spendFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>

          <ChartContainer title="Approval status" description="Documents by workflow state">
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
                  {data.byStatus.map((entry, index) => (
                    <Cell key={entry.status} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>

          <ChartContainer title="Top vendors" description="Highest total value">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byVendor.slice(0, 6)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickFormatter={(v: number) => compactMoney(v)}
                />
                <YAxis type="category" dataKey="vendor" width={110} stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => money(v)} />
                <Bar dataKey="total" fill="var(--chart-3)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>

          <ChartContainer title="Document volume" description="Documents captured per month">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volume}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      )}
    </>
  );
}
