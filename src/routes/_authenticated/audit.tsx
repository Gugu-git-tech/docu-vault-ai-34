import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

import {
  EmptyState,
  ErrorState,
  GlassCard,
  LoadingState,
  PageHeader,
} from "@/components/common";
import { supabase } from "@/integrations/supabase/client";
import { dateTime, titleCase } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({
    meta: [
      { title: "Audit log — Nexora" },
      {
        name: "description",
        content:
          "A tamper-evident history of uploads, AI extractions, approvals, rejections and role changes.",
      },
      { property: "og:title", content: "Audit log — Nexora" },
      {
        property: "og:description",
        content: "Full history of uploads, extractions, approvals and role changes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const { data: logs, error: err } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (err) throw new Error(err.message);
      return logs;
    },
  });

  const actions = useMemo(
    () => [...new Set((data ?? []).map((l) => l.action))].sort(),
    [data],
  );

  const rows = useMemo(
    () =>
      (data ?? []).filter((l) => {
        if (action !== "all" && l.action !== action) return false;
        if (!search) return true;
        const hay = `${l.action} ${l.details ?? ""} ${l.new_status ?? ""}`.toLowerCase();
        return hay.includes(search.toLowerCase());
      }),
    [data, action, search],
  );

  if (isLoading) return <LoadingState label="Loading audit history…" />;
  if (isError)
    return (
      <ErrorState
        message={error instanceof Error ? error.message : undefined}
        retry={() => refetch()}
      />
    );

  return (
    <>
      <PageHeader
        title="Audit log"
        description={`${rows.length} recorded events. Every upload, AI extraction, approval decision and role change is written here.`}
      />

      <GlassCard className="mb-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events"
            aria-label="Search audit events"
            className="rounded-xl border border-input bg-surface/70 px-3 py-2 text-sm outline-none focus:border-primary/60 sm:col-span-2"
          />
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            aria-label="Filter by event type"
            className="rounded-xl border border-input bg-surface/70 px-3 py-2 text-sm outline-none focus:border-primary/60"
          >
            <option value="all" className="bg-popover">
              All event types
            </option>
            {actions.map((a) => (
              <option key={a} value={a} className="bg-popover">
                {titleCase(a)}
              </option>
            ))}
          </select>
        </div>
      </GlassCard>

      {rows.length === 0 ? (
        <EmptyState
          title="No audit events yet"
          description="Activity appears here as soon as documents are uploaded and processed."
          icon={ShieldCheck}
        />
      ) : (
        <GlassCard className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-180 text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  {["When", "Event", "Stage", "Status change", "Details", "Document"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-border/60 transition-colors last:border-0 hover:bg-secondary/40"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {dateTime(log.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium">
                      {titleCase(log.action)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{log.stage ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {log.previous_status || log.new_status
                        ? `${log.previous_status ?? "—"} → ${log.new_status ?? "—"}`
                        : "—"}
                    </td>
                    <td className="max-w-80 px-4 py-3 text-muted-foreground">
                      {log.details ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {log.document_id ? (
                        <Link
                          to="/documents/$id"
                          params={{ id: log.document_id }}
                          className="text-primary hover:underline"
                        >
                          Open
                        </Link>
                      ) : (
                        "—"
                      )}
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
