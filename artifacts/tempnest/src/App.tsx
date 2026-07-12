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
} from "@tanstack/react-query";
import { ThemeProvider } from "./lib/theme-provider";
import { AuthProvider, useAuth } from "./lib/auth-context";
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
import { Loader2 } from "lucide-react";
import { Logo } from "./components/logo";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
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
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2.5 mb-3">
            <Logo />
          </div>
          <p className="text-xl font-bold text-foreground">{title}</p>
          <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 shadow-2xl">
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
    <AuthCard title="Welcome back" subtitle="Sign in to your TempNest account">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
          Sign In
        </Button>
      </form>
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">Or</span>
        </div>
      </div>
      <Button
        variant="outline"
        className="w-full"
        onClick={handleGoogle}
        disabled={loading}
      >
        Sign in with Google
      </Button>
      <p className="text-center text-sm text-muted-foreground mt-6">
        Don't have an account?{" "}
        <button
          className="text-primary hover:underline"
          onClick={() => setLocation(`${basePath}/sign-up`)}
        >
          Sign up
        </button>
      </p>
    </AuthCard>
  );
}

function SignUpPage() {
  const { signUpWithEmail, signInWithGoogle, isLoaded } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isLoaded) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signUpWithEmail(email, password, name);
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
      subtitle="Start using TempNest for free"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
          Sign Up
        </Button>
      </form>
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">Or</span>
        </div>
      </div>
      <Button
        variant="outline"
        className="w-full"
        onClick={handleGoogle}
        disabled={loading}
      >
        Sign up with Google
      </Button>
      <p className="text-center text-sm text-muted-foreground mt-6">
        Already have an account?{" "}
        <button
          className="text-primary hover:underline"
          onClick={() => setLocation(`${basePath}/sign-in`)}
        >
          Sign in
        </button>
      </p>
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

  return (
    <AuthProvider>
      <FirebaseQueryClientCacheInvalidator />
      <Switch>
        {/* Public */}
        <Route path="/" component={HomeRoute} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route path="/pricing" component={Pricing} />

        {/* Protected */}
        <Route path="/dashboard" component={createProtectedRoute(Dashboard)} />
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
        <Route path="/analytics" component={createProtectedRoute(Analytics)} />
        <Route path="/settings" component={createProtectedRoute(Settings)} />

        {/* Admin */}
        <Route path="/admin" component={createProtectedRoute(AdminDashboard)} />
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
