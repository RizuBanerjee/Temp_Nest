import { useState } from "react";
import { useGetEmail, useMarkEmailRead, useExtractEmailOtp, getGetEmailQueryKey } from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { ArrowLeft, Copy, Check, Key } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function EmailDetail({ params }: { params: { id: string } }) {
  const id = params.id;
  const [otpCopied, setOtpCopied] = useState(false);
  const queryClient = useQueryClient();

  const { data: email, isLoading } = useGetEmail(id);
  const markRead = useMarkEmailRead();
  const extractOtp = useExtractEmailOtp(id);

  function copyOtp(code: string) {
    navigator.clipboard.writeText(code);
    setOtpCopied(true);
    setTimeout(() => setOtpCopied(false), 2000);
    toast.success("OTP copied to clipboard");
  }

  async function handleExtractOtp() {
    try {
      const result = await extractOtp.refetch();
      queryClient.invalidateQueries({ queryKey: getGetEmailQueryKey(id) });
      if (result.data?.found) {
        toast.success(`OTP found: ${result.data.code}`);
      } else {
        toast.info("No OTP detected in this email");
      }
    } catch {
      toast.error("Failed to extract OTP");
    }
  }

  const otp = email?.otpCode || (extractOtp.data?.found ? extractOtp.data.code : null);

  return (
    <MainLayout>
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Link href={email?.inboxId ? `/inboxes/${email.inboxId}` : "/inboxes"}>
              <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft size={18} />
              </button>
            </Link>
            <div className="flex-1 min-w-0">
              {isLoading ? (
                <Skeleton className="h-6 w-80" />
              ) : (
                <h1 className="text-lg font-semibold truncate">{email?.subject}</h1>
              )}
            </div>
          </div>

          {/* OTP Banner */}
          {(email?.hasOtp || otp) && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-xl border border-primary/40 bg-primary/5 p-5"
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.1),transparent)] pointer-events-none" />
              <div className="relative flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Key size={20} className="text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">OTP DETECTED</Badge>
                    </div>
                    {otp && (
                      <span className="font-mono text-3xl font-bold tracking-[0.2em] text-foreground">{otp}</span>
                    )}
                  </div>
                </div>
                {otp && (
                  <Button onClick={() => copyOtp(otp)} className="gap-2 shrink-0">
                    {otpCopied ? <Check size={14} /> : <Copy size={14} />}
                    {otpCopied ? "Copied!" : "Copy Code"}
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {/* Email Header */}
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : (
            <div className="rounded-xl border border-border/60 bg-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">From</span>
                    <span className="font-mono text-sm">{email?.from}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {email?.createdAt ? new Date(email.createdAt).toLocaleString() : ""}
                  </p>
                </div>
                {!email?.hasOtp && (
                  <Button variant="outline" size="sm" onClick={handleExtractOtp} disabled={extractOtp.isFetching} className="gap-1.5">
                    <Key size={13} />
                    Extract OTP
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Email Body */}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-4 w-full" style={{ width: `${70 + Math.random() * 30}%` }} />)}
            </div>
          ) : (
            <div className="rounded-xl border border-border/60 bg-card p-5">
              {email?.bodyHtml ? (
                <div
                  className="prose prose-invert max-w-none text-sm"
                  dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
                />
              ) : email?.bodyText ? (
                <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">{email.bodyText}</pre>
              ) : (
                <p className="text-muted-foreground text-sm italic">No content</p>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
