import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpDown, FileText, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState, ErrorState, GlassCard, LoadingState, PageHeader, StatusBadge } from "@/components/common";
import { supabase } from "@/integrations/supabase/client";
import { STAGES } from "@/lib/documents.functions";
import { money, shortDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/documents/")({
  head: () => ({
    meta: [
      { title: "Documents — Nexora" },
      {
        name: "description",
        content: "Search, filter and sort every captured invoice and credit note with live approval status.",
      },
      { property: "og:title", content: "Documents — Nexora" },
      { property: "og:description", content: "All captured invoices and credit notes in one register." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DocumentsPage,
});

type SortKey = "doc_date" | "total_amount" | "vendor" | "created_at";

export function useDocuments() {
  return useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data;
    },
  });
}

function DocumentsPage() {
  const { data, isLoading, isError, error, refetch } = useDocuments();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [vendor, setVendor] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [sort, setSort] = useState<SortKey>("created_at");
  const [asc, setAsc] = useState(false);

  const rows = useMemo(() => {
    const list = (data ?? []).filter((d) => {
      if (status !== "all" && d.status !== status) return false;
      if (vendor && !(d.vendor ?? "").toLowerCase().includes(vendor.toLowerCase())) return false;
      if (from && (!d.doc_date || d.doc_date < from)) return false;
      if (to && (!d.doc_date || d.doc_date > to)) return false;
      if (minAmount && Number(d.total_amount ?? 0) < Number(minAmount)) return false;
      if (search) {
        const haystack = `${d.vendor ?? ""} ${d.invoice_number ?? ""} ${d.file_name}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      const av = a[sort] ?? "";
      const bv = b[sort] ?? "";
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return asc ? cmp : -cmp;
    });
  }, [data, status, vendor, from, to, minAmount, search, sort, asc]);

  if (isLoading) return <LoadingState label="Loading documents…" />;
  if (isError) return <ErrorState message={error instanceof Error ? error.message : undefined} retry={() => refetch()} />;

  return (
    <>
      <PageHeader
        title="Documents"
        description={`${rows.length} of ${data?.length ?? 0} documents match your filters.`}
      />

      <GlassCard className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <div className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vendor, number or file"
              aria-label="Search documents"
              className="w-full rounded-xl border border-input bg-surface/70 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary/60"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by status"
            className="rounded-xl border border-input bg-surface/70 px-3 py-2 text-sm outline-none focus:border-primary/60"
          >
            {["all", "processing", "pending", "approved", "rejected", "duplicate"].map((s) => (
              <option key={s} value={s} className="bg-popover">
                {s === "all" ? "All statuses" : s}
              </option>
            ))}
          </select>
          <input
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            placeholder="Vendor"
            aria-label="Filter by vendor"
            className="rounded-xl border border-input bg-surface/70 px-3 py-2 text-sm outline-none focus:border-primary/60"
          />
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            aria-label="From date"
            className="rounded-xl border border-input bg-surface/70 px-3 py-2 text-sm outline-none focus:border-primary/60"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            aria-label="To date"
            className="rounded-xl border border-input bg-surface/70 px-3 py-2 text-sm outline-none focus:border-primary/60"
          />
          <input
            type="number"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            placeholder="Min amount"
            aria-label="Minimum amount"
            className="rounded-xl border border-input bg-surface/70 px-3 py-2 text-sm outline-none focus:border-primary/60"
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort by"
            className="rounded-xl border border-input bg-surface/70 px-3 py-2 text-sm outline-none focus:border-primary/60"
          >
            <option value="created_at" className="bg-popover">Newest captured</option>
            <option value="doc_date" className="bg-popover">Document date</option>
            <option value="total_amount" className="bg-popover">Total amount</option>
            <option value="vendor" className="bg-popover">Vendor</option>
          </select>
          <button
            onClick={() => setAsc((v) => !v)}
            className="flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-sm transition-colors hover:bg-secondary"
          >
            <ArrowUpDown className="size-4" />
            {asc ? "Ascending" : "Descending"}
          </button>
        </div>
      </GlassCard>

      {rows.length === 0 ? (
        <EmptyState
          title="No documents match"
          description="Adjust your filters, or upload an invoice or credit note to get started."
          icon={FileText}
          action={
            <Link to="/upload" className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-secondary">
              Upload a document
            </Link>
          }
        />
      ) : (
        <GlassCard className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-200 text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  {["Document", "Type", "Vendor", "Number", "Date", "Amount", "VAT", "Status", "Stage"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((doc) => (
                  <tr key={doc.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-secondary/40">
                    <td className="max-w-56 px-4 py-3">
                      <Link
                        to="/documents/$id"
                        params={{ id: doc.id }}
                        className="block truncate font-medium text-primary hover:underline"
                      >
                        {doc.file_name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {doc.doc_type === "credit_note" ? "Credit note" : doc.doc_type ? "Invoice" : "—"}
                    </td>
                    <td className="max-w-40 truncate px-4 py-3">{doc.vendor ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{doc.invoice_number ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{shortDate(doc.doc_date)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{money(doc.total_amount, doc.currency)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {money(doc.vat_amount, doc.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {doc.status === "approved"
                        ? "Complete"
                        : doc.status === "rejected"
                          ? "Stopped"
                          : `${doc.current_stage} — ${STAGES[doc.current_stage - 1]?.label ?? ""}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </>
  );
}
