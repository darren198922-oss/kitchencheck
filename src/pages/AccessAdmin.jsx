import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { format, parseISO, differenceInDays, isAfter } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Shield, Pencil, X, Save } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";

const ACCESS_MODES = [
  { value: "active_trial", label: "Trial Active" },
  { value: "active_paid", label: "Active (Paid)" },
  { value: "beta_free", label: "Beta Free" },
  { value: "comped", label: "Comped" },
  { value: "grandfathered", label: "Grandfathered" },
  { value: "expired", label: "Expired" },
  { value: "inactive", label: "Inactive" },
];

const OVERRIDE_TYPES = [
  { value: "none", label: "None" },
  { value: "discount_percent", label: "Discount %" },
  { value: "discount_gbp", label: "Discount £" },
  { value: "pilot_pricing", label: "Pilot Pricing" },
  { value: "free_access", label: "Free Access" },
  { value: "comped", label: "Comped" },
  { value: "custom", label: "Custom" },
];

const TRIAL_DURATIONS = [30, 60, 90];

const modeBadgeStyle = {
  active_trial: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  active_paid: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  beta_free: "bg-primary/15 text-primary border-primary/30",
  comped: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  grandfathered: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  expired: "bg-red-500/15 text-red-400 border-red-500/30",
  inactive: "bg-muted text-muted-foreground border-border",
};

const BLANK_FORM = {
  user_email: "",
  user_name: "",
  access_mode: "active_trial",
  trial_start_date: format(new Date(), "yyyy-MM-dd"),
  trial_end_date: "",
  trial_duration_days: 30,
  founder_override: false,
  override_reason: "",
  override_type: "none",
  discount_percent: "",
  discount_gbp: "",
  pilot_pricing_note: "",
  approved_by: "",
  internal_notes: "",
  billing_ready: false,
};

