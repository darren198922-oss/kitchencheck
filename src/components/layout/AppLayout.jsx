import { Outlet, useLocation, Link } from "react-router-dom";
import { LayoutDashboard, Users, ClipboardList, FileText, Bell, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import AccessStatusBanner from "@/components/shared/AccessStatusBanner";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Home" },
  { path: "/customers", icon: Users, label: "Customers" },
  { path: "/records", icon: ClipboardList, label: "Work Log" },
  { path: "/documents", icon: FileText, label: "Proof" },
  { path: "/reminders", icon: Bell, label: "Follow-ups" },
];

export default function AppLayout() {
  const location = useLocation();

  return (
    <div className="dark min-h-screen bg-background text-foreground flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <ClipboardList className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg tracking-tight">WorkMark</span>
        </div>
        <Link to="/settings" className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <Settings className="w-5 h-5 text-muted-foreground" />
        </Link>
      </header>

      {/* Access status banner — shown only when trial expiring/expired or override active */}
      <AccessStatusBanner />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-xl border-t border-border">
        <div className="flex items-center justify-around px-2 py-1 max-w-lg mx-auto">
          {navItems.map((item) => {
            const isActive = item.path === "/" 
              ? location.pathname === "/" 
              : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all min-w-[56px]",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive && "stroke-[2.5]")} />
                <span className="text-[10px] font-medium">{item.label}</span>
                {isActive && (
                  <div className="w-1 h-1 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}