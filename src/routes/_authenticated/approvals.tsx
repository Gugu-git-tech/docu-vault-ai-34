import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, CheckSquare, Loader2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  EmptyState,
  ErrorState,
  GlassCard,
  LoadingState,
  PageHeader,
  StatusBadge,
} from "@/components/common";
import { supabase } from "@/integrations/supabase/client";
import { decideApproval, STAGES } from "@/lib/documents.functions";
import { money, shortDate } from "@/lib/format";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/_authenticated/approvals")({
  head: () => ({
    meta: [
      { title: "Approvals queue — Nexora" },
      {
        name: "description",
        content:
          "Work the three-stage approval queue: Reviewer, Manager and Finance sign-off for every captured invoice.",
      },
      { property: "og:title", content: "Approvals queue — Nexora" },
      {
        property: "og:description",
        content: "Reviewer, Manager and Finance sign-off for every captured invoice.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ApprovalsPage,
});

function ApprovalsPage() {
  const { isAdmin, canApprove } = useAuth();
  const queryClient = useQueryClient();
  const decide = useServerFn(decideApproval);
  const [stageFilter, setStageFilter] = useState<"all" | "1" | "2" | "3">("all");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["approvals", "pending"],
    queryFn: async () => {
      const { data: rows, error: err } = await supabase
        .from("documents")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (err) throw new Error(err.message);
      return rows;
    },
  });

  const mutation = useMutation({
    mutationFn: async (vars: {
      documentId: string;
      stage: number;
      action: "approved" | "rejected";
      reason?: string;
    }) => decide({ data: vars }),
    onSuccess: (_r, vars) => {
      toast.success(vars.action === "approved" ? "Stage approved." : "Document rejected.");
      void queryClient.invalidateQueries({ queryKey: ["approvals", "pending"] });
      void queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Action failed."),
    onSettled: () => setBusy(null),
  });

  if (isLoading) return <LoadingState label="Loading approval queue…" />;
  if (isError)
    return (
      <ErrorState
        message={error instanceof Error ? error.message : undefined}
        retry={() => refetch()}
      />
    );

  const rows = (data ?? []).filter(
    (d) => stageFilter === "all" || String(d.current_stage) === stageFilter,
  );

  const act = (
    documentId: string,
    stage: number,
    action: "approved" | "rejected",
  ) => {
    const reason = reasons[documentId]?.trim();
    if (action === "rejected" && !reason) {
      toast.error("A reason is required when rejecting a document.");
      return;
    }
    setBusy(`${documentId}-${action}`);
    mutation.mutate({ documentId, stage, action, ...(reason ? { reason } : {}) });
  };

  return (
    <>
      <PageHeader
        title="Approvals"
        description="Documents move through three sequential stages: Reviewer, then Manager, then Finance / Admin."
        actions={
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value as typeof stageFilter)}
            aria-label="Filter by stage"
            className="rounded-xl border border-input bg-surface/70 px-3 py-2 text-sm outline-none focus:border-primary/60"
          >
            <option value="all" className="bg-popover">
              All stages
            </option>
            {STAGES.map((s) => (
              <option key={s.stage} value={String(s.stage)} className="bg-popover">
                Stage {s.stage} — {s.label}
              </option>
            ))}
          </select>
        }
      />

      {!canApprove ? (
        <GlassCard className="mb-4 border-warning/40">
          <p className="text-sm text-muted-foreground">
            Your account has view-only access. You can follow progress here, but approving or
            rejecting requires an approver or administrator role.
          </p>
        </GlassCard>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          title="Nothing waiting for approval"
          description="Every processed document has already been decided."
          icon={CheckSquare}
          action={
            <Link
              to="/documents"
              className="rounded-xl border border-border px-4 py-2 text-sm hover:bg-secondary"
            >
              View all documents
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4">
          {rows.map((doc) => {
            const stage = doc.current_stage;
            const stageLabel = STAGES[stage - 1]?.label ?? "";
            const finalStageBlocked = stage === 3 && !isAdmin;
            const disabled = !canApprove || finalStageBlocked || mutation.isPending;

            return (
              <GlassCard key={doc.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      to="/documents/$id"
                      params={{ id: doc.id }}
                      className="block truncate font-medium text-primary hover:underline"
                    >
                      {doc.vendor ?? doc.file_name}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {doc.invoice_number ?? "No number"} · {shortDate(doc.doc_date)} ·{" "}
                      {doc.doc_type === "credit_note" ? "Credit note" : "Invoice"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={doc.status} />
                    <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs text-primary">
                      Stage {stage} — {stageLabel}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Subtotal
                    </p>
                    <p className="mt-1">{money(doc.subtotal, doc.currency)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">VAT</p>
                    <p className="mt-1">{money(doc.vat_amount, doc.currency)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Total</p>
                    <p className="mt-1 font-semibold">{money(doc.total_amount, doc.currency)}</p>
                  </div>
                </div>

                {Array.isArray(doc.validation_issues) && doc.validation_issues.length > 0 ? (
                  <ul className="mt-3 space-y-1 rounded-xl border border-warning/40 bg-warning/5 p-3 text-xs text-warning">
                    {(doc.validation_issues as string[]).map((issue, i) => (
                      <li key={i}>{String(issue)}</li>
                    ))}
                  </ul>
                ) : null}

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={reasons[doc.id] ?? ""}
                    onChange={(e) =>
                      setReasons((prev) => ({ ...prev, [doc.id]: e.target.value }))
                    }
                    placeholder="Comment (required to reject)"
                    aria-label={`Decision comment for ${doc.file_name}`}
                    className="min-w-0 flex-1 rounded-xl border border-input bg-surface/70 px-3 py-2 text-sm outline-none focus:border-primary/60"
                  />
                  <button
                    disabled={disabled}
                    onClick={() => act(doc.id, stage, "approved")}
                    className="flex items-center justify-center gap-2 rounded-xl border border-success/40 bg-success/10 px-4 py-2 text-sm text-success transition-colors hover:bg-success/20 disabled:opacity-40"
                  >
                    {busy === `${doc.id}-approved` ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-4" />
                    )}
                    Approve
                  </button>
                  <button
                    disabled={disabled}
                    onClick={() => act(doc.id, stage, "rejected")}
                    className="flex items-center justify-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-40"
                  >
                    {busy === `${doc.id}-rejected` ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <XCircle className="size-4" />
                    )}
                    Reject
                  </button>
                </div>

                {finalStageBlocked ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Final sign-off is reserved for finance administrators.
                  </p>
                ) : null}
              </GlassCard>
            );
          })}
        </div>
      )}
    </>
  );
}
