import { useEffect, useState } from "react";
import { seedDefaultTemplatesIfEmpty } from "@/lib/seedDefaultTemplates";
import {
  getLocalDevTemplates,
  clearLocalDevDataForLocation,
} from "@/lib/localDevKitchenCheckData";
import {
  listKcTemplates,
  createKcTemplate,
  updateKcTemplate,
  deleteKcTemplate,
  listKcSessions,
  deleteKcCheckItemsBySessionId,
  deleteKcSession,
  listKcTemperatureLogs,
  deleteKcTemperatureLog,
} from "@/lib/kitchencheckSupabase";
import { Plus, Trash2, ChevronDown, ChevronUp, ToggleLeft, ToggleRight, MapPin, ExternalLink, AlertTriangle, FileDown, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useLocation } from "@/lib/LocationContext";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

const LOCAL_DEV_AUTH = import.meta.env.VITE_LOCAL_DEV_AUTH === 'true';

const TYPE_OPTIONS = [
  { value: "opening", label: "Daily Opening" },
  { value: "closing", label: "Daily Closing" },
  { value: "delivery", label: "Delivery Check" },
  { value: "cleaning", label: "Cleaning Check" },
  { value: "temperature", label: "Temperature Log" },
  { value: "custom", label: "Custom" },
];

const DEFAULT_ITEMS = {
  opening: [
    "All fridges and freezers at correct temperature?",
    "Handwashing facilities stocked and accessible?",
    "All surfaces cleaned and sanitised?",
    "Date labels checked and in-date items only in use?",
    "Personal protective equipment available?",
    "Pest control — no signs of pests?",
  ],
  closing: [
    "All food stored correctly and covered?",
    "All surfaces cleaned and sanitised?",
    "Bins emptied and areas clean?",
    "Fridges and freezers checked and secure?",
    "All equipment turned off or secured?",
  ],
  delivery: [
    "Supplier vehicle temperature acceptable?",
    "All packaging intact — no damage or leaks?",
    "Use-by/best-before dates checked?",
    "Temperature of chilled/frozen items checked on receipt?",
    "Delivery matches purchase order?",
  ],
  cleaning: [
    "All cooking equipment cleaned?",
    "Work surfaces cleaned and sanitised?",
    "Floor cleaned including under equipment?",
    "Fridges and freezers cleaned internally?",
    "Bins cleaned and sanitised?",
  ],
  temperature: [
    "Main fridge temperature recorded?",
    "Freezer temperature recorded?",
    "Hot holding equipment at correct temperature?",
    "Cooked food cooled and stored correctly?",
  ],
  custom: ["Item 1", "Item 2"],
};

