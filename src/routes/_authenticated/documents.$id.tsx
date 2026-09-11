import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Copy, FileWarning, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ApprovalTimeline } from "@/components/ApprovalTimeline";
import { ErrorState, GlassCard, LoadingState, StatusBadge } from "@/components/common";
import { supabase } from "@/integrations/supabase/client";
import { decideApproval, deleteDocument, STAGES } from "@/lib/documents.functions";
import { dateTime, money, shortDate, titleCase } from "@/lib/format";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/_authenticated/documents/$id")({
  head: () => ({
    meta: [
      { title: "Document detail — Nexora" },
      {
        name: "description",
        content: "Preview the original document alongside AI-extracted values, duplicate analysis and approvals.",
      },
      { property: "og:title", content: "Document detail — Nexora" },
      { property: "og:description", content: "Extracted values, duplicate analysis and approval history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DocumentDetailPage,
});

function DocumentDetailPage() {
  const { id } = useParams({ from: "/_authenticated/documents/$id" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, canApprove } = useAuth();
  const decide = useServerFn(decideApproval);
  const remove = useServerFn(deleteDocument);
  const [reason, setReason] = useState("");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["document", id],
    queryFn: async () => {
      const [doc, approvals, audit] = await Promise.all([
        supabase.from("documents").select("*").eq("id", id).maybeSingle(),
        supabase.from("document_approvals").select("*").eq("document_id", id).order("stage"),
        supabase.from("audit_logs").select("*").eq("document_id", id).order("created_at", { ascending: false }),
      ]);
      if (doc.error) throw new Error(doc.error.message);
      if (!doc.data) throw new Error("This document no longer exists.");

      const signed = await supabase.storage.from("documents").createSignedUrl(doc.data.file_path, 600);
      let duplicate = null;
      if (doc.data.duplicate_of) {
        const original = await supabase
          .from("documents")
          .select("id, file_name, vendor, invoice_number, total_amount, currency, doc_date")
          .eq("id", doc.data.duplicate_of)
          .maybeSingle();
        duplicate = original.data;
      }

      return {
        doc: doc.data,
        approvals: approvals.data ?? [],
        audit: audit.data ?? [],
        previewUrl: signed.data?.signedUrl ?? null,
        duplicate,
      };
    },
  });

  const decision = useMutation({
    mutationFn: (input: { stage: number; action: "approved" | "rejected" }) =>
      decide({ data: { documentId: id, stage: input.stage, action: input.action, reason: reason || undefined } }),
    onSuccess: (res) => {
      toast.success(res.status === "rejected" ? "Document rejected." : "Stage approved.");
      setReason("");
      queryClient.invalidateQueries();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deletion = useMutation({
    mutationFn: () => remove({ data: { documentId: id } }),
    onSuccess: () => {
      toast.success("Document deleted.");
      queryClient.invalidateQueries();
      navigate({ to: "/documents" });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <LoadingState label="Loading document…" />;
  if (isError || !data)
    return <ErrorState message={error instanceof Error ? error.message : undefined} retry={() => refetch()} />;

  const { doc, approvals, audit, previewUrl, duplicate } = data;
  const issues = Array.isArray(doc.validation_issues) ? (doc.validation_issues as string[]) : [];
  const stageLabel = STAGES[doc.current_stage - 1]?.label ?? "";
  const canActNow =
    canApprove &&
    (doc.status === "pending" || doc.status === "duplicate") &&
    (doc.current_stage < 3 || isAdmin);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link to="/documents" className="mb-2 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" />
            Back to documents
          </Link>
          <h1 className="truncate text-2xl font-semibold tracking-tight">{doc.file_name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={doc.status} />
          {isAdmin ? (
            <button
              onClick={() => deletion.mutate()}
              disabled={deletion.isPending}
              className="flex items-center gap-2 rounded-xl border border-destructive/40 px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <Trash2 className="size-4" />
              Delete
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard className="p-3">
          <div className="h-[28rem] overflow-hidden rounded-xl border border-border bg-surface">
            {previewUrl ? (
              doc.mime_type === "application/pdf" ? (
                <iframe src={previewUrl} title={`Preview of ${doc.file_name}`} className="size-full" />
              ) : (
                <img src={previewUrl} alt={`Scan of ${doc.file_name}`} className="size-full object-contain" />
              )
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Preview unavailable
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Document information
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            {[
              ["Document type", doc.doc_type === "credit_note" ? "Credit note" : doc.doc_type ? "Invoice" : "—"],
              ["Vendor", doc.vendor ?? "—"],
              ["Invoice number", doc.invoice_number ?? "—"],
              ["Document date", shortDate(doc.doc_date)],
              ["Subtotal", money(doc.subtotal, doc.currency)],
              ["VAT", money(doc.vat_amount, doc.currency)],
              ["Total", money(doc.total_amount, doc.currency)],
              ["Currency", doc.currency ?? "—"],
              [
                "AI confidence",
                doc.extraction_confidence !== null ? `${Number(doc.extraction_confidence).toFixed(0)}%` : "—",
              ],
              ["Captured", dateTime(doc.created_at)],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
                <dd className="mt-1 break-words text-sm font-medium">{value}</dd>
              </div>
            ))}
          </dl>

          {doc.extraction_error ? (
            <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {doc.extraction_error}
            </p>
          ) : null}

          <div className="mt-5">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <FileWarning className="size-4 text-warning" />
              Validation
            </h3>
            {issues.length === 0 ? (
              <p className="mt-2 text-sm text-success">All required fields present and totals reconcile.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {issues.map((issue) => (
                  <li key={issue}>• {issue}</li>
                ))}
              </ul>
            )}
          </div>
        </GlassCard>
      </div>

      <GlassCard className="mt-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Copy className="size-4" />
          Duplicate analysis
        </h2>
        {doc.duplicate_of ? (
          <div className="mt-3 rounded-xl border border-violet/40 bg-violet/10 p-4">
            <p className="text-sm font-medium text-violet">{doc.duplicate_reason}</p>
            {duplicate ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Matching document:{" "}
                <Link to="/documents/$id" params={{ id: duplicate.id }} className="text-primary hover:underline">
                  {duplicate.file_name}
                </Link>{" "}
                · {duplicate.vendor ?? "Unknown vendor"} · {duplicate.invoice_number ?? "no number"} ·{" "}
                {money(duplicate.total_amount, duplicate.currency)} · {shortDate(duplicate.doc_date)}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-muted-foreground">
              Nothing is deleted automatically — an approver decides whether this is a genuine duplicate.
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-success">
            No matching invoice number, file or vendor-and-amount combination was found.
          </p>
        )}
      </GlassCard>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Approval workflow
          </h2>
          <ApprovalTimeline approvals={approvals} currentStage={doc.current_stage} status={doc.status} />

          {canActNow ? (
            <div className="mt-5 rounded-xl border border-border bg-secondary/30 p-4">
              <p className="text-sm font-medium">
                Stage {doc.current_stage} — {stageLabel} decision
              </p>
              <label htmlFor="reason" className="mt-3 block text-xs uppercase tracking-wider text-muted-foreground">
                Reason (required to reject)
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="mt-1.5 w-full rounded-xl border border-input bg-surface/70 px-3 py-2 text-sm outline-none focus:border-primary/60"
                placeholder="Add context for the audit trail"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => decision.mutate({ stage: doc.current_stage, action: "approved" })}
                  disabled={decision.isPending}
                  className="bg-gradient-brand flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-background transition-transform hover:brightness-110 disabled:opacity-60"
                >
                  {decision.isPending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                  {doc.current_stage === 3 ? "Give final approval" : "Approve stage"}
                </button>
                <button
                  onClick={() => decision.mutate({ stage: doc.current_stage, action: "rejected" })}
                  disabled={decision.isPending}
                  className="rounded-xl border border-destructive/40 px-4 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-5 text-sm text-muted-foreground">
              {doc.status === "approved"
                ? "This document has completed all three approval stages."
                : doc.status === "rejected"
                  ? "This document was rejected and cannot progress."
                  : doc.status === "processing"
                    ? "Processing is still in progress."
                    : doc.current_stage === 3
                      ? "Final approval is reserved for finance/admin users."
                      : "You have read-only access to this workflow."}
            </p>
          )}
        </GlassCard>

        <GlassCard>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Audit history
          </h2>
          {audit.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          ) : (
            <ul className="space-y-3">
              {audit.map((entry) => (
                <li key={entry.id} className="rounded-xl border border-border bg-secondary/30 p-3">
                  <p className="text-sm font-medium">{titleCase(entry.action)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {dateTime(entry.created_at)}
                    {entry.stage ? ` · stage ${entry.stage}` : ""}
                    {entry.previous_status ? ` · ${entry.previous_status} → ${entry.new_status}` : ""}
                  </p>
                  {entry.details ? <p className="mt-1 text-xs text-muted-foreground">{entry.details}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      </div>
    </>
  );
}
