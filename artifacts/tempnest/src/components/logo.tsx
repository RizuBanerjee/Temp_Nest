import { Link } from "wouter";
import { ShieldAlert } from "lucide-react";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2 font-bold text-xl tracking-tight text-foreground ${className}`}>
      <div className="w-8 h-8 rounded-md bg-primary/20 flex items-center justify-center text-primary">
        <ShieldAlert size={20} />
      </div>
      TempNest
    </Link>
  );
}