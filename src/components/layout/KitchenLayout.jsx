import { Outlet, Link, useLocation as useRouterLocation } from "react-router-dom";
import { LayoutDashboard, ClipboardCheck, History, Settings, AlertTriangle } from "lucide-react";
import { LocationProvider, useLocation } from "@/lib/LocationContext";
import LocationSwitcher from "@/components/layout/LocationSwitcher";
import SiteFooter from "@/components/layout/SiteFooter";

const navItems = [
  { path: "/", label: "Today", icon: LayoutDashboard },
  { path: "/history", label: "History", icon: History },
  { path: "/settings", label: "Settings", icon: Settings },
];

function KitchenLayoutInner() {
  const { pathname } = useRouterLocation();
  const { locationError } = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <ClipboardCheck className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-base tracking-tight">KitchenCheck</span>
        </div>
        <LocationSwitcher />
      </header>

      {locationError && (
        <div
          role="alert"
          className="bg-amber-500/10 border-b border-amber-500/25 px-4 py-2.5 flex items-start gap-2"
        >
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900 dark:text-amber-200 leading-snug">
            KitchenCheck could not load your kitchen data. Please refresh or try again.
          </p>
        </div>
      )}

      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-24">
        <Outlet />
        <SiteFooter className="pb-4" />
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border">
        <div className="flex items-stretch max-w-lg mx-auto">
          {navItems.map(({ path, label, icon: Icon }) => {
            const active = path === "/" ? pathname === "/" : pathname.startsWith(path);
            return (
              <Link
                key={path}
                to={path}
                className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function KitchenLayout() {
  return (
    <LocationProvider>
      <KitchenLayoutInner />
    </LocationProvider>
  );
}