import { useListAdminInboxes } from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminInboxes() {
  const { data, isLoading } = useListAdminInboxes({ page: 1 });

  return (
    <MainLayout>
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Manage Inboxes</h1>
            <p className="text-muted-foreground text-sm mt-1">{data?.total ?? 0} total inboxes</p>
          </div>

          <div className="rounded-xl border border-border/60 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b border-border/40">
                <tr>
                  {["Address", "User", "Status", "Emails", "Created"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i} className="border-b border-border/20">
                      {[...Array(5)].map((_, j) => (
                        <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : data?.inboxes?.map((inbox: any) => (
                  <tr key={inbox.id} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{inbox.address}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{inbox.userEmail}</td>
                    <td className="px-4 py-3">
                      <Badge className={`text-[10px] ${inbox.isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                        {inbox.isActive ? "active" : "inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-mono">{inbox.emailCount}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(inbox.createdAt).toLocaleDateString()}</td>
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
