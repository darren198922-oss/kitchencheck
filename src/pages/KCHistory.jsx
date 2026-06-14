import { useEffect, useState } from "react";
import { getLocalDevSessions } from "@/lib/localDevKitchenCheckData";
import { listKcSessions } from "@/lib/kitchencheckSupabase";
import { normalizeKcSession } from "@/lib/kcSessionNormalize";
import { Link, useLocation as useRouterLocation } from "react-router-dom";
import { CheckCircle2, AlertTriangle, ChevronRight, Search, ShieldCheck, FileDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useLocation } from "@/lib/LocationContext";
import ExportHistoryModal from "@/components/history/ExportHistoryModal";

const LOCAL_DEV_AUTH = import.meta.env.VITE_LOCAL_DEV_AUTH === 'true';

export default function KCHistory() {
  const { pathname } = useRouterLocation();
  const { activeLocationId, activeLocation, loading: locationLoading } = useLocation();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    if (locationLoading) return;
    setLoading(true);
    async function load() {
      try {
        const data = LOCAL_DEV_AUTH
          ? getLocalDevSessions()
          : (await listKcSessions()).map(normalizeKcSession);
        const filtered = data.filter(s =>
          !s.location_id || !activeLocationId || s.location_id === activeLocationId
        );
        setSessions(filtered);
      } catch (err) {
        console.error("KCHistory load failed:", err);
        setSessions([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [activeLocationId, locationLoading, pathname]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  const filtered = sessions.filter(s => {
    const q = search.toLowerCase();
    return (
      s.template_name?.toLowerCase().includes(q) ||
      s.completed_by?.toLowerCase().includes(q) ||
      s.session_date?.includes(q)
    );
  });

  // Group by date
  const grouped = filtered.reduce((acc, s) => {
    const date = s.session_date || "Unknown";
    if (!acc[date]) acc[date] = [];
    acc[date].push(s);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  const today = format(new Date(), "yyyy-MM-dd");
  const yesterday = format(new Date(Date.now() - 86400000), "yyyy-MM-dd");

  const formatDateLabel = (date) => {
    if (date === today) return "Today";
    if (date === yesterday) return "Yesterday";
    try { return format(parseISO(date), "EEEE, d MMM yyyy"); } catch { return date; }
  };

  // Record summary: count last 7 days
  const last7 = sessions.filter(s => {
    if (!s.session_date) return false;
    const diff = (new Date(today) - new Date(s.session_date)) / 86400000;
    return diff >= 0 && diff < 7;
  });
  const flaggedRecent = last7.filter(s => s.status === "flagged").length;

  return (
    <div className="p-4 max-w-lg mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Check History</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeLocation?.name
              ? `Showing records for: ${activeLocation.name}`
              : "Select a kitchen location to view records."}
          </p>
        </div>
        {sessions.length > 0 && (
          <button
            onClick={() => setShowExport(true)}
            className="flex items-center gap-1.5 shrink-0 text-xs font-semibold text-primary border border-primary/30 bg-primary/5 px-3 py-2 rounded-xl active:scale-[0.97] transition-transform"
          >
            <FileDown className="w-3.5 h-3.5" />
            Export PDF
          </button>
        )}
      </div>

      {showExport && (
        <ExportHistoryModal
          locationId={activeLocationId}
          locationName={activeLocation?.name}
          onClose={() => setShowExport(false)}
        />
      )}

      {/* Inspection confidence bar */}
      {sessions.length > 0 && (
        <div className={`rounded-xl border p-3.5 flex items-center gap-3 ${
          flaggedRecent > 0
            ? "bg-amber-500/8 border-amber-500/20"
            : "bg-emerald-500/8 border-emerald-500/20"
        }`}>
          <ShieldCheck className={`w-5 h-5 shrink-0 ${flaggedRecent > 0 ? "text-amber-500" : "text-emerald-500"}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-bold ${flaggedRecent > 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"}`}>
              {flaggedRecent > 0 ? `${flaggedRecent} record${flaggedRecent !== 1 ? "s" : ""} with flagged items this week` : "No flagged items this week"}
            </p>
            <p className="text-xs text-muted-foreground">{last7.length} check{last7.length !== 1 ? "s" : ""} recorded in the last 7 days</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search checks, staff, or date..."
          className="w-full h-12 pl-10 pr-4 rounded-xl border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Empty states */}
      {sessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center space-y-2">
          <p className="text-sm font-semibold">No checks recorded yet</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Once a checklist is submitted, it will appear here as a permanent record.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-10">No results for "{search}"</p>
      ) : (
        <div className="space-y-6 pb-4">
          {sortedDates.map(date => (
            <div key={date}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-2">
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                  {formatDateLabel(date)}
                </p>
                <div className="flex-1 h-px bg-border" />
                <p className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
                  {grouped[date].length} check{grouped[date].length !== 1 ? "s" : ""}
                </p>
              </div>

              <div className="space-y-2">
                {grouped[date].map(s => (
                  <Link key={s.id} to={`/history/${s.id}`}>
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border active:scale-[0.98] transition-transform">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        s.status === "flagged" ? "bg-amber-500/12" : "bg-emerald-500/12"
                      }`}>
                        {s.status === "flagged"
                          ? <AlertTriangle className="w-4 h-4 text-amber-500" />
                          : <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{s.template_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.completed_by}
                          {s.completed_at && ` · ${format(new Date(s.completed_at), "HH:mm")}`}
                          {s.status === "flagged" && (
                            <span className="text-amber-500 font-semibold"> · issues noted</span>
                          )}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}