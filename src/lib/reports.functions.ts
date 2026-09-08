import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FiltersSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  vendor: z.string().optional(),
  status: z.enum(["all", "pending", "approved", "rejected", "duplicate"]).optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
});

export type ReportFilters = z.infer<typeof FiltersSchema>;

export type ReportRow = {
  id: string;
  doc_type: string | null;
  vendor: string | null;
  invoice_number: string | null;
  doc_date: string | null;
  subtotal: number | null;
  vat_amount: number | null;
  total_amount: number | null;
  currency: string | null;
  status: string;
  current_stage: number;
};

export type ReportResult = {
  rows: ReportRow[];
  summary: {
    documentCount: number;
    totalSpend: number;
    totalVat: number;
    approvedSpend: number;
    pendingSpend: number;
    rejectedSpend: number;
  };
  byVendor: { vendor: string; total: number; vat: number; count: number }[];
  byMonth: { month: string; total: number; vat: number; count: number }[];
  byStatus: { status: string; count: number; total: number }[];
};

function buildResult(rows: ReportRow[]): ReportResult {
  const num = (v: number | null) => Number(v ?? 0);
  const summary = {
    documentCount: rows.length,
    totalSpend: rows.reduce((s, r) => s + num(r.total_amount), 0),
    totalVat: rows.reduce((s, r) => s + num(r.vat_amount), 0),
    approvedSpend: rows.filter((r) => r.status === "approved").reduce((s, r) => s + num(r.total_amount), 0),
    pendingSpend: rows
      .filter((r) => r.status === "pending" || r.status === "processing")
      .reduce((s, r) => s + num(r.total_amount), 0),
    rejectedSpend: rows.filter((r) => r.status === "rejected").reduce((s, r) => s + num(r.total_amount), 0),
  };

  const vendorMap = new Map<string, { total: number; vat: number; count: number }>();
  const monthMap = new Map<string, { total: number; vat: number; count: number }>();
  const statusMap = new Map<string, { count: number; total: number }>();

  for (const r of rows) {
    const vendor = r.vendor?.trim() || "Unknown vendor";
    const v = vendorMap.get(vendor) ?? { total: 0, vat: 0, count: 0 };
    vendorMap.set(vendor, {
      total: v.total + num(r.total_amount),
      vat: v.vat + num(r.vat_amount),
      count: v.count + 1,
    });

    const month = r.doc_date ? r.doc_date.slice(0, 7) : "Undated";
    const m = monthMap.get(month) ?? { total: 0, vat: 0, count: 0 };
    monthMap.set(month, {
      total: m.total + num(r.total_amount),
      vat: m.vat + num(r.vat_amount),
      count: m.count + 1,
    });

    const s = statusMap.get(r.status) ?? { count: 0, total: 0 };
    statusMap.set(r.status, { count: s.count + 1, total: s.total + num(r.total_amount) });
  }

  return {
    rows,
    summary,
    byVendor: [...vendorMap.entries()]
      .map(([vendor, v]) => ({ vendor, ...v }))
      .sort((a, b) => b.total - a.total),
    byMonth: [...monthMap.entries()]
      .map(([month, v]) => ({ month, ...v }))
      .sort((a, b) => a.month.localeCompare(b.month)),
    byStatus: [...statusMap.entries()].map(([status, v]) => ({ status, ...v })),
  };
}

export const getReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FiltersSchema.parse(input ?? {}))
  .handler(async ({ data, context }): Promise<ReportResult> => {
    let query = context.supabase
      .from("documents")
      .select(
        "id, doc_type, vendor, invoice_number, doc_date, subtotal, vat_amount, total_amount, currency, status, current_stage",
      )
      .order("doc_date", { ascending: false, nullsFirst: false });

    if (data.from) query = query.gte("doc_date", data.from);
    if (data.to) query = query.lte("doc_date", data.to);
    if (data.vendor) query = query.ilike("vendor", `%${data.vendor}%`);
    if (data.status && data.status !== "all") query = query.eq("status", data.status);
    if (typeof data.minAmount === "number") query = query.gte("total_amount", data.minAmount);
    if (typeof data.maxAmount === "number") query = query.lte("total_amount", data.maxAmount);

    const { data: rows, error } = await query.limit(2000);
    if (error) throw new Error("Report data could not be loaded.");
    return buildResult((rows ?? []) as ReportRow[]);
  });

export type Insight = {
  title: string;
  category: string;
  severity: "info" | "positive" | "warning";
  detail: string;
};

const INSIGHTS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["sufficient_data", "message", "insights"],
  properties: {
    sufficient_data: { type: "boolean" },
    message: { type: "string" },
    insights: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "category", "severity", "detail"],
        properties: {
          title: { type: "string" },
          category: {
            type: "string",
            enum: ["Spending trend", "Vendor", "Anomaly", "VAT", "Duplicates", "Recommendation"],
          },
          severity: { type: "string", enum: ["info", "positive", "warning"] },
          detail: { type: "string" },
        },
      },
    },
  },
} as const;

export const getInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FiltersSchema.parse(input ?? {}))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ sufficient_data: boolean; message: string; insights: Insight[] }> => {
      let query = context.supabase
        .from("documents")
        .select(
          "id, doc_type, vendor, invoice_number, doc_date, subtotal, vat_amount, total_amount, currency, status, current_stage",
        );
      if (data.from) query = query.gte("doc_date", data.from);
      if (data.to) query = query.lte("doc_date", data.to);
      const { data: rows } = await query.limit(2000);
      const report = buildResult((rows ?? []) as ReportRow[]);

      const { count: duplicateCount } = await context.supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("status", "duplicate");

      if (report.summary.documentCount < 3) {
        return {
          sufficient_data: false,
          message:
            "Not enough processed documents yet to produce reliable financial insights. Upload and process at least three documents.",
          insights: [],
        };
      }

      const { aiJson, AiGatewayError } = await import("./ai-gateway.server");
      try {
        return await aiJson<{ sufficient_data: boolean; message: string; insights: Insight[] }>({
          system:
            "You are a financial analyst reviewing accounts payable data. Base every statement strictly on the " +
            "aggregated figures provided. Never invent vendors, amounts or trends. If the data is too thin for a " +
            "category, omit that insight rather than guessing. Keep each detail under 40 words and quote real figures.",
          content: [
            {
              type: "text",
              text: JSON.stringify({
                summary: report.summary,
                monthly: report.byMonth,
                topVendors: report.byVendor.slice(0, 12),
                statusBreakdown: report.byStatus,
                flaggedDuplicates: duplicateCount ?? 0,
              }),
            },
          ],
          schemaName: "financial_insights",
          schema: INSIGHTS_SCHEMA,
        });
      } catch (err) {
        const message =
          err instanceof AiGatewayError ? err.message : "AI insights could not be generated.";
        throw new Error(message);
      }
    },
  );
