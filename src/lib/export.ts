import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

import type { ReportResult } from "./reports.functions";

const HEAD = [
  "Type",
  "Vendor",
  "Number",
  "Date",
  "Subtotal",
  "VAT",
  "Total",
  "Currency",
  "Status",
];

function rowsToMatrix(report: ReportResult) {
  return report.rows.map((r) => [
    r.doc_type === "credit_note" ? "Credit note" : "Invoice",
    r.vendor ?? "—",
    r.invoice_number ?? "—",
    r.doc_date ?? "—",
    Number(r.subtotal ?? 0).toFixed(2),
    Number(r.vat_amount ?? 0).toFixed(2),
    Number(r.total_amount ?? 0).toFixed(2),
    r.currency ?? "—",
    r.status,
  ]);
}

export function exportReportPdf(report: ReportResult, subtitle: string) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt" });
  doc.setFillColor(11, 16, 32);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 74, "F");
  doc.setTextColor(248, 250, 252);
  doc.setFontSize(18);
  doc.text("NEXORA — Financial Document Report", 40, 34);
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text(subtitle, 40, 54);

  const s = report.summary;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(
    `Documents: ${s.documentCount}    Total: ${s.totalSpend.toFixed(2)}    VAT: ${s.totalVat.toFixed(2)}    Approved: ${s.approvedSpend.toFixed(2)}    Pending: ${s.pendingSpend.toFixed(2)}    Rejected: ${s.rejectedSpend.toFixed(2)}`,
    40,
    98,
  );

  autoTable(doc, {
    head: [HEAD],
    body: rowsToMatrix(report),
    startY: 116,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [56, 189, 248], textColor: [7, 11, 20] },
    alternateRowStyles: { fillColor: [241, 245, 249] },
  });

  doc.save(`nexora-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportReportExcel(report: ReportResult) {
  const wb = XLSX.utils.book_new();

  const documents = XLSX.utils.aoa_to_sheet([HEAD, ...rowsToMatrix(report)]);
  XLSX.utils.book_append_sheet(wb, documents, "Documents");

  const s = report.summary;
  const summary = XLSX.utils.aoa_to_sheet([
    ["Metric", "Value"],
    ["Document count", s.documentCount],
    ["Total spend", s.totalSpend],
    ["Total VAT", s.totalVat],
    ["Approved spend", s.approvedSpend],
    ["Pending spend", s.pendingSpend],
    ["Rejected spend", s.rejectedSpend],
  ]);
  XLSX.utils.book_append_sheet(wb, summary, "Summary");

  const vendors = XLSX.utils.aoa_to_sheet([
    ["Vendor", "Documents", "VAT", "Total"],
    ...report.byVendor.map((v) => [v.vendor, v.count, v.vat, v.total]),
  ]);
  XLSX.utils.book_append_sheet(wb, vendors, "Vendors");

  const vat = XLSX.utils.aoa_to_sheet([
    ["Month", "Documents", "Taxable (subtotal)", "VAT", "Total"],
    ...report.byMonth.map((m) => [m.month, m.count, m.total - m.vat, m.vat, m.total]),
  ]);
  XLSX.utils.book_append_sheet(wb, vat, "VAT");

  XLSX.writeFile(wb, `nexora-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
