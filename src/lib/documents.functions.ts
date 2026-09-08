import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const STAGES = [
  { stage: 1, label: "Reviewer" },
  { stage: 2, label: "Manager" },
  { stage: 3, label: "Finance / Admin" },
] as const;

const EXTRACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "doc_type",
    "vendor",
    "invoice_number",
    "doc_date",
    "subtotal",
    "vat_amount",
    "total_amount",
    "currency",
    "confidence",
    "notes",
  ],
  properties: {
    doc_type: { type: ["string", "null"], enum: ["invoice", "credit_note", null] },
    vendor: { type: ["string", "null"] },
    invoice_number: { type: ["string", "null"] },
    doc_date: { type: ["string", "null"], description: "ISO date YYYY-MM-DD" },
    subtotal: { type: ["number", "null"] },
    vat_amount: { type: ["number", "null"] },
    total_amount: { type: ["number", "null"] },
    currency: { type: ["string", "null"], description: "ISO 4217 code" },
    confidence: { type: ["number", "null"], description: "0-100 overall confidence" },
    notes: { type: ["string", "null"] },
  },
} as const;

type Extraction = {
  doc_type: "invoice" | "credit_note" | null;
  vendor: string | null;
  invoice_number: string | null;
  doc_date: string | null;
  subtotal: number | null;
  vat_amount: number | null;
  total_amount: number | null;
  currency: string | null;
  confidence: number | null;
  notes: string | null;
};

function validate(x: Extraction): string[] {
  const issues: string[] = [];
  if (!x.doc_type) issues.push("Document type could not be determined (invoice or credit note).");
  if (!x.vendor) issues.push("Vendor name is missing.");
  if (!x.invoice_number) issues.push("Invoice / credit note number is missing.");
  if (!x.doc_date) issues.push("Document date is missing.");
  if (x.total_amount === null) issues.push("Total amount is missing.");
  if (x.vat_amount === null) issues.push("VAT / tax amount is missing.");
  if (!x.currency) issues.push("Currency is missing.");
  if (x.subtotal !== null && x.vat_amount !== null && x.total_amount !== null) {
    const expected = x.subtotal + x.vat_amount;
    if (Math.abs(expected - x.total_amount) > 0.05) {
      issues.push(
        `Totals do not add up: subtotal + VAT = ${expected.toFixed(2)} but total is ${x.total_amount.toFixed(2)}.`,
      );
    }
  }
  if (x.total_amount !== null && Math.abs(x.total_amount) > 1_000_000) {
    issues.push("Unusually large total amount — please verify.");
  }
  if (x.confidence !== null && x.confidence < 60) {
    issues.push("Low extraction confidence — manual review recommended.");
  }
  return issues;
}

async function sha256(bytes: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function toBase64(bytes: ArrayBuffer) {
  const view = new Uint8Array(bytes);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < view.length; i += chunk) {
    binary += String.fromCharCode(...view.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Runs AI extraction, validation and duplicate detection for an uploaded document. */
export const processDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ documentId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { aiJson, AiGatewayError } = await import("./ai-gateway.server");

    const { data: doc, error: docError } = await context.supabase
      .from("documents")
      .select("*")
      .eq("id", data.documentId)
      .maybeSingle();
    if (docError || !doc) throw new Error("Document not found.");
    if (doc.uploaded_by !== context.userId) {
      const { data: isAdmin } = await context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: "admin",
      });
      if (!isAdmin) throw new Error("You are not allowed to process this document.");
    }

    const file = await supabaseAdmin.storage.from("documents").download(doc.file_path);
    if (file.error || !file.data) throw new Error("Stored file could not be read.");
    const bytes = await file.data.arrayBuffer();
    const hash = await sha256(bytes);
    const base64 = toBase64(bytes);
    const dataUrl = `data:${doc.mime_type};base64,${base64}`;

    let extraction: Extraction | null = null;
    let extractionError: string | null = null;
    try {
      extraction = await aiJson<Extraction>({
        system:
          "You extract structured financial data from supplier invoices and credit notes. " +
          "Return only values you can actually read in the document; use null for anything absent. " +
          "A credit note is a refund/return document (often shows 'credit note' or negative amounts). " +
          "Amounts must be plain numbers without currency symbols or thousand separators.",
        content: [
          {
            type: "text",
            text: "Extract the financial details from this document. Use null where a value is not present.",
          },
          doc.mime_type === "application/pdf"
            ? { type: "file", file: { filename: doc.file_name, file_data: dataUrl } }
            : { type: "image_url", image_url: { url: dataUrl } },
        ],
        schemaName: "document_extraction",
        schema: EXTRACTION_SCHEMA,
      });
    } catch (err) {
      extractionError =
        err instanceof AiGatewayError ? err.message : "AI extraction could not be completed.";
    }

    const issues = extraction ? validate(extraction) : ["AI extraction failed — enter details manually."];

    // ---- Duplicate detection -------------------------------------------------
    let duplicateOf: string | null = null;
    let duplicateReason: string | null = null;

    const { data: sameHash } = await supabaseAdmin
      .from("documents")
      .select("id, file_name")
      .eq("file_hash", hash)
      .neq("id", doc.id)
      .limit(1);
    if (sameHash && sameHash.length > 0) {
      duplicateOf = sameHash[0]!.id;
      duplicateReason = `Identical file already uploaded (${sameHash[0]!.file_name}).`;
    }

    if (!duplicateOf && extraction?.invoice_number) {
      const { data: sameNumber } = await supabaseAdmin
        .from("documents")
        .select("id, invoice_number, vendor")
        .neq("id", doc.id)
        .ilike("invoice_number", extraction.invoice_number)
        .limit(1);
      if (sameNumber && sameNumber.length > 0) {
        duplicateOf = sameNumber[0]!.id;
        duplicateReason = `Invoice number ${sameNumber[0]!.invoice_number} already exists for ${sameNumber[0]!.vendor ?? "another vendor"}.`;
      }
    }

    if (!duplicateOf && extraction?.vendor && extraction.total_amount !== null) {
      const { data: sameVendor } = await supabaseAdmin
        .from("documents")
        .select("id, vendor, total_amount")
        .neq("id", doc.id)
        .ilike("vendor", extraction.vendor)
        .eq("total_amount", extraction.total_amount)
        .limit(1);
      if (sameVendor && sameVendor.length > 0) {
        duplicateOf = sameVendor[0]!.id;
        duplicateReason = `Same vendor and amount as an existing document (${sameVendor[0]!.vendor}, ${sameVendor[0]!.total_amount}).`;
      }
    }

    const status = duplicateOf ? "duplicate" : "pending";

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("documents")
      .update({
        file_hash: hash,
        doc_type: extraction?.doc_type ?? null,
        vendor: extraction?.vendor ?? null,
        invoice_number: extraction?.invoice_number ?? null,
        doc_date: extraction?.doc_date ?? null,
        subtotal: extraction?.subtotal ?? null,
        vat_amount: extraction?.vat_amount ?? null,
        total_amount: extraction?.total_amount ?? null,
        currency: extraction?.currency ?? null,
        extraction_confidence: extraction?.confidence ?? null,
        validation_issues: issues,
        raw_extraction: extraction as never,
        extraction_error: extractionError,
        status,
        current_stage: 1,
        duplicate_of: duplicateOf,
        duplicate_reason: duplicateReason,
      })
      .eq("id", doc.id)
      .select("*")
      .single();
    if (updateError) throw new Error("Could not save the extracted details.");

    await supabaseAdmin.from("audit_logs").insert({
      document_id: doc.id,
      user_id: context.userId,
      action: extractionError ? "ai_extraction_failed" : "ai_extraction_completed",
      previous_status: "processing",
      new_status: status,
      details: duplicateReason ?? extractionError ?? `${issues.length} validation issue(s).`,
    });

    return updated;
  });

