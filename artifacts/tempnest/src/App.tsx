import { useEffect, useRef, useState } from "react";
import {
  Switch,
  Route,
  useLocation,
  Router as WouterRouter,
  Redirect,
} from "wouter";
import {
  QueryClientProvider,
  useQueryClient,
  QueryClient,
  QueryCache,
  MutationCache,
} from "@tanstack/react-query";
import { ThemeProvider } from "./lib/theme-provider";
import { AuthProvider, useAuth } from "./lib/auth-context";
import {
  setSuspended,
  isSuspended,
  onSuspendedChange,
} from "./lib/suspended-state";
import { useGetMe } from "@workspace/api-client-react";
import { Toaster } from "sonner";

import Home from "./pages/home";
import Dashboard from "./pages/dashboard";
import Inboxes from "./pages/inboxes";
import InboxDetail from "./pages/inbox-detail";
import EmailDetail from "./pages/email-detail";
import Credits from "./pages/credits";
import Analytics from "./pages/analytics";
import Settings from "./pages/settings";
import Pricing from "./pages/pricing";
import AdminDashboard from "./pages/admin/index";
import AdminUsers from "./pages/admin/users";
import AdminInboxes from "./pages/admin/inboxes";
import AdminRevenue from "./pages/admin/revenue";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import {
  Loader2,
  ChevronRight,
  Eye,
  EyeOff,
  AlertTriangle,
  LogOut,
} from "lucide-react";
import { Logo } from "./components/logo";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

function isAccountSuspendedError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const e = error as any;
  return e.status === 403 && e.data?.code === "ACCOUNT_SUSPENDED";
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      if (isAccountSuspendedError(error)) setSuspended(true);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      if (isAccountSuspendedError(error)) setSuspended(true);
    },
  }),
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (isAccountSuspendedError(error)) return false;
        return failureCount < 1;
      },
      staleTime: 30_000,
    },
  },
});

function FirebaseQueryClientCacheInvalidator() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const userId = user?.uid ?? null;
    if (prevUserIdRef.current !== null && prevUserIdRef.current !== userId) {
      qc.clear();
    }
    prevUserIdRef.current = userId;
  }, [user, qc]);

  return null;
}

function SuspendedDetector() {
  const { data: user } = useGetMe();

  useEffect(() => {
    if (user && user.status !== "active") {
      setSuspended(true);
    }
  }, [user]);

  return null;
}

function SuspendedScreen() {
  const { signOutUser } = useAuth();
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <AlertTriangle size={32} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Account Suspended</h1>
          <p className="text-muted-foreground mt-2">
            Your account has been suspended by an administrator. You can no
            longer use TempNest features. Please contact support if you believe
            this is a mistake.
          </p>
        </div>
        <Button onClick={() => signOutUser()} className="gap-2">
          <LogOut size={18} />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center mb-3">
            <Logo />
          </div>
          <p className="text-muted-foreground text-sm">{subtitle}</p>
        </div>
        <div className="bg-card/60 backdrop-blur border border-border rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-foreground">{title}</h1>
            <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function SignInPage() {
  const { signInWithEmail, signInWithGoogle, isLoaded } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isLoaded) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signInWithEmail(email, password);
      setLocation("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    setError("");
    try {
      await signInWithGoogle();
      setLocation("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Sign in to TempNest"
      subtitle="Welcome back! Please sign in to continue"
    >
      <div className="space-y-4">
        <div className="relative">
          <Button
            variant="outline"
            type="button"
            className="w-full h-11 font-medium gap-3"
            onClick={handleGoogle}
            disabled={loading}
          >
            <GoogleLogo className="w-5 h-5" />
            Continue with Google
          </Button>
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full border border-border">
            Last used
          </span>
        </div>
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/60" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-3 text-muted-foreground">or</span>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground font-medium">
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              className="h-11 bg-background/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground font-medium">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="h-11 bg-background/50 pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            className="w-full h-11 font-semibold gap-2"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <span>Continue</span>
            )}
            {!loading && <ChevronRight size={18} />}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-6">
          Don&apos;t have an account?{" "}
          <button
            className="text-primary font-medium hover:underline"
            onClick={() => setLocation(`${basePath}/sign-up`)}
          >
            Sign up
          </button>
        </p>
      </div>
    </AuthCard>
  );
}

