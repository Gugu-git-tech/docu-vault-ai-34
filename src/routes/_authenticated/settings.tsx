import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { GlassCard, LoadingState, PageHeader } from "@/components/common";
import { supabase } from "@/integrations/supabase/client";
import { STAGES } from "@/lib/documents.functions";
import { dateTime } from "@/lib/format";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Account settings — Nexora" },
      {
        name: "description",
        content: "Update your display name, review your role and see how the approval workflow is configured.",
      },
      { property: "og:title", content: "Account settings — Nexora" },
      { property: "og:description", content: "Your profile, role and workflow configuration." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { auth, role, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    if (auth) setFullName(auth.fullName ?? "");
  }, [auth]);

  const save = useMutation({
    mutationFn: async () => {
      if (!auth) throw new Error("You are not signed in.");
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim() || null })
        .eq("id", auth.userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Profile updated.");
      void queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not save profile."),
  });

  if (isLoading) return <LoadingState label="Loading your profile…" />;

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your account details and the approval workflow this workspace enforces."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Your profile
          </h2>
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="fullName" className="text-xs text-muted-foreground">
                Display name
              </label>
              <input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full rounded-xl border border-input bg-surface/70 px-3 py-2 text-sm outline-none focus:border-primary/60"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="mt-1 text-sm">{auth?.email ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Role</p>
              <p className="mt-1 text-sm capitalize text-primary">{role}</p>
            </div>
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="flex items-center gap-2 rounded-xl border border-primary/50 bg-primary/10 px-4 py-2 text-sm text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
            >
              {save.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save changes
            </button>
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Approval workflow
          </h2>
          <ol className="mt-4 space-y-3">
            {STAGES.map((s) => (
              <li key={s.stage} className="flex items-start gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-xs text-primary">
                  {s.stage}
                </span>
                <div>
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.stage === 3
                      ? "Final sign-off — administrators only."
                      : "Approvers and administrators may decide this stage."}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">
            Stages run in order. A rejection at any stage stops the document immediately and is
            recorded in the audit log.
          </p>
        </GlassCard>

        <GlassCard className="lg:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Session
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Signed in as {auth?.email ?? "—"}. Last recorded activity {dateTime(new Date().toISOString())}.
          </p>
        </GlassCard>
      </div>
    </>
  );
}
