import { useEffect, useState } from "react";
import { seedDefaultTemplatesIfEmpty } from "@/lib/seedDefaultTemplates";
import { listKcTemplates, listKcSessions, listKcTemperatureLogs } from "@/lib/kitchencheckSupabase";
import {
  getLocalDevTemplates,
  getLocalDevSessions,
  getLocalDevTemperatureLogs,
} from "@/lib/localDevKitchenCheckData";
import { Link, useLocation as useRouterLocation } from "react-router-dom";
import { CheckCircle2, AlertTriangle, ChevronRight, Plus, ClipboardList, Thermometer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useLocation } from "@/lib/LocationContext";

const LOCAL_DEV_AUTH = import.meta.env.VITE_LOCAL_DEV_AUTH === 'true';

function normalizeKcSession(session) {
  const flagged = session.status === "issues_flagged";
  return {
    ...session,
    completed_at: session.submitted_at || session.completed_at,
    status: flagged ? "flagged" : "completed",
  };
}

export default function KCDashboard() {
  const { pathname } = useRouterLocation();
  const { activeLocationId, activeLocation, loading: locationLoading } = useLocation();
  const activeLocationName = activeLocation?.name || "";
  const [templates, setTemplates] = useState([]);
  const [todaySessions, setTodaySessions] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [todayTempCount, setTodayTempCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (locationLoading) return;
    setLoading(true);
    async function load() {
      try {
        let tmpl;
        let sessions;
        let tempLogs;

        if (LOCAL_DEV_AUTH) {
          tmpl = getLocalDevTemplates();
          sessions = getLocalDevSessions();
          tempLogs = getLocalDevTemperatureLogs();
        } else {
          await seedDefaultTemplatesIfEmpty();
          tmpl = await listKcTemplates();
          sessions = (await listKcSessions()).map(normalizeKcSession);
          tempLogs = await listKcTemperatureLogs();
        }

        // Filter by active location (templates with no location_id are shown for all)
        const active = tmpl.filter(t =>
          t.active !== false && (!t.location_id || !activeLocationId || t.location_id === activeLocationId)
        );
        setTemplates(active);
        const locationSessions = sessions.filter(s =>
          !s.location_id || !activeLocationId || s.location_id === activeLocationId
        );
        const todaysDone = locationSessions.filter(s => s.session_date === today);
        setTodaySessions(todaysDone);
        setRecentSessions(locationSessions.filter(s => s.session_date !== today).slice(0, 5));
        setTodayTempCount(tempLogs.filter(l => l.log_date === today && l.location_id === activeLocationId).length);
      } catch (err) {
        console.error("KCDashboard load failed:", err);
        setTemplates([]);
        setTodaySessions([]);
        setRecentSessions([]);
        setTodayTempCount(0);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [activeLocationId, locationLoading, pathname, today]);

  if (loading) return <LoadingSpinner />;

  // Sort templates in operational order: opening → cleaning/general → closing → other
  const TYPE_ORDER = { opening: 0, temperature: 1, delivery: 2, cleaning: 3, custom: 4, closing: 5 };
  const nameOrder = (name = "") => {
    const n = name.toLowerCase();
    if (n.includes("opening")) return 0;
    if (n.includes("closing")) return 5;
    return 3;
  };
  const sortTemplates = (arr) =>
    [...arr].sort((a, b) => {
      const ao = a.checklist_type in TYPE_ORDER ? TYPE_ORDER[a.checklist_type] : nameOrder(a.name);
      const bo = b.checklist_type in TYPE_ORDER ? TYPE_ORDER[b.checklist_type] : nameOrder(b.name);
      return ao - bo;
    });

  const completedTemplateIds = new Set(todaySessions.map(s => s.template_id));
  const pendingTemplates = sortTemplates(templates.filter(t => !completedTemplateIds.has(t.id)));
  const doneTemplates = sortTemplates(templates.filter(t => completedTemplateIds.has(t.id)));
  const allDone = templates.length > 0 && pendingTemplates.length === 0;
  const anyFlagged = todaySessions.some(s => s.status === "flagged");
  const hour = new Date().getHours();
  const isLateAndPending = pendingTemplates.length > 0 && hour >= 10;

  // Missed opening-check nudge: after 11am, if any opening-type check still pending
  const MISSED_HOUR = 11;
  const missedOpeningTemplates = hour >= MISSED_HOUR
    ? pendingTemplates.filter(t => t.checklist_type === "opening")
    : [];

  return (
    <div className="p-4 max-w-lg mx-auto space-y-5">

      {/* Date + status bar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {format(new Date(), "EEEE, d MMMM")}
            {activeLocationName ? ` · ${activeLocationName}` : ""}
          </p>
          <h1 className="text-xl font-bold leading-tight mt-0.5">Today's Checks</h1>
        </div>
        {templates.length > 0 && (
          <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${
            allDone && !anyFlagged
              ? "bg-emerald-500/15 text-emerald-600"
              : anyFlagged
              ? "bg-amber-500/15 text-amber-600"
              : "bg-muted text-muted-foreground"
          }`}>
            {allDone ? (anyFlagged ? "⚠ Issues noted" : "✓ All clear") : `${pendingTemplates.length} to do`}
          </div>
        )}
      </div>

      {/* MISSED OPENING CHECK — calm nudge after 11am */}
      {missedOpeningTemplates.length > 0 && (
        <div className="rounded-xl bg-amber-500/8 border border-amber-500/20 p-3.5 space-y-2">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                {missedOpeningTemplates.length === 1
                  ? `${missedOpeningTemplates[0].name} not yet recorded today`
                  : `${missedOpeningTemplates.length} opening checks not yet recorded today`}
              </p>
              <p className="text-xs text-amber-600/70 mt-0.5">
                {format(new Date(), "EEEE, d MMMM")} · {activeLocationName ? `${activeLocationName} · ` : ""}No record found yet
              </p>
            </div>
          </div>
          <div className="flex gap-2 pl-6">
            {missedOpeningTemplates.slice(0, 2).map(t => (
              <Link key={t.id} to={`/checklist/${t.id}`}>
                <button className="text-xs font-semibold text-amber-700 dark:text-amber-300 border border-amber-400/40 bg-amber-500/10 px-3 py-1.5 rounded-lg active:scale-[0.97] transition-transform">
                  Start: {t.name} →
                </button>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* OVERDUE NUDGE — non-opening checks after 10am */}
      {isLateAndPending && missedOpeningTemplates.length === 0 && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            {pendingTemplates.length === 1
              ? `${pendingTemplates[0].name} not yet recorded today`
              : `${pendingTemplates.length} checks not yet recorded today`}
          </p>
        </div>
      )}

      {templates.length === 0 ? (
        <EmptySetup />
      ) : (
        <>
          {/* PENDING — highest priority, full visual weight */}
          {pendingTemplates.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Due today</p>
              {pendingTemplates.map(t => (
                <Link key={t.id} to={`/checklist/${t.id}`}>
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-card border-2 border-primary/30 shadow-sm active:scale-[0.98] transition-transform">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <ClipboardList className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-base">{t.name}</p>
                      <p className="text-xs text-muted-foreground capitalize mt-0.5">
                        {t.checklist_type?.replace("_", " ")} · {t.items?.length || 0} items
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <ChevronRight className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* ALL DONE banner */}
          {allDone && !anyFlagged && (
            <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/25 p-4 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
              <div>
                <p className="font-semibold text-sm text-emerald-700 dark:text-emerald-400">All done for today</p>
                <p className="text-xs text-emerald-600/70 mt-0.5">No issues · records saved</p>
              </div>
            </div>
          )}

          {/* COMPLETED TODAY — de-emphasised but present */}
          {doneTemplates.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                Completed today
              </p>
              {doneTemplates.map(t => {
                const session = todaySessions.find(s => s.template_id === t.id);
                const flagged = session?.status === "flagged";
                return (
                  <Link key={t.id} to={session ? `/history/${session.id}` : "#"}>
                    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-secondary/30 border border-border active:scale-[0.98] transition-transform">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        flagged ? "bg-amber-500/15" : "bg-emerald-500/15"
                      }`}>
                        {flagged
                          ? <AlertTriangle className="w-4 h-4 text-amber-500" />
                          : <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground/70">{t.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {session?.completed_by}
                          {session?.completed_at && ` · ${format(new Date(session.completed_at), "HH:mm")}`}
                          {flagged && " · issues noted"}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* TEMP LOG SHORTCUT */}
      <Link to="/temp-log">
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border active:scale-[0.98] transition-transform">
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <Thermometer className="w-5 h-5 text-blue-500" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm">Temperature Log</p>
            <p className="text-xs text-muted-foreground">
              {todayTempCount > 0 ? `${todayTempCount} reading${todayTempCount !== 1 ? "s" : ""} today` : "Tap to log a reading"}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
        </div>
      </Link>

      {/* DIVIDER */}
      {recentSessions.length > 0 && <div className="h-px bg-border" />}

      {/* RECENT HISTORY */}
      {recentSessions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Recent history</p>
            <Link to="/history" className="text-xs text-primary font-semibold">View all →</Link>
          </div>
          {recentSessions.map(s => (
            <Link key={s.id} to={`/history/${s.id}`}>
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border active:scale-[0.98] transition-transform">
                <div className={`w-2 h-2 rounded-full shrink-0 ${s.status === "flagged" ? "bg-amber-500" : "bg-emerald-500"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.template_name}</p>
                  <p className="text-xs text-muted-foreground">{s.completed_by} · {s.session_date ? (() => { try { const d = new Date(s.session_date); const days = Math.round((new Date().setHours(0,0,0,0) - d.setHours(0,0,0,0)) / 86400000); return days === 1 ? "Yesterday" : days === 0 ? "Today" : format(new Date(s.session_date), "d MMM"); } catch { return s.session_date; } })() : ""}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptySetup() {
  return (
    <div className="rounded-2xl border border-dashed border-border p-8 text-center space-y-3">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center">
        <ClipboardList className="w-6 h-6 text-primary" />
      </div>
      <div>
        <p className="text-sm font-bold">No checklists added yet</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Go to Settings to add your opening, closing, or cleaning checks.
        </p>
      </div>
      <Link to="/settings">
        <Button className="mt-1 gap-2 h-11">
          <Plus className="w-4 h-4" /> Add checklists
        </Button>
      </Link>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );
}