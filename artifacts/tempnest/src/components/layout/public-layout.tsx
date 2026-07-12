import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const { isSignedIn, signOutUser } = useAuth();

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col font-sans">
      <header className="border-b border-border/40 backdrop-blur-md sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Logo />

          <nav className="hidden md:flex items-center gap-6">
            <a
              href="#features"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </a>
            <a
              href="#try-it"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Try it
            </a>
            <Link
              href="/pricing"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isSignedIn ? (
              <>
                <Button
                  variant="ghost"
                  onClick={() => setLocation("/dashboard")}
                >
                  Dashboard
                </Button>
                <Button variant="outline" onClick={() => signOutUser()}>
                  Log Out
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setLocation("/sign-in")}>
                  Sign In
                </Button>
                <Button onClick={() => setLocation("/sign-up")}>
                  Get Started
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">{children}</main>

      <footer className="border-t border-border/40 py-8 text-center text-sm text-muted-foreground">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between">
          <p>© {new Date().getFullYear()} TempNest. All rights reserved.</p>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <span className="hover:text-foreground transition-colors cursor-pointer">
              Privacy Policy
            </span>
            <span className="hover:text-foreground transition-colors cursor-pointer">
              Terms of Service
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
