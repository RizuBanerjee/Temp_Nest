import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackButton({ className = "" }: { className?: string }) {
  function handleBack() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/dashboard";
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBack}
      className={`gap-1.5 text-muted-foreground hover:text-foreground -ml-2 ${className}`}
    >
      <ChevronLeft size={16} />
      Back
    </Button>
  );
}
