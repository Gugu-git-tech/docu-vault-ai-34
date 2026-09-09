import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "approver" | "viewer";

export type AuthState = {
  userId: string;
  email: string;
  fullName: string | null;
  role: AppRole;
};

const RANK: Record<AppRole, number> = { admin: 3, approver: 2, viewer: 1 };

export function useAuth() {
  const query = useQuery({
    queryKey: ["auth", "me"],
    staleTime: 60_000,
    queryFn: async (): Promise<AuthState | null> => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return null;

      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);

      const role =
        (roles ?? [])
          .map((r) => r.role as AppRole)
          .sort((a, b) => RANK[b] - RANK[a])[0] ?? "viewer";

      void supabase.from("profiles").update({ last_activity: new Date().toISOString() }).eq("id", user.id);

      return {
        userId: user.id,
        email: profile?.email ?? user.email ?? "",
        fullName: profile?.full_name ?? null,
        role,
      };
    },
  });

  const role = query.data?.role ?? "viewer";
  return {
    ...query,
    auth: query.data ?? null,
    role,
    isAdmin: role === "admin",
    canApprove: role === "admin" || role === "approver",
    canUpload: role === "admin" || role === "approver",
  };
}
