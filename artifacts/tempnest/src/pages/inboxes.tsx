import { useState } from "react";
import { useListInboxes, useCreateInbox, getListInboxesQueryKey } from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "wouter";
import { Plus, Inbox, Mail, Copy, Check, Zap } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

function InboxCard({ inbox }: { inbox: any }) {
  const [copied, setCopied] = useState(false);

  function copyAddress() {
    navigator.clipboard.writeText(inbox.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Address copied");
  }

  return (
    <Link href={`/inboxes/${inbox.id}`}>
      <Card className="p-5 bg-card border-border/60 hover:border-primary/30 transition-colors cursor-pointer group">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm text-foreground truncate">{inbox.address}</span>
              {inbox.isPriority && (
                <Badge className="text-[10px] px-1.5 bg-amber-500/20 text-amber-400 border-amber-500/20">
                  Priority
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Created {new Date(inbox.createdAt).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={(e) => { e.preventDefault(); copyAddress(); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-muted"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-muted-foreground" />}
          </button>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Mail size={14} />
            <span>{inbox.emailCount} emails</span>
          </div>
          {inbox.unreadCount > 0 && (
            <Badge className="text-[10px] px-2 bg-primary/10 text-primary border-primary/20">
              {inbox.unreadCount} new
            </Badge>
          )}
          <div className="ml-auto">
            <div className={`w-2 h-2 rounded-full ${inbox.isActive ? "bg-emerald-500" : "bg-muted-foreground"}`} />
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default function Inboxes() {
  const { data: inboxes, isLoading } = useListInboxes();
  const createInbox = useCreateInbox();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [isPriority, setIsPriority] = useState(false);

  async function handleCreate() {
    try {
      await createInbox.mutateAsync({ data: { customName: customName || null, isPriority } });
      queryClient.invalidateQueries({ queryKey: getListInboxesQueryKey() });
      setOpen(false);
      setCustomName("");
      setIsPriority(false);
      toast.success("Inbox created");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to create inbox");
    }
  }

  return (
    <MainLayout>
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Inboxes</h1>
              <p className="text-muted-foreground text-sm mt-1">
                {inboxes?.length ?? 0} active {inboxes?.length === 1 ? "inbox" : "inboxes"}
              </p>
            </div>
            <Button onClick={() => setOpen(true)} className="gap-2">
              <Plus size={16} /> New Inbox
            </Button>
          </div>

          {isLoading ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
            </div>
          ) : !inboxes?.length ? (
            <div className="text-center py-20 border border-dashed border-border rounded-2xl">
              <Inbox size={40} className="mx-auto mb-4 text-muted-foreground/30" />
              <p className="text-lg font-semibold text-foreground mb-1">No inboxes yet</p>
              <p className="text-muted-foreground text-sm mb-6">Create your first temporary inbox to start receiving emails.</p>
              <Button onClick={() => setOpen(true)} className="gap-2">
                <Plus size={16} /> Create your first inbox
              </Button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {inboxes.map((inbox) => <InboxCard key={inbox.id} inbox={inbox} />)}
            </div>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Create New Inbox</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Custom Name (optional)</Label>
              <Input
                placeholder="e.g. myalias (5 extra credits)"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">Leave empty for a random name. Custom names cost 5 extra credits.</p>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border/60">
              <Checkbox
                id="priority"
                checked={isPriority}
                onCheckedChange={(v) => setIsPriority(Boolean(v))}
              />
              <div>
                <Label htmlFor="priority" className="cursor-pointer flex items-center gap-1.5">
                  <Zap size={14} className="text-amber-400" />
                  Priority Inbox (+10 credits)
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">Emails arrive faster with priority processing.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
              <Zap size={14} className="text-primary" />
              <span>Cost: <strong className="text-foreground">{2 + (customName ? 5 : 0) + (isPriority ? 10 : 0)} credits</strong></span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createInbox.isPending}>
              {createInbox.isPending ? "Creating..." : "Create Inbox"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
