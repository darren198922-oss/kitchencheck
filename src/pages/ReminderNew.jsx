import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const REMINDER_TYPES = [
  { value: "annual_service", label: "Annual Service" },
  { value: "callback", label: "Callback" },
  { value: "follow_up", label: "Follow-up" },
  { value: "recommended_work", label: "Recommended Work" },
  { value: "custom", label: "Custom" },
];

export default function ReminderNew() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const preCustomer = urlParams.get("customer") || "";
  const preRecord = urlParams.get("record") || "";

  const [customers, setCustomers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customer_id: preCustomer,
    service_record_id: preRecord,
    reminder_type: "follow_up",
    title: "",
    due_date: "",
    notes: "",
  });

  useEffect(() => {
    async function load() {
      const data = await base44.entities.Customer.list("full_name", 500);
      setCustomers(data);
    }
    load();
  }, []);

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const user = await base44.auth.me();
    await base44.entities.Reminder.create({
      ...form,
      status: "pending",
      created_by_user_email: user.email,
    });
    navigate("/reminders");
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold">New Reminder</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Title *</Label>
          <Input
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="e.g. Annual boiler service"
            className="h-12"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Type *</Label>
          <Select value={form.reminder_type} onValueChange={(v) => update("reminder_type", v)} required>
            <SelectTrigger className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REMINDER_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Due Date *</Label>
          <Input
            type="date"
            value={form.due_date}
            onChange={(e) => update("due_date", e.target.value)}
            className="h-12"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Customer</Label>
          <Select value={form.customer_id} onValueChange={(v) => update("customer_id", v)}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select customer (optional)" />
            </SelectTrigger>
            <SelectContent>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Any additional notes..."
            className="min-h-[80px]"
          />
        </div>

        <Button type="submit" className="w-full h-12 font-semibold" disabled={saving || !form.title || !form.due_date}>
          {saving ? "Creating..." : "Create Reminder"}
        </Button>
      </form>
    </div>
  );
}