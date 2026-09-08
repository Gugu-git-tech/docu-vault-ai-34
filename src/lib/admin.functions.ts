import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ManagedUser = {
  id: string;
  email: string;
  full_name: string | null;
  status: string;
  role: "admin" | "approver" | "viewer";
  created_at: string;
  last_activity: string | null;
};

async function assertAdmin(context: { supabase: never; userId: string }) {
  const supabase = context.supabase as unknown as {
    rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: boolean | null }>;
  };
  const { data } = await supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Only administrators can manage users.");
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ManagedUser[]> => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);

    const rank = { admin: 3, approver: 2, viewer: 1 } as const;
    const roleFor = (id: string) =>
      (roles ?? [])
        .filter((r) => r.user_id === id)
        .map((r) => r.role)
        .sort((a, b) => rank[b] - rank[a])[0] ?? "viewer";

    return (profiles ?? []).map((p) => ({
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      status: p.status,
      role: roleFor(p.id),
      created_at: p.created_at,
      last_activity: p.last_activity,
    }));
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ userId: z.string().uuid(), role: z.enum(["admin", "approver", "viewer"]) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    if (data.userId === context.userId && data.role !== "admin") {
      throw new Error("You cannot remove your own administrator access.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (error) throw new Error("Role could not be updated.");

    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      action: "role_changed",
      details: `Set role ${data.role} for user ${data.userId}`,
    });
    return { ok: true };
  });

export const setUserStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid(), status: z.enum(["active", "suspended"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ status: data.status })
      .eq("id", data.userId);
    if (error) throw new Error("Status could not be updated.");
    await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      action: "user_status_changed",
      details: `${data.status} for user ${data.userId}`,
    });
    return { ok: true };
  });