export default function AccessAdmin() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const me = await base44.auth.me();
      setUser(me);
      if (me.role !== "admin") {
        navigate("/");
        return;
      }
      const data = await base44.entities.AccountAccess.list("-created_date", 200);
      setRecords(data);
      setLoading(false);
    }
    load();
  }, []);

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleTrialDuration = (days) => {
    const start = form.trial_start_date || format(new Date(), "yyyy-MM-dd");
    const startDate = parseISO(start);
    const end = new Date(startDate);
    end.setDate(end.getDate() + Number(days));
    update("trial_duration_days", days);
    update("trial_end_date", format(end, "yyyy-MM-dd"));
  };

  const handleEdit = (rec) => {
    setEditingId(rec.id);
    setForm({
      user_email: rec.user_email || "",
      user_name: rec.user_name || "",
      access_mode: rec.access_mode || "active_trial",
      trial_start_date: rec.trial_start_date || format(new Date(), "yyyy-MM-dd"),
      trial_end_date: rec.trial_end_date || "",
      trial_duration_days: rec.trial_duration_days || 30,
      founder_override: rec.founder_override || false,
      override_reason: rec.override_reason || "",
      override_type: rec.override_type || "none",
      discount_percent: rec.discount_percent || "",
      discount_gbp: rec.discount_gbp || "",
      pilot_pricing_note: rec.pilot_pricing_note || "",
      approved_by: rec.approved_by || "",
      internal_notes: rec.internal_notes || "",
      billing_ready: rec.billing_ready || false,
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(BLANK_FORM);
  };

  const handleSave = async () => {
    if (!form.user_email) { toast.error("User email is required"); return; }
    setSaving(true);
    const payload = {
      ...form,
      trial_duration_days: Number(form.trial_duration_days) || null,
      discount_percent: form.discount_percent !== "" ? Number(form.discount_percent) : null,
      discount_gbp: form.discount_gbp !== "" ? Number(form.discount_gbp) : null,
    };
    if (editingId) {
      await base44.entities.AccountAccess.update(editingId, payload);
      setRecords(prev => prev.map(r => r.id === editingId ? { ...r, ...payload } : r));
      toast.success("Access record updated");
    } else {
      const created = await base44.entities.AccountAccess.create(payload);
      setRecords(prev => [created, ...prev]);
      toast.success("Access record created");
    }
    setSaving(false);
    handleCancel();
  };

  const handleDelete = async (id) => {
    await base44.entities.AccountAccess.delete(id);
    setRecords(prev => prev.filter(r => r.id !== id));
    toast.success("Record removed");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const now = new Date();

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5 text-primary" />
        </div>
        <PageHeader
          title="Access Control"
          description="Founder-only — manage trials, beta access, and overrides"
        />
      </div>

      {/* Warning strip */}
      <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3">
        <p className="text-xs text-amber-400 font-semibold">Billing not yet enabled — internal governance only</p>
        <p className="text-xs text-amber-400/70 mt-0.5">No charges are being made. This panel is for tracking access modes and founder overrides only.</p>
      </div>

      {/* Add / Edit Form */}
      {showForm ? (
        <div className="rounded-2xl bg-card border border-border p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">{editingId ? "Edit Access Record" : "New Access Record"}</h2>
            <button onClick={handleCancel}><X className="w-4 h-4 text-muted-foreground" /></button>
          </div>

          {/* Identity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">User Email *</Label>
              <Input value={form.user_email} onChange={e => update("user_email", e.target.value)} placeholder="user@example.com" className="h-10 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Display Name</Label>
              <Input value={form.user_name} onChange={e => update("user_name", e.target.value)} placeholder="Business / name" className="h-10 text-sm" />
            </div>
          </div>

          {/* Access Mode */}
          <div className="space-y-1.5">
            <Label className="text-xs">Access Mode *</Label>
            <Select value={form.access_mode} onValueChange={v => update("access_mode", v)}>
              <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACCESS_MODES.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Trial Dates */}
          {["active_trial", "beta_free"].includes(form.access_mode) && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Trial Start Date</Label>
                <Input type="date" value={form.trial_start_date} onChange={e => update("trial_start_date", e.target.value)} className="h-10 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Duration (quick-set)</Label>
                <div className="flex gap-2">
                  {TRIAL_DURATIONS.map(d => (
                    <Button key={d} type="button" size="sm" variant={form.trial_duration_days === d ? "default" : "secondary"}
                      onClick={() => handleTrialDuration(d)} className="text-xs h-8">
                      {d}d
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Trial End Date</Label>
                <Input type="date" value={form.trial_end_date} onChange={e => update("trial_end_date", e.target.value)} className="h-10 text-sm" />
              </div>
            </div>
          )}

          {/* Founder Override */}
          <div className="rounded-xl bg-secondary/50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="fo" checked={form.founder_override} onChange={e => update("founder_override", e.target.checked)} className="accent-primary" />
              <Label htmlFor="fo" className="text-xs cursor-pointer">Founder override active</Label>
            </div>
            {form.founder_override && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Override Type</Label>
                    <Select value={form.override_type} onValueChange={v => update("override_type", v)}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {OVERRIDE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Approved By</Label>
                    <Input value={form.approved_by} onChange={e => update("approved_by", e.target.value)} placeholder="Founder / Ads / staff" className="h-9 text-xs" />
                  </div>
                </div>
                {form.override_type === "discount_percent" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Discount %</Label>
                    <Input type="number" min="0" max="100" value={form.discount_percent} onChange={e => update("discount_percent", e.target.value)} placeholder="e.g. 50" className="h-9 text-sm" />
                  </div>
                )}
                {form.override_type === "discount_gbp" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Discount £</Label>
                    <Input type="number" min="0" value={form.discount_gbp} onChange={e => update("discount_gbp", e.target.value)} placeholder="e.g. 5.00" className="h-9 text-sm" />
                  </div>
                )}
                {form.override_type === "pilot_pricing" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Pilot Pricing Note (internal)</Label>
                    <Input value={form.pilot_pricing_note} onChange={e => update("pilot_pricing_note", e.target.value)} placeholder="e.g. agreed £X/mo for 6 months" className="h-9 text-sm" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs">Override Reason (internal)</Label>
                  <Textarea value={form.override_reason} onChange={e => update("override_reason", e.target.value)} placeholder="Why this override was granted..." className="min-h-[60px] text-xs" />
                </div>
              </>
            )}
          </div>

          {/* Internal notes */}
          <div className="space-y-1.5">
            <Label className="text-xs">Internal Notes</Label>
            <Textarea value={form.internal_notes} onChange={e => update("internal_notes", e.target.value)} placeholder="Any additional context for the founder..." className="min-h-[60px] text-xs" />
          </div>

          {/* Billing ready flag */}
          <div className="flex items-center gap-2">
            <input type="checkbox" id="br" checked={form.billing_ready} onChange={e => update("billing_ready", e.target.checked)} className="accent-primary" />
            <Label htmlFor="br" className="text-xs cursor-pointer">Mark billing as live for this account</Label>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full h-11 font-semibold gap-2">
            <Save className="w-4 h-4" /> {saving ? "Saving..." : editingId ? "Update Record" : "Create Record"}
          </Button>
        </div>
      ) : (
        <Button onClick={() => setShowForm(true)} variant="secondary" className="gap-2 w-full h-11">
          <Plus className="w-4 h-4" /> Add Access Record
        </Button>
      )}

      {/* Records list */}
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{records.length} account{records.length !== 1 ? "s" : ""} tracked</p>
        {records.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">No access records yet</p>
            <p className="text-xs text-muted-foreground mt-1">Add one above to start tracking beta testers and trial users</p>
          </div>
        )}
        {records.map(rec => {
          const expired = rec.access_mode === "expired" || rec.access_mode === "inactive";
          let daysLeft = null;
          if (rec.trial_end_date && ["active_trial", "beta_free"].includes(rec.access_mode)) {
            const end = parseISO(rec.trial_end_date);
            if (isAfter(end, now)) daysLeft = differenceInDays(end, now);
          }
          return (
            <div key={rec.id} className="rounded-xl bg-card border border-border p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{rec.user_name || rec.user_email}</p>
                    <Badge variant="outline" className={`text-xs ${modeBadgeStyle[rec.access_mode] || ""}`}>
                      {ACCESS_MODES.find(m => m.value === rec.access_mode)?.label || rec.access_mode}
                    </Badge>
                    {rec.founder_override && (
                      <Badge variant="outline" className="text-xs bg-purple-500/15 text-purple-400 border-purple-500/30">Override</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{rec.user_email}</p>
                  {rec.trial_end_date && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {expired ? "Ended" : daysLeft !== null ? `${daysLeft}d remaining` : "Ended"} · {format(parseISO(rec.trial_end_date), "d MMM yyyy")}
                    </p>
                  )}
                  {rec.internal_notes && (
                    <p className="text-xs text-muted-foreground/60 mt-1 italic">"{rec.internal_notes}"</p>
                  )}
                  {!rec.billing_ready && (
                    <p className="text-xs text-amber-400/70 mt-1">Billing not enabled</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(rec)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400/60 hover:text-red-400" onClick={() => handleDelete(rec.id)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}