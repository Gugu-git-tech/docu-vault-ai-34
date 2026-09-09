import { Check, ChevronDown, Clock, X } from "lucide-react";

import { STAGES } from "@/lib/documents.functions";
import { dateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ApprovalRecord = {
  stage: number;
  action: string;
  reason: string | null;
  created_at: string;
  actor_role: string;
};

export function ApprovalTimeline({
  approvals,
  currentStage,
  status,
}: {
  approvals: ApprovalRecord[];
  currentStage: number;
  status: string;
}) {
  return (
    <ol className="space-y-1">
      {STAGES.map(({ stage, label }, index) => {
        const record = approvals.find((a) => a.stage === stage);
        const state = record
          ? record.action === "approved"
            ? "approved"
            : "rejected"
          : status === "rejected" || status === "approved"
            ? "blocked"
            : stage === currentStage
              ? "current"
              : "pending";

        return (
          <li key={stage}>
            <div
              className={cn(
                "flex items-start gap-4 rounded-xl border p-4 transition-all",
                state === "current" && "border-primary/40 bg-primary/5 glow-ring",
                state === "approved" && "border-success/30 bg-success/5",
                state === "rejected" && "border-destructive/40 bg-destructive/5",
                (state === "pending" || state === "blocked") && "border-border bg-secondary/30",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  state === "approved" && "border-success/50 bg-success/15 text-success",
                  state === "rejected" && "border-destructive/50 bg-destructive/15 text-destructive",
                  state === "current" && "border-primary/60 bg-primary/15 text-primary",
                  (state === "pending" || state === "blocked") &&
                    "border-border bg-secondary text-muted-foreground",
                )}
                aria-hidden="true"
              >
                {state === "approved" ? (
                  <Check className="size-4" />
                ) : state === "rejected" ? (
                  <X className="size-4" />
                ) : state === "current" ? (
                  <Clock className="size-4" />
                ) : (
                  stage
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="font-medium">
                    Stage {stage} — {label}
                  </p>
                  <span className="text-xs capitalize text-muted-foreground">
                    {state === "blocked" ? "not required" : state}
                  </span>
                </div>
                {record ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {record.action === "approved" ? "Approved" : "Rejected"} by {record.actor_role} ·{" "}
                    {dateTime(record.created_at)}
                    {record.reason ? ` · “${record.reason}”` : ""}
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {state === "current" ? "Awaiting decision" : "Waiting for the previous stage"}
                  </p>
                )}
              </div>
            </div>
            {index < STAGES.length - 1 ? (
              <div className="flex justify-center py-1" aria-hidden="true">
                <ChevronDown className="size-4 text-muted-foreground/60" />
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
