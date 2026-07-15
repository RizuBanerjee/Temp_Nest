import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  LayoutDashboard,
  Inbox,
  CreditCard,
  BarChart2,
  Settings,
  LogOut,
  ShieldAlert,
  Users,
  PanelLeft,
  PanelLeftOpen,
  ChevronLeft,
} from "lucide-react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, isLoaded, isSignedIn, signOutUser } = useAuth();
  const { data: dbUser } = useGetMe({
    query: { enabled: !!user, queryKey: getGetMeQueryKey() },
  });
  const [collapsed, setCollapsed] = useState(false);

  if (isLoaded && !isSignedIn) {
    setLocation("/");
    return null;
  }

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/inboxes", label: "Inboxes", icon: Inbox },
    { href: "/credits", label: "Credits", icon: CreditCard },
    { href: "/analytics", label: "Analytics", icon: BarChart2 },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const adminItems = [
    { href: "/admin", label: "Admin Overview", icon: ShieldAlert },
    { href: "/admin/users", label: "Manage Users", icon: Users },
    { href: "/admin/inboxes", label: "Manage Inboxes", icon: Inbox },
    { href: "/admin/revenue", label: "Revenue", icon: BarChart2 },
  ];

  // Prefer DB display name over Firebase's name
  const displayName =
    dbUser?.name || user?.displayName || user?.email?.split("@")[0] || "User";
  const displayEmail = user?.email || dbUser?.email || "";

  const SidebarLink = ({
    item,
    isAdmin,
  }: {
    item: (typeof navItems)[0];
    isAdmin?: boolean;
  }) => {
    const isActive = isAdmin
      ? location === item.href
      : location === item.href || location.startsWith(item.href + "/");
    const content = (
      <div
        className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
          isActive
            ? isAdmin
              ? "bg-destructive/10 text-destructive font-medium"
              : "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        } ${collapsed ? "justify-center px-2" : ""}`}
      >
        <item.icon size={18} />
        {!collapsed && <span>{item.label}</span>}
      </div>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Link href={item.href}>{content}</Link>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{item.label}</p>
          </TooltipContent>
        </Tooltip>
      );
    }
    return <Link href={item.href}>{content}</Link>;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-[100dvh] bg-background text-foreground flex">
        {/* Sidebar */}
        <aside
          className={`${collapsed ? "w-16" : "w-64"} border-r border-border/40 bg-card/30 flex flex-col transition-all duration-200`}
        >
          <div className="h-16 flex items-center justify-between px-4 border-b border-border/40 shrink-0">
            <div
              className={`flex items-center ${collapsed ? "justify-center w-full" : ""}`}
            >
              {collapsed ? (
                <img
                  src="/logo.svg"
                  alt="TempNest"
                  className="w-8 h-8 rounded-lg object-cover"
                />
              ) : (
                <Logo />
              )}
            </div>
            <div className="flex items-center gap-1">
              {!collapsed && <ThemeToggle />}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCollapsed(!collapsed)}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? (
                  <PanelLeftOpen size={16} />
                ) : (
                  <PanelLeft size={16} />
                )}
              </Button>
            </div>
          </div>

          <div
            className={`flex-1 overflow-y-auto py-4 flex flex-col gap-1 ${collapsed ? "px-2" : "px-3"}`}
          >
            {!collapsed && (
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
                Menu
              </div>
            )}
            {navItems.map((item) => (
              <SidebarLink key={item.href} item={item} />
            ))}

            {dbUser?.isAdmin && (
              <>
                {!collapsed && (
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3 mt-6">
                    Admin
                  </div>
                )}
                {adminItems.map((item) => (
                  <SidebarLink key={item.href} item={item} isAdmin />
                ))}
              </>
            )}
          </div>

          <div
            className={`p-4 border-t border-border/40 ${collapsed ? "px-2" : ""}`}
          >
            <div
              className={`flex items-center gap-3 px-2 py-2 mb-4 ${collapsed ? "justify-center" : ""}`}
            >
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                {displayName[0]?.toUpperCase() || "U"}
              </div>
              {!collapsed && (
                <div className="overflow-hidden">
                  <p className="text-sm font-medium truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {displayEmail}
                  </p>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              className={`text-muted-foreground hover:text-foreground ${collapsed ? "w-full justify-center px-0" : "w-full justify-start"}`}
              onClick={() => signOutUser()}
            >
              <LogOut size={18} className={collapsed ? "" : "mr-2"} />
              {!collapsed && "Log Out"}
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col h-[100dvh] overflow-hidden">
          {children}
        </main>
      </div>
    </TooltipProvider>
  );
}