/** Records an approve/reject decision for exactly one of the three sequential stages. */
export const decideApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        documentId: z.string().uuid(),
        stage: z.number().int().min(1).max(3),
        action: z.enum(["approved", "rejected"]),
        reason: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const roleList = (roles ?? []).map((r) => r.role);
    const isAdmin = roleList.includes("admin");
    const isApprover = roleList.includes("approver");
    if (!isAdmin && !isApprover) throw new Error("You do not have permission to approve documents.");
    if (data.stage === 3 && !isAdmin) {
      throw new Error("Only finance/admin users can give final approval.");
    }

    const { data: doc } = await context.supabase
      .from("documents")
      .select("*")
      .eq("id", data.documentId)
      .maybeSingle();
    if (!doc) throw new Error("Document not found.");
    if (doc.status === "processing") throw new Error("Document is still being processed.");
    if (doc.status === "approved" || doc.status === "rejected") {
      throw new Error("This document's workflow is already complete.");
    }
    if (data.stage !== doc.current_stage) {
      throw new Error(
        `Stage ${data.stage} cannot act yet — the document is at stage ${doc.current_stage}.`,
      );
    }
    if (data.action === "rejected" && !data.reason?.trim()) {
      throw new Error("A reason is required when rejecting a document.");
    }

    const { error: approvalError } = await supabaseAdmin.from("document_approvals").insert({
      document_id: doc.id,
      stage: data.stage,
      action: data.action,
      actor_id: context.userId,
      actor_role: isAdmin ? "admin" : "approver",
      reason: data.reason ?? null,
    });
    if (approvalError) throw new Error("This stage has already been decided.");

    const nextStage = data.action === "approved" ? Math.min(doc.current_stage + 1, 3) : doc.current_stage;
    const newStatus =
      data.action === "rejected" ? "rejected" : data.stage === 3 ? "approved" : "pending";

    await supabaseAdmin
      .from("documents")
      .update({ status: newStatus, current_stage: nextStage })
      .eq("id", doc.id);

    await supabaseAdmin.from("audit_logs").insert({
      document_id: doc.id,
      user_id: context.userId,
      action: data.action === "approved" ? "stage_approved" : "stage_rejected",
      stage: data.stage,
      previous_status: doc.status,
      new_status: newStatus,
      details: data.reason ?? null,
    });

    return { status: newStatus, current_stage: nextStage };
  });

/** Admin-only removal of a document, its stored file and related records. */
export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ documentId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Only administrators can delete documents.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: doc } = await supabaseAdmin
      .from("documents")
      .select("file_path, file_name")
      .eq("id", data.documentId)
      .maybeSingle();
    if (!doc) throw new Error("Document not found.");

    await supabaseAdmin.storage.from("documents").remove([doc.file_path]);
    await supabaseAdmin.from("documents").delete().eq("id", data.documentId);
    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      action: "document_deleted",
      details: doc.file_name,
    });
    return { ok: true };
  });
