import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, LogOut, Upload, Shield } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/shared/PageHeader";
import { format, parseISO, differenceInDays, isAfter } from "date-fns";

const TRADE_TYPES = [
  { value: "plumbing", label: "Plumbing" },
  { value: "heating", label: "Heating" },
  { value: "gas", label: "Gas" },
  { value: "electric", label: "Electrical" },
  { value: "fire_safety", label: "Fire Safety" },
  { value: "appliance", label: "Appliance" },
  { value: "drainage", label: "Drainage" },
  { value: "maintenance", label: "Maintenance" },
  { value: "other", label: "Other" },
];

export default function Settings() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    business_name: "",
    trade_type: "",
    phone: "",
    service_area: "",
    logo_url: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accessRecord, setAccessRecord] = useState(null);

  useEffect(() => {
    async function load() {
      const me = await base44.auth.me();
      setUser(me);
      setForm({
        business_name: me.business_name || "",
        trade_type: me.trade_type || "",
        phone: me.phone || "",
        service_area: me.service_area || "",
        logo_url: me.logo_url || "",
      });
      const allAccess = await base44.entities.AccountAccess.list("-created_date", 200);
      setAccessRecord(allAccess.find(a => a.user_email === me.email) || null);
      setLoading(false);
    }
    load();
  }, []);

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe(form);
    toast.success("Settings saved");
    setSaving(false);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    update("logo_url", file_url);
    setUploading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6 pb-24">
      <PageHeader title="Settings" description="Manage your business profile" />

      {/* Profile card */}
      <div className="rounded-2xl bg-card border border-border p-5 space-y-4">
        <div className="flex items-center gap-4">
          {form.logo_url ? (
            <img src={form.logo_url} alt="Logo" className="w-16 h-16 rounded-xl object-cover border border-border" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center text-2xl font-bold text-muted-foreground">
              {(form.business_name || user?.full_name || "S")[0].toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-semibold">{user?.full_name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <label className="cursor-pointer">
          <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
          <Button type="button" variant="secondary" size="sm" className="gap-1.5 pointer-events-none">
            <Upload className="w-4 h-4" /> {uploading ? "Uploading..." : "Upload Logo"}
          </Button>
        </label>
      </div>

      {/* Business details */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Business Name</Label>
          <Input value={form.business_name} onChange={(e) => update("business_name", e.target.value)} placeholder="Your Business Name" className="h-12" />
        </div>

        <div className="space-y-2">
          <Label>Trade Type</Label>
          <Select value={form.trade_type} onValueChange={(v) => update("trade_type", v)}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select trade" />
            </SelectTrigger>
            <SelectContent>
              {TRADE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="07xxx xxxxxx" type="tel" className="h-12" />
        </div>

        <div className="space-y-2">
          <Label>Service Area</Label>
          <Input value={form.service_area} onChange={(e) => update("service_area", e.target.value)} placeholder="e.g. Greater Manchester" className="h-12" />
        </div>

        <Button onClick={handleSave} className="w-full h-12 font-semibold gap-2" disabled={saving}>
          <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      {/* Access status — honest, read-only */}
      <div className="rounded-2xl bg-card border border-border p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-semibold">Account Access</p>
        </div>
        {accessRecord ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="text-xs font-medium capitalize">{
                {
                  active_trial: "Trial active",
                  active_paid: "Active",
                  beta_free: "Beta access",
                  comped: "Complimentary access",
                  grandfathered: "Grandfathered access",
                  expired: "Trial expired",
                  inactive: "Inactive",
                }[accessRecord.access_mode] || accessRecord.access_mode
              }</p>
            </div>
            {accessRecord.trial_end_date && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {isAfter(parseISO(accessRecord.trial_end_date), new Date()) ? "Expires" : "Expired"}
                </p>
                <p className="text-xs font-medium">{format(parseISO(accessRecord.trial_end_date), "d MMM yyyy")}
                  {isAfter(parseISO(accessRecord.trial_end_date), new Date()) &&
                    ` (${differenceInDays(parseISO(accessRecord.trial_end_date), new Date())}d left)`
                  }
                </p>
              </div>
            )}
            {accessRecord.founder_override && (
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Override</p>
                <p className="text-xs font-medium text-primary">Founder override active</p>
              </div>
            )}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Billing</p>
              <p className="text-xs text-muted-foreground">{accessRecord.billing_ready ? "Enabled" : "Not yet enabled"}</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No access record found — contact the WorkMark team if you believe this is an error.</p>
        )}
      </div>

      {/* Admin link — founder only */}
      {user?.role === "admin" && (
        <a href="/access-admin">
          <Button variant="outline" className="w-full h-11 gap-2 text-sm">
            <Shield className="w-4 h-4" /> Manage Access (Admin)
          </Button>
        </a>
      )}

      {/* Logout */}
      <Button
        variant="ghost"
        className="w-full h-12 text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-2"
        onClick={() => base44.auth.logout()}
      >
        <LogOut className="w-4 h-4" /> Log Out
      </Button>
    </div>
  );
}