function DeleteLocationPanel() {
  const navigate = useNavigate();
  const { activeLocationId, activeLocation, deleteLocation } = useLocation();
  const [step, setStep] = useState("idle"); // idle | warn | confirm
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const locationName = activeLocation?.name || "this location";
  const canDelete = confirmText.trim().toUpperCase() === "DELETE LOCATION";

  if (!activeLocationId) return null;

  const handleDelete = async () => {
    if (!canDelete || !activeLocationId) return;
    setDeleting(true);
    try {
      if (LOCAL_DEV_AUTH) {
        clearLocalDevDataForLocation(activeLocationId);
      }

      const { remaining } = await deleteLocation(activeLocationId);

      if (remaining.length > 0) {
        toast.success("Location deleted. Connected records for this location were removed.");
      } else {
        toast.success("Location deleted. Connected records for this location were removed.");
        navigate("/settings");
      }

      setStep("idle");
      setConfirmText("");
    } catch (err) {
      console.error("DeleteLocationPanel delete failed:", err);
      toast.error("Delete failed — please try again");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Delete location</p>
      <div className="rounded-xl bg-card border border-destructive/25 p-4 space-y-3">

        {step === "idle" && (
          <>
            <div className="flex items-start gap-2.5">
              <Trash2 className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Delete {locationName}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Permanently removes this location and all its connected kitchen records. This cannot be undone.
                </p>
              </div>
            </div>
            <button
              onClick={() => setStep("warn")}
              className="w-full h-10 rounded-xl border border-destructive/40 text-destructive text-sm font-semibold bg-destructive/5 active:scale-[0.98] transition-transform"
            >
              Delete this location…
            </button>
          </>
        )}

        {step === "warn" && (
          <div className="space-y-4">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <p className="text-sm font-bold text-amber-700 dark:text-amber-400">Export your records first</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Before deleting this location, download an Export History PDF if you may need these records later.
                  Deleting this location will remove its check history, checklist answers, temperature logs, and location setup.
                  This cannot be undone.
                </p>
              </div>
            </div>
            <Link
              to="/history"
              className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-primary/40 bg-primary/5 text-primary text-sm font-semibold active:scale-[0.98] transition-transform"
            >
              <FileDown className="w-4 h-4" /> Go to History to Export PDF first
            </Link>
            <div className="flex gap-2">
              <button
                onClick={() => setStep("confirm")}
                className="flex-1 h-11 rounded-xl border border-destructive/40 text-destructive text-sm font-semibold bg-destructive/5 active:scale-[0.98] transition-transform"
              >
                Continue to delete
              </button>
              <Button variant="secondary" className="flex-1 h-11" onClick={() => setStep("idle")}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-3">
            <p className="text-sm font-bold text-destructive">Delete {locationName}?</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This will permanently delete this location and its connected kitchen records.
              Check sessions, checklist answers, and temperature logs for this location will be removed.
              Checklist templates are shared across all sites and will not be deleted.
              This cannot be undone.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Type DELETE LOCATION to confirm</label>
              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="DELETE LOCATION"
                className="w-full h-11 px-3 rounded-xl border-2 border-destructive/40 bg-card text-sm font-mono focus:outline-none focus:border-destructive"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                className="flex-1 h-11"
                disabled={!canDelete || deleting}
                onClick={handleDelete}
              >
                {deleting ? "Deleting…" : "Delete location"}
              </Button>
              <Button
                variant="secondary"
                className="flex-1 h-11"
                onClick={() => { setStep("idle"); setConfirmText(""); }}
                disabled={deleting}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PracticeDataCleanup() {
  const { activeLocationId, activeLocation } = useLocation();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const locationName = activeLocation?.name || "this location";
  const canDelete = confirmText.trim().toUpperCase() === "DELETE";

  const handleCleanup = async () => {
    if (!canDelete || !activeLocationId) return;
    setDeleting(true);
    try {
      if (LOCAL_DEV_AUTH) {
        clearLocalDevDataForLocation(activeLocationId);
      } else {
        const allSessions = await listKcSessions();
        const locationSessions = allSessions.filter(s => s.location_id === activeLocationId);

        for (const session of locationSessions) {
          await deleteKcCheckItemsBySessionId(session.id);
          await deleteKcSession(session.id);
        }

        const allLogs = await listKcTemperatureLogs();
        const logsToDelete = allLogs.filter(l => l.location_id === activeLocationId);
        for (const log of logsToDelete) {
          await deleteKcTemperatureLog(log.id);
        }
      }

      toast.success(`Practice records deleted for ${locationName}`);
      setShowConfirm(false);
      setConfirmText("");
    } catch (err) {
      console.error("PracticeDataCleanup failed:", err);
      toast.error("Cleanup failed — please try again");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Practice data cleanup</p>
      <div className="rounded-xl bg-card border border-border p-4 space-y-3">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold">Delete practice records for {locationName}</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Use this only before real testing or setup. Removes check history, checklist answers, and temperature logs for this location only. Templates and locations will remain.
            </p>
          </div>
        </div>

        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="w-full h-10 rounded-xl border border-destructive/40 text-destructive text-sm font-semibold bg-destructive/5 active:scale-[0.98] transition-transform"
          >
            Delete practice records…
          </button>
        ) : (
          <div className="space-y-3 pt-1">
            <p className="text-xs text-destructive font-semibold leading-relaxed">
              This will remove all check sessions, checklist answers, and temperature logs for <strong>{locationName}</strong>. Templates and locations will not be affected. This cannot be undone.
            </p>
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted-foreground">Type DELETE to confirm</label>
              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full h-11 px-3 rounded-xl border-2 border-destructive/40 bg-card text-sm font-mono focus:outline-none focus:border-destructive"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                className="flex-1 h-11"
                disabled={!canDelete || deleting || !activeLocationId}
                onClick={handleCleanup}
              >
                {deleting ? "Deleting…" : "Delete practice records"}
              </Button>
              <Button
                variant="secondary"
                className="flex-1 h-11"
                onClick={() => { setShowConfirm(false); setConfirmText(""); }}
                disabled={deleting}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LogoutSection() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError("");
    localStorage.removeItem("kc_active_location_id");
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("KCSettings logout failed:", err);
      setLogoutError(err.message || "Logout failed. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Account</p>
      <div className="rounded-xl bg-card border border-border p-4">
        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="flex items-center gap-2.5 text-sm font-semibold text-destructive w-full"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Log out
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold">Log out of KitchenCheck?</p>
            <p className="text-xs text-muted-foreground">Your records, templates, and locations will still be here when you log back in.</p>
            {logoutError && (
              <p className="text-xs text-red-600 font-medium">{logoutError}</p>
            )}
            <div className="flex gap-2">
              <Button variant="destructive" className="flex-1 h-11" onClick={handleLogout} disabled={loggingOut}>
                {loggingOut ? "Logging out…" : "Log out"}
              </Button>
              <Button variant="secondary" className="flex-1 h-11" onClick={() => setConfirming(false)} disabled={loggingOut}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AboutSection() {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">About</p>
      <div className="rounded-xl bg-card border border-border divide-y divide-border">
        <Link to="/pricing" className="flex items-center justify-between px-4 py-3 active:bg-secondary transition-colors">
          <span className="text-sm font-medium">Pricing</span>
          <ExternalLink className="w-4 h-4 text-muted-foreground" />
        </Link>
        <Link to="/privacy" className="flex items-center justify-between px-4 py-3 active:bg-secondary transition-colors">
          <span className="text-sm font-medium">Privacy Policy</span>
          <ExternalLink className="w-4 h-4 text-muted-foreground" />
        </Link>
        <Link to="/terms" className="flex items-center justify-between px-4 py-3 active:bg-secondary transition-colors">
          <span className="text-sm font-medium">Terms of Service</span>
          <ExternalLink className="w-4 h-4 text-muted-foreground" />
        </Link>
        <Link to="/cookies" className="flex items-center justify-between px-4 py-3 active:bg-secondary transition-colors">
          <span className="text-sm font-medium">Cookie Policy</span>
          <ExternalLink className="w-4 h-4 text-muted-foreground" />
        </Link>
        <a href="mailto:hello@kitchencheck.app" className="flex items-center justify-between px-4 py-3 active:bg-secondary transition-colors">
          <span className="text-sm font-medium">Contact & Support</span>
          <ExternalLink className="w-4 h-4 text-muted-foreground" />
        </a>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed px-1">
        KitchenCheck helps organise operational kitchen records. It does not provide legal advice, food safety advice, certification, or a guarantee of compliance. Your business remains responsible for following appropriate food safety procedures, training, and legal requirements.
      </p>
    </div>
  );
}

function LocationSettings() {
  const { locations, activeLocationId, setActiveLocationId, createLocation, updateLocation } = useLocation();
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const addLocation = async () => {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    try {
      await createLocation({ name });
      setNewName("");
      toast.success("Kitchen added");
    } catch (err) {
      console.error("LocationSettings add failed:", err);
      toast.error("Couldn't add kitchen — please try again");
    } finally {
      setSaving(false);
    }
  };

  const toggleLocation = async (loc) => {
    try {
      await updateLocation(loc.id, { active: !(loc.active !== false) });
    } catch (err) {
      console.error("LocationSettings toggle failed:", err);
      toast.error("Couldn't update kitchen — please try again");
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Kitchens / Sites</p>
      {locations.length === 0 && (
        <p className="text-xs text-muted-foreground">No kitchens added yet. Add your first site below.</p>
      )}
      {locations.map(loc => (
        <div key={loc.id} className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border">
          <MapPin className="w-4 h-4 text-primary shrink-0" />
          <span className={`flex-1 text-sm font-medium ${loc.active === false ? "text-muted-foreground line-through" : ""}`}>{loc.name}</span>
          {loc.id === activeLocationId && (
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Active</span>
          )}
          {loc.id !== activeLocationId && loc.active !== false && (
            <button onClick={() => setActiveLocationId(loc.id)} className="text-[10px] text-muted-foreground font-semibold underline shrink-0">Switch</button>
          )}
          <button onClick={() => toggleLocation(loc)} className="shrink-0">
            {loc.active !== false
              ? <ToggleRight className="w-6 h-6 text-primary" />
              : <ToggleLeft className="w-6 h-6 text-muted-foreground" />
            }
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Add kitchen name (e.g. High Street Site)"
          className="flex-1 h-11 px-3 rounded-xl border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          onKeyDown={e => e.key === "Enter" && addLocation()}
        />
        <Button onClick={addLocation} disabled={!newName.trim() || saving} size="sm" className="h-11 px-4">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export default function KCSettings() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", checklist_type: "opening", items: [] });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    async function loadTemplates() {
      setLoading(true);
      setLoadError(null);
      try {
        if (LOCAL_DEV_AUTH) {
          setTemplates(getLocalDevTemplates());
        } else {
          await seedDefaultTemplatesIfEmpty();
          const data = await listKcTemplates();
          setTemplates(data);
        }
      } catch (err) {
        console.error("KCSettings loadTemplates failed:", err);
        setLoadError("Couldn't load checklists. Please refresh and try again.");
        setTemplates([]);
      } finally {
        setLoading(false);
      }
    }
    loadTemplates();
  }, []);

  const handleTypeChange = (type) => {
    setForm(f => ({
      ...f,
      checklist_type: type,
      name: f.name || TYPE_OPTIONS.find(o => o.value === type)?.label || "",
      items: DEFAULT_ITEMS[type] || [],
    }));
  };

  const handleSave = async () => {
    if (LOCAL_DEV_AUTH) {
      toast.error("Template editing is disabled in local migration mode.");
      return;
    }
    if (!form.name.trim() || form.items.length === 0) return;
    if (!user?.id) {
      toast.error("You must be signed in to create a checklist.");
      return;
    }
    setSaving(true);
    try {
      const created = await createKcTemplate({
        user_id: user.id,
        name: form.name.trim(),
        checklist_type: form.checklist_type,
        items: form.items.filter(i => i.trim()),
        active: true,
        location_id: null,
        is_default: false,
      });
      setTemplates(prev => [...prev, created]);
      setForm({ name: "", checklist_type: "opening", items: [] });
      setShowForm(false);
      toast.success("Checklist created");
    } catch (err) {
      console.error("KCSettings create template failed:", err);
      toast.error("Couldn't save checklist — please try again");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (tmpl) => {
    if (LOCAL_DEV_AUTH) {
      toast.error("Template editing is disabled in local migration mode.");
      return;
    }
    try {
      await updateKcTemplate(tmpl.id, { active: !tmpl.active });
      setTemplates(prev => prev.map(t => t.id === tmpl.id ? { ...t, active: !t.active } : t));
    } catch (err) {
      console.error("KCSettings toggle template failed:", err);
      toast.error("Couldn't update checklist — please try again");
    }
  };

  const deleteTemplate = async (id) => {
    if (LOCAL_DEV_AUTH) {
      toast.error("Template editing is disabled in local migration mode.");
      return;
    }
    try {
      await deleteKcTemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
      toast.success("Checklist deleted");
    } catch (err) {
      console.error("KCSettings delete template failed:", err);
      toast.error("Couldn't delete checklist — please try again");
    }
  };

  const updateItem = (idx, value) => {
    setForm(f => ({ ...f, items: f.items.map((item, i) => i === idx ? value : item) }));
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, ""] }));
  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6 pb-8">
      <h1 className="text-xl font-bold">Settings</h1>

      {loadError && (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 p-3">
          <p className="text-xs text-amber-700 dark:text-amber-400">{loadError}</p>
        </div>
      )}

      <LocationSettings />

      <div className="h-px bg-border" />

      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Checklists</p>
        {!showForm && !LOCAL_DEV_AUTH && (
          <Button size="sm" onClick={() => { setShowForm(true); handleTypeChange("opening"); }} className="gap-1.5">
            <Plus className="w-4 h-4" /> New
          </Button>
        )}
      </div>

      {LOCAL_DEV_AUTH && (
        <div className="rounded-xl bg-secondary/50 border border-border p-3">
          <p className="text-xs text-muted-foreground">
            Template editing is disabled in local migration mode.
          </p>
        </div>
      )}

      {/* New template form */}
      {showForm && !LOCAL_DEV_AUTH && (
        <div className="rounded-2xl bg-card border border-border p-5 space-y-4">
          <h2 className="text-sm font-semibold">New Checklist Template</h2>

          {/* Type selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleTypeChange(opt.value)}
                  className={`h-11 rounded-xl text-sm font-medium border transition-colors ${
                    form.checklist_type === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary text-secondary-foreground border-transparent"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Items */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Checklist items</label>
            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={item}
                    onChange={e => updateItem(idx, e.target.value)}
                    className="flex-1 h-10 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button onClick={() => removeItem(idx)} className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addItem} className="text-xs text-primary font-medium flex items-center gap-1 mt-1">
              <Plus className="w-3.5 h-3.5" /> Add item
            </button>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button className="flex-1" disabled={saving || !form.name.trim() || form.items.filter(i => i.trim()).length === 0} onClick={handleSave}>
              {saving ? "Saving..." : "Save Checklist"}
            </Button>
          </div>
        </div>
      )}

      {/* Existing templates */}
      {templates.length === 0 && !showForm ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">No checklists yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create your first checklist template above</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map(tmpl => (
            <div key={tmpl.id} className="rounded-2xl bg-card border border-border overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{tmpl.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{tmpl.checklist_type?.replace("_", " ")} · {tmpl.items?.length || 0} items</p>
                </div>
                <button onClick={() => toggleActive(tmpl)} className="shrink-0" disabled={LOCAL_DEV_AUTH}>
                  {tmpl.active !== false
                    ? <ToggleRight className="w-7 h-7 text-primary" />
                    : <ToggleLeft className="w-7 h-7 text-muted-foreground" />
                  }
                </button>
                <button onClick={() => setExpandedId(expandedId === tmpl.id ? null : tmpl.id)} className="shrink-0 p-1">
                  {expandedId === tmpl.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>

              {expandedId === tmpl.id && (
                <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
                  <div className="space-y-1.5">
                    {(tmpl.items || []).map((item, i) => (
                      <p key={i} className="text-xs text-muted-foreground flex gap-2">
                        <span className="text-primary font-semibold">{i + 1}.</span> {item}
                      </p>
                    ))}
                  </div>
                  {!LOCAL_DEV_AUTH && (
                    <button
                      onClick={() => deleteTemplate(tmpl.id)}
                      className="flex items-center gap-1.5 text-xs text-destructive font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete template
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="h-px bg-border" />

      <PracticeDataCleanup />

      <div className="h-px bg-border" />

      <DeleteLocationPanel />

      <div className="h-px bg-border" />

      <LogoutSection />

      <div className="h-px bg-border" />

      <AboutSection />
    </div>
  );
}