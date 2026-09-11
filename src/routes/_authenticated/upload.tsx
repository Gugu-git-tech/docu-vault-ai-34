import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  CheckCircle2,
  CloudUpload,
  Copy,
  FileCheck2,
  Loader2,
  ScanLine,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { GlassCard, PageHeader, StatusBadge } from "@/components/common";
import { supabase } from "@/integrations/supabase/client";
import { processDocument } from "@/lib/documents.functions";
import { money, shortDate } from "@/lib/format";
import { useAuth } from "@/lib/use-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({
    meta: [
      { title: "Upload a document — Nexora" },
      {
        name: "description",
        content: "Upload an invoice or credit note for AI extraction, validation and duplicate checking.",
      },
      { property: "og:title", content: "Upload a document — Nexora" },
      { property: "og:description", content: "AI capture for invoices and credit notes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UploadPage,
});

const ACCEPTED = ["application/pdf", "image/png", "image/jpeg"];
const MAX_BYTES = 20 * 1024 * 1024;

const STEPS = [
  { key: "upload", label: "Upload", icon: UploadCloud },
  { key: "store", label: "Secure storage", icon: ShieldCheck },
  { key: "extract", label: "AI extraction", icon: ScanLine },
  { key: "validate", label: "Validation", icon: FileCheck2 },
  { key: "duplicate", label: "Duplicate check", icon: Copy },
  { key: "approval", label: "Ready for approval", icon: CheckCircle2 },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

type Result = Awaited<ReturnType<typeof processDocument>>;

function UploadPage() {
  const { auth, canUpload } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const run = useServerFn(processDocument);
  const inputRef = useRef<HTMLInputElement>(null);

  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<StepKey | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  if (!canUpload) {
    return (
      <>
        <PageHeader title="Upload a document" />
        <GlassCard>
          <p className="font-medium">Uploads are restricted</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your account has read-only access. Ask an administrator for approver or admin access to upload
            invoices and credit notes.
          </p>
        </GlassCard>
      </>
    );
  }

  const validateFile = (candidate: File) => {
    if (!ACCEPTED.includes(candidate.type)) return "Only PDF, PNG and JPG documents are accepted.";
    if (candidate.size > MAX_BYTES) return "The file is larger than the 20 MB limit.";
    if (candidate.size === 0) return "The file appears to be empty.";
    return null;
  };

  const pick = (candidate: File | undefined) => {
    if (!candidate) return;
    const message = validateFile(candidate);
    setError(message);
    setResult(null);
    setStep(null);
    setFile(message ? null : candidate);
  };

  const start = async () => {
    if (!file || !auth) return;
    setError(null);
    setResult(null);

    try {
      setStep("upload");
      setProgress(15);
      const extension = file.name.split(".").pop() ?? "bin";
      const path = `${auth.userId}/${crypto.randomUUID()}.${extension}`;

      const upload = await supabase.storage.from("documents").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (upload.error) throw new Error(upload.error.message);

      setStep("store");
      setProgress(35);
      const insert = await supabase
        .from("documents")
        .insert({
          uploaded_by: auth.userId,
          file_path: path,
          file_name: file.name,
          mime_type: file.type,
          file_size: file.size,
        })
        .select("id")
        .single();
      if (insert.error) throw new Error(insert.error.message);

      setStep("extract");
      setProgress(55);
      const processed = await run({ data: { documentId: insert.data.id } });

      setStep("validate");
      setProgress(80);
      setStep("duplicate");
      setProgress(92);
      setStep("approval");
      setProgress(100);
      setResult(processed);
      await queryClient.invalidateQueries();
      toast.success(
        processed.status === "duplicate"
          ? "Processed — a possible duplicate was detected."
          : "Document processed and queued for review.",
      );
    } catch (err) {
      setStep(null);
      setProgress(0);
      const message = err instanceof Error ? err.message : "The document could not be processed.";
      setError(message);
      toast.error(message);
    }
  };

  const stepIndex = step ? STEPS.findIndex((s) => s.key === step) : -1;
  const busy = step !== null && !result;

  return (
    <>
      <PageHeader
        title="Upload a document"
        description="Invoices and credit notes only. Files are stored privately and processed by AI immediately."
      />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <GlassCard glow={dragging}>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              pick(e.dataTransfer.files?.[0]);
            }}
            className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition-colors",
              dragging ? "border-primary/70 bg-primary/5" : "border-border",
            )}
          >
            <span className="rounded-2xl border border-border bg-secondary/60 p-4 text-primary">
              <CloudUpload className="size-7" />
            </span>
            <p className="font-medium">Drag and drop your document here</p>
            <p className="text-sm text-muted-foreground">PDF, PNG or JPG · up to 20 MB</p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-2 rounded-xl border border-border px-4 py-2 text-sm transition-colors hover:bg-secondary"
            >
              Browse files
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="sr-only"
              aria-label="Choose a document to upload"
              onChange={(e) => pick(e.target.files?.[0])}
            />
          </div>

          {file ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB · {file.type}
                </p>
              </div>
              <button
                onClick={start}
                disabled={busy}
                className="bg-gradient-brand flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-background transition-transform hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
                {busy ? "Processing…" : "Upload & process"}
              </button>
            </div>
          ) : null}

          {error ? (
            <p
              className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
              role="alert"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          ) : null}

          {step ? (
            <div className="mt-4">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="bg-gradient-brand h-full rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : null}
        </GlassCard>

        <GlassCard>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Processing pipeline
          </h2>
          <ol className="mt-4 space-y-3">
            {STEPS.map((s, index) => {
              const state = stepIndex < 0 ? "idle" : index < stepIndex ? "done" : index === stepIndex ? "active" : "idle";
              return (
                <li key={s.key} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex size-8 items-center justify-center rounded-xl border",
                      state === "done" && "border-success/40 bg-success/10 text-success",
                      state === "active" && "border-primary/50 bg-primary/10 text-primary glow-ring",
                      state === "idle" && "border-border bg-secondary/50 text-muted-foreground",
                    )}
                  >
                    <s.icon className="size-4" />
                  </span>
                  <span className={cn("text-sm", state === "idle" && "text-muted-foreground")}>{s.label}</span>
                </li>
              );
            })}
          </ol>
        </GlassCard>
      </div>

      {result ? (
        <GlassCard className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Processing result</h2>
            <StatusBadge status={result.status} />
          </div>

          {result.duplicate_reason ? (
            <p className="mt-3 flex items-start gap-2 rounded-xl border border-violet/40 bg-violet/10 p-3 text-sm text-violet">
              <Copy className="mt-0.5 size-4 shrink-0" />
              Duplicate warning: {result.duplicate_reason}
            </p>
          ) : null}

          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Document type", result.doc_type === "credit_note" ? "Credit note" : result.doc_type ? "Invoice" : "—"],
              ["Vendor", result.vendor ?? "—"],
              ["Number", result.invoice_number ?? "—"],
              ["Date", shortDate(result.doc_date)],
              ["Subtotal", money(result.subtotal, result.currency)],
              ["VAT", money(result.vat_amount, result.currency)],
              ["Total", money(result.total_amount, result.currency)],
              [
                "Confidence",
                result.extraction_confidence !== null ? `${Number(result.extraction_confidence).toFixed(0)}%` : "—",
              ],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
                <dd className="mt-1 truncate text-sm font-medium">{value}</dd>
              </div>
            ))}
          </dl>

          {Array.isArray(result.validation_issues) && result.validation_issues.length > 0 ? (
            <div className="mt-4 rounded-xl border border-warning/30 bg-warning/5 p-3">
              <p className="text-sm font-medium text-warning">Validation findings</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {(result.validation_issues as string[]).map((issue) => (
                  <li key={issue}>• {issue}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-4 text-sm text-success">All key fields extracted and validated.</p>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => navigate({ to: "/documents/$id", params: { id: result.id } })}
              className="bg-gradient-brand rounded-xl px-4 py-2 text-sm font-semibold text-background transition-transform hover:brightness-110"
            >
              Open document
            </button>
            <button
              onClick={() => {
                setFile(null);
                setResult(null);
                setStep(null);
                setProgress(0);
              }}
              className="rounded-xl border border-border px-4 py-2 text-sm transition-colors hover:bg-secondary"
            >
              Upload another
            </button>
          </div>
        </GlassCard>
      ) : null}
    </>
  );
}
