import { useState } from "react";
import { useListAdminUsers, useUpdateAdminUser, useDeleteAdminUser, getListAdminUsersQueryKey } from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Shield, Ban, Trash2, Gift } from "lucide-react";

const planColors: Record<string, string> = {
  free: "bg-muted/60 text-muted-foreground",
  pro: "bg-violet-500/20 text-violet-400 border-violet-500/20",
  business: "bg-amber-500/20 text-amber-400 border-amber-500/20",
};

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400",
  suspended: "bg-amber-500/20 text-amber-400",
  banned: "bg-red-500/20 text-red-400",
};

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [page] = useState(1);
  const [grantModal, setGrantModal] = useState<any>(null);
  const [grantAmount, setGrantAmount] = useState("");

  const { data, isLoading } = useListAdminUsers({ search: search || undefined, page });
  const updateUser = useUpdateAdminUser();
  const deleteUser = useDeleteAdminUser();
  const queryClient = useQueryClient();

  async function handleStatusChange(userId: number, status: string) {
    try {
      await updateUser.mutateAsync({ userId: String(userId), data: { status: status as any } });
      queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
      toast.success(`User ${status}`);
    } catch { toast.error("Failed to update user"); }
  }

  async function handleDelete(userId: number) {
    if (!confirm("Permanently delete this user?")) return;
    try {
      await deleteUser.mutateAsync({ userId: String(userId) });
      queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
      toast.success("User deleted");
    } catch { toast.error("Failed to delete user"); }
  }

  async function handleGrantCredits() {
    if (!grantModal || !grantAmount) return;
    try {
      await updateUser.mutateAsync({ userId: String(grantModal.id), data: { grantCredits: parseInt(grantAmount) } });
      queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
      toast.success(`Granted ${grantAmount} credits`);
      setGrantModal(null);
      setGrantAmount("");
    } catch { toast.error("Failed to grant credits"); }
  }

  return (
    <MainLayout>
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Manage Users</h1>
              <p className="text-muted-foreground text-sm mt-1">{data?.total ?? 0} total users</p>
            </div>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by email or name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="rounded-xl border border-border/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b border-border/40">
                <tr>
                  {["User", "Plan", "Credits", "Inboxes", "Status", "Joined", "Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i} className="border-b border-border/20">
                      {[...Array(7)].map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : data?.users?.map((user: any) => (
                  <tr key={user.id} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-foreground">{user.name || "—"}</p>
                        <p className="text-xs text-muted-foreground font-mono">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`text-[10px] ${planColors[user.plan]}`}>{user.plan}</Badge>
                    </td>
                    <td className="px-4 py-3 font-mono">{user.credits}</td>
                    <td className="px-4 py-3 font-mono">{user.inboxCount}</td>
                    <td className="px-4 py-3">
                      <Badge className={`text-[10px] ${statusColors[user.status]}`}>{user.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setGrantModal(user); }}
                          className="p-1.5 rounded hover:bg-emerald-500/10 text-emerald-500 transition-colors"
                          title="Grant credits"
                        >
                          <Gift size={14} />
                        </button>
                        <button
                          onClick={() => handleStatusChange(user.id, user.status === "active" ? "suspended" : "active")}
                          className="p-1.5 rounded hover:bg-amber-500/10 text-amber-500 transition-colors"
                          title={user.status === "active" ? "Suspend" : "Activate"}
                        >
                          {user.status === "active" ? <Ban size={14} /> : <Shield size={14} />}
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
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

      <Dialog open={!!grantModal} onOpenChange={() => setGrantModal(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Grant Credits to {grantModal?.email}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Amount</Label>
            <Input type="number" placeholder="e.g. 100" value={grantAmount} onChange={e => setGrantAmount(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantModal(null)}>Cancel</Button>
            <Button onClick={handleGrantCredits} disabled={updateUser.isPending}>Grant</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
