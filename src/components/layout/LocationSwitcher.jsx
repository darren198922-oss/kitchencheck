import { useState } from "react";
import { useLocation } from "@/lib/LocationContext";
import { ChevronDown, MapPin, Check } from "lucide-react";

export default function LocationSwitcher() {
  const { locations, activeLocation, setActiveLocationId, multiSite } = useLocation();
  const [open, setOpen] = useState(false);

  if (!activeLocation) return null;

  // Single location — just show name, no switcher
  if (!multiSite) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium">
        <MapPin className="w-3 h-3" />
        <span className="truncate max-w-[140px]">{activeLocation.name}</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs font-semibold text-foreground bg-secondary px-3 py-1.5 rounded-full border border-border"
      >
        <MapPin className="w-3 h-3 text-primary" />
        <span className="truncate max-w-[120px]">{activeLocation.name}</span>
        <ChevronDown className="w-3 h-3 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 bg-card border border-border rounded-2xl shadow-lg overflow-hidden min-w-[180px]">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-4 pt-3 pb-1.5">Switch kitchen</p>
            {locations.map(loc => (
              <button
                key={loc.id}
                onClick={() => { setActiveLocationId(loc.id); setOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-secondary transition-colors text-left"
              >
                <span className="flex-1">{loc.name}</span>
                {loc.id === activeLocation.id && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}