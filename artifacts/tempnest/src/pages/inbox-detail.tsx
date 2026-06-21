import { useState } from "react";
import { useGetInbox, useListInboxEmails, useRefreshInbox, useDeleteInbox, getListInboxEmailsQueryKey, getGetInboxQueryKey, getListInboxesQueryKey } from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation } from "wouter";
import { RefreshCw, Trash2, Copy, Check, ArrowLeft, Mail, Key, Clock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function InboxDetail({ params }: { params: { id: string } }) {
  const id = params.id;
  const [, setLocation] = useLocation();
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  const { data: inbox, isLoading: inboxLoading } = useGetInbox(id);
  const { data: emails, isLoading: emailsLoading } = useListInboxEmails(id);
  const refresh = useRefreshInbox();
  const deleteInbox = useDeleteInbox();

  function copyAddress() {
    if (!inbox?.address) return;
    navigator.clipboard.writeText(inbox.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Address copied");
  }

  async function handleRefresh() {
    try {
      const result = await refresh.mutateAsync({ inboxId: id });
      queryClient.invalidateQueries({ queryKey: getListInboxEmailsQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: getGetInboxQueryKey(id) });
      toast.success(`${result.newEmails} new email${result.newEmails !== 1 ? "s" : ""}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to refresh");
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this inbox? All emails will be lost.")) return;
    try {
      await deleteInbox.mutateAsync({ inboxId: id });
      queryClient.invalidateQueries({ queryKey: getListInboxesQueryKey() });
      toast.success("Inbox deleted");
      setLocation("/inboxes");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to delete inbox");
    }
  }

  return (
    <MainLayout>
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Link href="/inboxes">
              <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft size={18} />
              </button>
            </Link>
            <div className="flex-1 min-w-0">
              {inboxLoading ? (
                <Skeleton className="h-6 w-64" />
              ) : (
                <div className="flex items-center gap-3">
                  <h1 className="font-mono text-lg font-semibold truncate">{inbox?.address}</h1>
                  {inbox?.isPriority && (
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/20 text-xs">Priority</Badge>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-0.5">
                {emailsLoading ? "Loading..." : `${emails?.length ?? 0} emails`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={copyAddress} className="gap-1.5">
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                Copy
              </Button>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refresh.isPending} className="gap-1.5">
                <RefreshCw size={14} className={refresh.isPending ? "animate-spin" : ""} />
                Refresh
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive gap-1.5">
                <Trash2 size={14} />
              </Button>
            </div>
          </div>

          {emailsLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
            </div>
          ) : !emails?.length ? (
            <div className="text-center py-20 border border-dashed border-border rounded-2xl">
              <Mail size={40} className="mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-lg font-semibold mb-1">Inbox is empty</p>
              <p className="text-sm text-muted-foreground mb-6">Share this address and click refresh to check for new emails.</p>
              <Button onClick={handleRefresh} disabled={refresh.isPending} variant="outline" className="gap-2">
                <RefreshCw size={14} className={refresh.isPending ? "animate-spin" : ""} />
                Check for emails
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {emails.map((email) => (
                <Link key={email.id} href={`/emails/${email.id}`}>
                  <div className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors hover:border-primary/30 hover:bg-card/80 ${email.isRead ? "border-border/40 bg-card/20" : "border-border/60 bg-card"}`}>
                    <div className="mt-1.5">
                      {email.hasOtp ? (
                        <Key size={14} className="text-primary" />
                      ) : (
                        <div className={`w-2 h-2 rounded-full ${email.isRead ? "bg-transparent border border-border" : "bg-primary"}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-xs text-muted-foreground truncate">{email.from}</span>
                        {email.hasOtp && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-primary/15 text-primary border-primary/20 animate-pulse">
                            OTP
                          </Badge>
                        )}
                      </div>
                      <p className={`text-sm truncate ${email.isRead ? "text-muted-foreground" : "font-medium text-foreground"}`}>
                        {email.subject}
                      </p>
                      {email.preview && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{email.preview}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                      <Clock size={11} />
                      {new Date(email.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