function SignUpPage() {
  const { signUpWithEmail, signInWithGoogle, isLoaded } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isLoaded) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signUpWithEmail(email, password);
      setLocation("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Failed to sign up");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    setError("");
    try {
      await signInWithGoogle();
      setLocation("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Google sign-up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Create your account"
      subtitle="Welcome! Please fill in the details to get started."
    >
      <div className="space-y-4">
        <Button
          variant="outline"
          type="button"
          className="w-full h-11 font-medium gap-3"
          onClick={handleGoogle}
          disabled={loading}
        >
          <GoogleLogo className="w-5 h-5" />
          Continue with Google
        </Button>
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/60" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-3 text-muted-foreground">or</span>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground font-medium">
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
              className="h-11 bg-background/50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground font-medium">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                required
                minLength={6}
                className="h-11 bg-background/50 pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            type="submit"
            className="w-full h-11 font-semibold gap-2"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <span>Continue</span>
            )}
            {!loading && <ChevronRight size={18} />}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <button
            className="text-primary font-medium hover:underline"
            onClick={() => setLocation(`${basePath}/sign-in`)}
          >
            Sign in
          </button>
        </p>
      </div>
    </AuthCard>
  );
}

function HomeRoute() {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return null;
  if (isSignedIn) return <Redirect to="/dashboard" />;
  return <Home />;
}

function createProtectedRoute(Component: any) {
  return function ProtectedRouteWrapper(props: any) {
    const { isLoaded, isSignedIn } = useAuth();
    if (!isLoaded) return null;
    if (!isSignedIn) return <Redirect to="/" />;
    return <Component {...props} />;
  };
}

function RouterContent() {
  const [, setLocation] = useLocation();
  const [suspended, setSuspendedState] = useState(isSuspended());

  useEffect(() => {
    return onSuspendedChange((value) => setSuspendedState(value));
  }, []);

  return (
    <AuthProvider>
      <FirebaseQueryClientCacheInvalidator />
      <SuspendedDetector />
      {suspended ? (
        <SuspendedScreen />
      ) : (
        <Switch>
          {/* Public */}
          <Route path="/" component={HomeRoute} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          <Route path="/pricing" component={Pricing} />

          {/* Protected */}
          <Route
            path="/dashboard"
            component={createProtectedRoute(Dashboard)}
          />
          <Route path="/inboxes" component={createProtectedRoute(Inboxes)} />
          <Route
            path="/inboxes/:id"
            component={createProtectedRoute(InboxDetail)}
          />
          <Route
            path="/emails/:id"
            component={createProtectedRoute(EmailDetail)}
          />
          <Route path="/credits" component={createProtectedRoute(Credits)} />
          <Route
            path="/analytics"
            component={createProtectedRoute(Analytics)}
          />
          <Route path="/settings" component={createProtectedRoute(Settings)} />

          {/* Admin */}
          <Route
            path="/admin"
            component={createProtectedRoute(AdminDashboard)}
          />
          <Route
            path="/admin/users"
            component={createProtectedRoute(AdminUsers)}
          />
          <Route
            path="/admin/inboxes"
            component={createProtectedRoute(AdminInboxes)}
          />
          <Route
            path="/admin/revenue"
            component={createProtectedRoute(AdminRevenue)}
          />

          <Route>
            <div className="flex items-center justify-center min-h-[100dvh] text-muted-foreground">
              404 - Page not found
            </div>
          </Route>
        </Switch>
      )}
    </AuthProvider>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="tempnest-theme">
      <QueryClientProvider client={queryClient}>
        <RouterContent />
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
