import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Users } from "lucide-react";
import { toast } from "sonner";

import {
  EmptyState,
  ErrorState,
  GlassCard,
  LoadingState,
  PageHeader,
} from "@/components/common";
import { listUsers, setUserRole, setUserStatus } from "@/lib/admin.functions";
import { dateTime } from "@/lib/format";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({
    meta: [
      { title: "User management — Nexora" },
      {
        name: "description",
        content:
          "Administrators manage team access, assign viewer, approver and administrator roles, and suspend accounts.",
      },
      { property: "og:title", content: "User management — Nexora" },
      {
        property: "og:description",
        content: "Assign roles and manage account access for your finance team.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UsersPage,
});

const ROLES = ["viewer", "approver", "admin"] as const;

function UsersPage() {
  const { isAdmin, auth, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const fetchUsers = useServerFn(listUsers);
  const changeRole = useServerFn(setUserRole);
  const changeStatus = useServerFn(setUserStatus);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin", "users"],
    enabled: isAdmin,
    queryFn: () => fetchUsers(),
  });

  const roleMutation = useMutation({
    mutationFn: (vars: { userId: string; role: (typeof ROLES)[number] }) =>
      changeRole({ data: vars }),
    onSuccess: () => {
      toast.success("Role updated.");
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update role."),
  });

  const statusMutation = useMutation({
    mutationFn: (vars: { userId: string; status: "active" | "suspended" }) =>
      changeStatus({ data: vars }),
    onSuccess: () => {
      toast.success("Account status updated.");
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update status."),
  });

  if (authLoading) return <LoadingState label="Checking your access…" />;

  if (!isAdmin) {
    return (
      <>
        <PageHeader title="User management" />
        <EmptyState
          title="Administrators only"
          description="Ask an administrator to grant you access if you need to manage team members."
          icon={Users}
        />
      </>
    );
  }

  if (isLoading) return <LoadingState label="Loading team members…" />;
  if (isError)
    return (
      <ErrorState
        message={error instanceof Error ? error.message : undefined}
        retry={() => refetch()}
      />
    );

  const users = data ?? [];

  return (
    <>
      <PageHeader
        title="User management"
        description={`${users.length} people can sign in. Roles control who may upload, approve and give final finance sign-off.`}
      />

      <GlassCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-200 text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                {["Name", "Email", "Role", "Status", "Joined", "Last active"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-4 py-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === auth?.userId;
                return (
                  <tr
                    key={u.id}
                    className="border-b border-border/60 transition-colors last:border-0 hover:bg-secondary/40"
                  >
                    <td className="px-4 py-3">
                      {u.full_name ?? "—"}
                      {isSelf ? (
                        <span className="ml-2 text-xs text-primary">you</span>
                      ) : null}
                    </td>
                    <td className="max-w-60 truncate px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        aria-label={`Role for ${u.email}`}
                        disabled={roleMutation.isPending}
                        onChange={(e) =>
                          roleMutation.mutate({
                            userId: u.id,
                            role: e.target.value as (typeof ROLES)[number],
                          })
                        }
                        className="rounded-lg border border-input bg-surface/70 px-2 py-1.5 text-sm capitalize outline-none focus:border-primary/60"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r} className="bg-popover capitalize">
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        disabled={statusMutation.isPending || isSelf}
                        onClick={() =>
                          statusMutation.mutate({
                            userId: u.id,
                            status: u.status === "active" ? "suspended" : "active",
                          })
                        }
                        className={
                          u.status === "active"
                            ? "rounded-full border border-success/40 bg-success/10 px-3 py-1 text-xs text-success disabled:opacity-50"
                            : "rounded-full border border-destructive/40 bg-destructive/10 px-3 py-1 text-xs text-destructive disabled:opacity-50"
                        }
                      >
                        {u.status === "active" ? "Active" : "Suspended"}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {dateTime(u.created_at)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {dateTime(u.last_activity)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </>
  );
}
