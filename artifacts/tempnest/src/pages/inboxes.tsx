import { useState } from "react";
import {
  useListAdminInboxes,
  getListAdminInboxesQueryKey,
} from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, RefreshCw, Power, PowerOff } from "lucide-react";

export default function AdminInboxes() {
  const { data, isLoading } = useListAdminInboxes({ page: 1 });
  const queryClient = useQueryClient();
  const [workingId, setWorkingId] = useState<string | null>(null);

  async function refresh() {
    await queryClient.invalidateQueries({
      queryKey: getListAdminInboxesQueryKey(),
    });
    toast.success("Refreshed inboxes");
  }

  async function handleDelete(id: string) {
    if (!confirm("Permanently delete this inbox? This cannot be undone."))
      return;
    setWorkingId(id);
    try {
      const res = await apiFetch(`/api/admin/inboxes/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed");
      await queryClient.invalidateQueries({
        queryKey: getListAdminInboxesQueryKey(),
      });
      toast.success("Inbox deleted");
    } catch {
      toast.error("Failed to delete inbox");
    } finally {
      setWorkingId(null);
    }
  }

  async function handleToggle(id: string, nextActive: boolean) {
    setWorkingId(id);
    try {
      const res = await apiFetch(`/api/admin/inboxes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });
      if (!res.ok) throw new Error("Failed");
      await queryClient.invalidateQueries({
        queryKey: getListAdminInboxesQueryKey(),
      });
      toast.success(`Inbox ${nextActive ? "activated" : "deactivated"}`);
    } catch {
      toast.error("Failed to update inbox");
    } finally {
      setWorkingId(null);
    }
  }

  return (
    <MainLayout>
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Manage Inboxes</h1>
              <p className="text-muted-foreground text-sm mt-1">
                {data?.total ?? 0} total inboxes
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              className="gap-2"
            >
              <RefreshCw size={14} /> Refresh
            </Button>
          </div>

          <div className="rounded-xl border border-border/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b border-border/40">
                <tr>
                  {[
                    "Address",
                    "User",
                    "Status",
                    "Emails",
                    "Created",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? [...Array(8)].map((_, i) => (
                      <tr key={i} className="border-b border-border/20">
                        {[...Array(6)].map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <Skeleton className="h-4 w-full" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : data?.inboxes?.map((inbox: any) => (
                      <tr
                        key={inbox.id}
                        className="border-b border-border/20 hover:bg-muted/10 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs">
                          {inbox.address}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {inbox.userEmail}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            className={`text-[10px] ${inbox.isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}
                          >
                            {inbox.isActive ? "active" : "inactive"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {inbox.emailCount}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(inbox.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() =>
                                handleToggle(inbox.id, !inbox.isActive)
                              }
                              disabled={workingId === inbox.id}
                              className={`p-1.5 rounded transition-colors ${
                                inbox.isActive
                                  ? "hover:bg-red-500/10 text-red-500"
                                  : "hover:bg-emerald-500/10 text-emerald-500"
                              }`}
                              title={inbox.isActive ? "Deactivate" : "Activate"}
                            >
                              {inbox.isActive ? (
                                <PowerOff size={14} />
                              ) : (
                                <Power size={14} />
                              )}
                            </button>
                            <button
                              onClick={() => handleDelete(inbox.id)}
                              disabled={workingId === inbox.id}
                              className="p-1.5 rounded hover:bg-red-500/10 text-red-500 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
