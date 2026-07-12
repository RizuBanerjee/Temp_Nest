import { Link } from "wouter";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`flex items-center gap-2 font-bold text-xl tracking-tight text-foreground ${className}`}
    >
      <img
        src="/tempnest-logo.png"
        alt="TempNest"
        className="w-8 h-8 rounded-md object-cover"
      />
      TempNest
    </Link>
  );
}
