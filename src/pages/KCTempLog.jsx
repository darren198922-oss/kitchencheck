import { useEffect, useState } from "react";
import {
  getLocalDevTemperatureLogs,
  createLocalDevTemperatureLog,
  deleteLocalDevTemperatureLog,
} from "@/lib/localDevKitchenCheckData";
import {
  listKcTemperatureLogs,
  createKcTemperatureLog,
  deleteKcTemperatureLog,
} from "@/lib/kitchencheckSupabase";
import { useAuth } from "@/lib/AuthContext";
import { ChevronLeft, Thermometer, CheckCircle2, Plus, Settings, Trash2 } from "lucide-react";
import { useNavigate, useLocation as useRouterLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { toast } from "sonner";
import { useLocation as useKCLocation } from "@/lib/LocationContext";

const LOCAL_DEV_AUTH = import.meta.env.VITE_LOCAL_DEV_AUTH === 'true';

const EQUIPMENT_KEY = "kc_equipment_list";
const DEFAULT_EQUIPMENT = [
  { name: "Main Fridge", enabled: true },
  { name: "Fridge 2", enabled: true },
  { name: "Main Freezer", enabled: true },
  { name: "Freezer 2", enabled: true },
  { name: "Hot Hold", enabled: true },
  { name: "Cooking Probe", enabled: true },
];
const SAFE_RANGES = {
  "Main Fridge": { min: 1, max: 8, label: "1–8°C" },
  "Fridge 2": { min: 1, max: 8, label: "1–8°C" },
  "Main Freezer": { min: -25, max: -18, label: "−25 to −18°C" },
  "Freezer 2": { min: -25, max: -18, label: "−25 to −18°C" },
  "Hot Hold": { min: 63, max: 99, label: "63°C+" },
  "Cooking Probe": { min: 75, max: 99, label: "75°C+" },
};

function getEquipmentList() {
  try { return JSON.parse(localStorage.getItem(EQUIPMENT_KEY) || "null") || DEFAULT_EQUIPMENT; } catch { return DEFAULT_EQUIPMENT; }
}
function saveEquipmentList(list) { localStorage.setItem(EQUIPMENT_KEY, JSON.stringify(list)); }

function isSafe(equipment, temp) {
  const range = SAFE_RANGES[equipment];
  if (!range || temp === null || temp === "") return null;
  const t = parseFloat(temp);
  return t >= range.min && t <= range.max;
}

// ── Equipment settings panel ──────────────────────────────
function EquipmentSettings({ onClose }) {
  const [list, setList] = useState(getEquipmentList);
  const [newName, setNewName] = useState("");

  const toggle = (idx) => {
    setList(prev => { const next = prev.map((e, i) => i === idx ? { ...e, enabled: !e.enabled } : e); saveEquipmentList(next); return next; });
  };
  const remove = (idx) => {
    setList(prev => { const next = prev.filter((_, i) => i !== idx); saveEquipmentList(next); return next; });
  };
  const add = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setList(prev => { const next = [...prev, { name: trimmed, enabled: true }]; saveEquipmentList(next); return next; });
    setNewName("");
  };

  return (
    <div className="p-4 max-w-lg mx-auto space-y-5 pt-4">
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="flex items-center gap-1 text-sm text-muted-foreground -ml-1">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <h2 className="text-lg font-bold">Equipment</h2>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">Enable the equipment you use. Add anything not listed.</p>

      <div className="space-y-2">
        {list.map((eq, idx) => (
          <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
            <button
              onClick={() => toggle(idx)}
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                eq.enabled ? "bg-primary border-primary" : "border-muted-foreground/40"
              }`}
            >
              {eq.enabled && <div className="w-2 h-2 rounded-full bg-white" />}
            </button>
            <span className={`flex-1 text-sm font-medium ${eq.enabled ? "" : "text-muted-foreground line-through"}`}>{eq.name}</span>
            {SAFE_RANGES[eq.name] && <span className="text-[10px] text-muted-foreground">{SAFE_RANGES[eq.name].label}</span>}
            {!SAFE_RANGES[eq.name] && (
              <button onClick={() => remove(idx)} className="text-xs text-destructive font-medium shrink-0">Remove</button>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Add equipment (e.g. Walk-In Cooler)"
          className="flex-1 h-11 px-3 rounded-xl border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          onKeyDown={e => e.key === "Enter" && add()}
        />
        <Button onClick={add} disabled={!newName.trim()} size="sm" className="h-11 px-4">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function KCTempLog() {
  const navigate = useNavigate();
  const { pathname } = useRouterLocation();
  const { user } = useAuth();
  const { activeLocationId, activeLocation } = useKCLocation();
  const [phase, setPhase] = useState("select");
  const [showSettings, setShowSettings] = useState(false);
  const [equipment, setEquipment] = useState("");
  const [customEquipment, setCustomEquipment] = useState("");
  const [displayValue, setDisplayValue] = useState("");
  const [isNegative, setIsNegative] = useState(false);
  const [staffName, setStaffName] = useState(() => {
    try { const r = JSON.parse(localStorage.getItem("kc_recent_staff") || "[]"); return r[0] || ""; } catch { return ""; }
  });
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [lastLog, setLastLog] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [equipmentList, setEquipmentList] = useState(getEquipmentList);

  const refreshEquipment = () => setEquipmentList(getEquipmentList());
  const [confirmDeleteLogId, setConfirmDeleteLogId] = useState(null);



  useEffect(() => {
    if (!activeLocationId) {
      setRecentLogs([]);
      return;
    }
    const today = format(new Date(), "yyyy-MM-dd");
    async function loadLogs() {
      try {
        const logs = LOCAL_DEV_AUTH
          ? getLocalDevTemperatureLogs()
          : await listKcTemperatureLogs();
        setRecentLogs(logs.filter(l => l.log_date === today && l.location_id === activeLocationId));
      } catch (err) {
        console.error("KCTempLog load failed:", err);
        setRecentLogs([]);
      }
    }
    loadLogs();
  }, [lastLog, activeLocationId, pathname]);

  const handleDeleteLog = async (id) => {
    try {
      if (LOCAL_DEV_AUTH) {
        deleteLocalDevTemperatureLog(id);
      } else {
        await deleteKcTemperatureLog(id);
      }
      setRecentLogs(prev => prev.filter(l => l.id !== id));
      toast.success("Temperature log deleted");
    } catch (err) {
      console.error("KCTempLog delete failed:", err);
      toast.error("Delete failed — please try again");
    } finally {
      setConfirmDeleteLogId(null);
    }
  };

  const activeEquipment = equipmentList.filter(e => e.enabled);
  const effectiveEquipment = equipment === "__custom__" ? customEquipment : equipment;
  const numericTemp = displayValue === "" ? null : parseFloat((isNegative ? "-" : "") + displayValue);
  const safeStatus = isSafe(effectiveEquipment, numericTemp);
  const range = SAFE_RANGES[effectiveEquipment];

  const handleDigit = (d) => {
    if (displayValue.length >= 5) return;
    if (d === "." && displayValue.includes(".")) return;
    if (d === "." && displayValue === "") { setDisplayValue("0."); return; }
    setDisplayValue(prev => prev + d);
  };
  const handleDelete = () => setDisplayValue(prev => prev.slice(0, -1));
  const handleToggleSign = () => setIsNegative(n => !n);

  const handleSave = async () => {
    if (!effectiveEquipment || numericTemp === null || !staffName.trim()) return;
    if (!activeLocationId) {
      toast.error("Please select a kitchen location in Settings before logging temperatures.");
      return;
    }
    if (!LOCAL_DEV_AUTH && !user?.id) {
      toast.error("You must be signed in to log temperatures.");
      return;
    }
    setSaving(true);
    setSaveError(false);
    try {
      const now = new Date().toISOString();
      const today = format(new Date(), "yyyy-MM-dd");
      const log = LOCAL_DEV_AUTH
        ? createLocalDevTemperatureLog({
            location_id: activeLocationId,
            equipment_name: effectiveEquipment,
            temperature: numericTemp,
            logged_by: staffName,
            logged_at: now,
            log_date: today,
            note: note.trim() || undefined,
          })
        : await createKcTemperatureLog({
            user_id: user.id,
            location_id: activeLocationId,
            equipment_name: effectiveEquipment,
            temperature: numericTemp,
            logged_by: staffName,
            logged_at: now,
            log_date: today,
            note: note.trim() || null,
          });
      setLastLog(log);
      setPhase("done");
    } catch (err) {
      console.error("KCTempLog save failed:", err);
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  const handleAnother = () => {
    setDisplayValue("");
    setIsNegative(false);
    setNote("");
    setSaveError(false);
    setPhase("select");
  };

  // Equipment settings overlay
  if (showSettings) {
    return <EquipmentSettings onClose={() => { refreshEquipment(); setShowSettings(false); }} />;
  }

  // PHASE: done
  if (phase === "done" && lastLog) {
    const safe = isSafe(lastLog.equipment_name, lastLog.temperature);
    return (
      <div className="p-4 max-w-lg mx-auto flex flex-col items-center gap-5 pt-8 text-center">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center border-2 ${
          safe === false ? "bg-red-500/10 border-red-400/30" : "bg-emerald-500/10 border-emerald-400/30"
        }`}>
          {safe === false ? <Thermometer className="w-9 h-9 text-red-500" /> : <CheckCircle2 className="w-9 h-9 text-emerald-500" />}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{lastLog.temperature > 0 ? "+" : ""}{lastLog.temperature}°C</h1>
          <p className="text-base font-semibold mt-1">{lastLog.equipment_name}</p>
          {safe === false && (
            <p className="text-sm font-bold text-red-500 mt-2">⚠ Outside safe range ({SAFE_RANGES[lastLog.equipment_name]?.label})</p>
          )}
          {safe === true && <p className="text-sm text-emerald-600 mt-1">Reading within safe range</p>}
          <p className="text-xs text-muted-foreground mt-2">{lastLog.logged_by} · {format(new Date(lastLog.logged_at), "HH:mm")}</p>
        </div>
        <div className="w-full space-y-2">
          <Button className="w-full h-14 text-base font-bold" onClick={handleAnother}>
            <Plus className="w-4 h-4" /> Log another reading
          </Button>
          <Button variant="secondary" className="w-full h-12" onClick={() => navigate("/")}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  // PHASE: select equipment
  if (phase === "select") {
    return (
      <div className="p-4 max-w-lg mx-auto space-y-5 pt-4">
        <div>
          <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4 -ml-1">
            <ChevronLeft className="w-4 h-4" /> Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Temperature Log</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeLocationId && activeLocation?.name
                  ? `Logging temperatures for: ${activeLocation.name}`
                  : "Select a kitchen location before logging temperatures."}
              </p>
            </div>
            <button onClick={() => setShowSettings(true)} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
              <Settings className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {activeEquipment.map(eq => {
            const r = SAFE_RANGES[eq.name];
            return (
              <button key={eq.name} onClick={() => { setEquipment(eq.name); setPhase("enter"); }}
                className="flex flex-col items-start gap-1 p-4 rounded-2xl bg-card border-2 border-border active:scale-[0.97] transition-transform text-left">
                <Thermometer className="w-5 h-5 text-primary" />
                <span className="text-sm font-bold">{eq.name}</span>
                {r && <span className="text-[10px] text-muted-foreground">{r.label}</span>}
              </button>
            );
          })}
          <button onClick={() => { setEquipment("__custom__"); setPhase("enter"); }}
            className="flex flex-col items-start gap-1 p-4 rounded-2xl bg-card border-2 border-dashed border-border active:scale-[0.97] transition-transform">
            <Plus className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-bold text-muted-foreground">Other</span>
            <span className="text-[10px] text-muted-foreground">Enter name</span>
          </button>
        </div>

        {recentLogs.length > 0 && (
          <div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Today's readings</p>
            <div className="space-y-1.5">
              {recentLogs.map(log => {
                const safe = isSafe(log.equipment_name, log.temperature);
                const isConfirming = confirmDeleteLogId === log.id;
                return (
                  <div key={log.id} className="rounded-xl bg-card border border-border overflow-hidden">
                    <div className="flex items-center gap-3 p-3">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${safe === false ? "bg-red-500" : safe === true ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{log.equipment_name}</p>
                        <p className="text-xs text-muted-foreground">{log.logged_by} · {format(new Date(log.logged_at), "HH:mm")}</p>
                      </div>
                      <span className={`text-sm font-bold tabular-nums ${safe === false ? "text-red-500" : "text-foreground"}`}>
                        {log.temperature > 0 ? "+" : ""}{log.temperature}°C
                      </span>
                      <button
                        onClick={() => setConfirmDeleteLogId(isConfirming ? null : log.id)}
                        className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {isConfirming && (
                      <div className="border-t border-destructive/20 bg-destructive/5 px-3 py-2.5 flex items-center justify-between gap-3">
                        <p className="text-xs text-destructive font-semibold">Delete this temperature log?</p>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => handleDeleteLog(log.id)} className="text-xs font-bold text-white bg-destructive px-3 py-1.5 rounded-lg active:scale-[0.97] transition-transform">Delete</button>
                          <button onClick={() => setConfirmDeleteLogId(null)} className="text-xs font-semibold text-muted-foreground border border-border px-3 py-1.5 rounded-lg">Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // PHASE: enter temperature
  return (
    <div className="flex flex-col max-w-lg mx-auto" style={{ height: "calc(100dvh - 112px)" }}>
      <div className="px-4 pt-4 pb-2">
        <button onClick={() => setPhase("select")} className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3 -ml-1">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">{effectiveEquipment || "Custom equipment"}</h2>
            {range && <p className="text-xs text-muted-foreground">Target: {range.label}</p>}
          </div>
          {numericTemp !== null && safeStatus !== null && (
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              safeStatus ? "bg-emerald-500/15 text-emerald-600" : "bg-red-500/15 text-red-600"
            }`}>
              {safeStatus ? "Within range" : "Out of range"}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col px-4 gap-3 overflow-hidden">
        {equipment === "__custom__" && (
          <input type="text" value={customEquipment} onChange={e => setCustomEquipment(e.target.value)}
            placeholder="Equipment name (e.g. Display Fridge)"
            className="w-full h-11 px-3 rounded-xl border-2 border-input bg-card text-sm focus:outline-none focus:border-primary"
            autoFocus />
        )}

        <div className={`rounded-2xl border-2 p-4 text-center ${
          safeStatus === false ? "border-red-400/50 bg-red-500/5" :
          safeStatus === true ? "border-emerald-400/50 bg-emerald-500/5" :
          "border-border bg-card"
        }`}>
          <p className="text-5xl font-bold tabular-nums tracking-tight">
            {displayValue === "" ? "—" : `${isNegative ? "−" : ""}${displayValue}°C`}
          </p>
        </div>

        <div className="relative">
          <input type="text" value={staffName} onChange={e => setStaffName(e.target.value)} placeholder="Your name"
            className="w-full h-11 px-3 pr-24 rounded-xl border-2 border-input bg-card text-sm focus:outline-none focus:border-primary" />
          {staffName.trim() && (
            <button
              onClick={() => setStaffName("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-primary font-bold"
            >
              Not you?
            </button>
          )}
        </div>

        {/* + / - segmented control */}
        <div className="flex rounded-xl border-2 border-border overflow-hidden">
          <button
            onClick={() => setIsNegative(false)}
            className={`flex-1 h-12 text-base font-bold transition-colors ${
              !isNegative
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground"
            }`}
          >
            + Above zero
          </button>
          <button
            onClick={() => setIsNegative(true)}
            className={`flex-1 h-12 text-base font-bold transition-colors border-l-2 border-border ${
              isNegative
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground"
            }`}
          >
            − Below zero
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground text-center -mt-1">
          Use + for fridge/chilled readings and − for freezer readings.
        </p>

        <div className="grid grid-cols-3 gap-2 flex-1">
          {["1","2","3","4","5","6","7","8","9"].map(d => (
            <button key={d} onClick={() => handleDigit(d)}
              className="rounded-xl bg-card border border-border text-xl font-bold active:bg-secondary active:scale-[0.95] transition-all h-14">
              {d}
            </button>
          ))}
          <button onClick={() => handleDigit(".")} className="rounded-xl bg-card border border-border text-xl font-bold active:bg-secondary active:scale-[0.95] transition-all h-14 text-muted-foreground">.</button>
          <button onClick={() => handleDigit("0")} className="rounded-xl bg-card border border-border text-xl font-bold active:bg-secondary active:scale-[0.95] transition-all h-14">0</button>
          <button onClick={handleDelete} className="rounded-xl bg-card border border-border text-base font-bold active:bg-secondary active:scale-[0.95] transition-all h-14 text-muted-foreground">⌫</button>
        </div>

        <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)"
          className="w-full h-10 px-3 rounded-xl border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring" />

        {saveError && (
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-red-500/10 border border-red-400/30">
            <p className="text-xs text-red-600 font-semibold">Save failed — check signal</p>
            <button onClick={handleSave} className="text-xs text-primary font-bold underline">Retry</button>
          </div>
        )}

        <Button
          className="w-full h-14 text-base font-bold"
          disabled={!effectiveEquipment || numericTemp === null || !staffName.trim() || saving || (equipment === "__custom__" && !customEquipment.trim())}
          onClick={handleSave}
        >
          {saving ? "Saving…" : "Save Reading"}
        </Button>
      </div>
    </div>
  );
}