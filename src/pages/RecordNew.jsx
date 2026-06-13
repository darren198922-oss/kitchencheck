import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

const SERVICE_TYPES = [
  "Boiler Service", "Boiler Repair", "Gas Safety Check", "Plumbing Repair",
  "Heating Repair", "Electrical Work", "Fire Safety Check", "Appliance Repair",
  "Drain Clearance", "General Maintenance", "Installation", "Inspection", "Other"
];

export default function RecordNew() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedCustomer = urlParams.get("customer");

  const [customers, setCustomers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customer_id: preselectedCustomer || "",
    service_type: "",
    visit_date: format(new Date(), "yyyy-MM-dd"),
    problem_reported: "",
    findings: "",
    work_completed: "",
    recommendations: "",
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
    const customer = customers.find(c => c.id === form.customer_id);
    const record = await base44.entities.ServiceRecord.create({
      ...form,
      customer_name: customer?.full_name || "",
      status: "draft",
      created_by_user_email: user.email,
    });
    navigate(`/records/${record.id}`);
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold">New Service Record</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Customer *</Label>
          {customers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-4 text-center">
              <p className="text-sm text-muted-foreground">No customers yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                <a href="/customers/new" className="text-primary underline">Add a customer first</a>, then come back to log a job.
              </p>
            </div>
          ) : (
            <Select value={form.customer_id} onValueChange={(v) => update("customer_id", v)} required>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.full_name} — {c.postcode || c.address}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-2">
          <Label>Service Type *</Label>
          <Select value={form.service_type} onValueChange={(v) => update("service_type", v)} required>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select service type" />
            </SelectTrigger>
            <SelectContent>
              {SERVICE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Visit Date *</Label>
          <Input
            type="date"
            value={form.visit_date}
            onChange={(e) => update("visit_date", e.target.value)}
            className="h-12"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Problem Reported</Label>
          <Textarea
            value={form.problem_reported}
            onChange={(e) => update("problem_reported", e.target.value)}
            placeholder="What the customer reported..."
            className="min-h-[80px]"
          />
        </div>

        <div className="space-y-2">
          <Label>Findings</Label>
          <Textarea
            value={form.findings}
            onChange={(e) => update("findings", e.target.value)}
            placeholder="What you found on site..."
            className="min-h-[80px]"
          />
        </div>

        <div className="space-y-2">
          <Label>Work Completed</Label>
          <Textarea
            value={form.work_completed}
            onChange={(e) => update("work_completed", e.target.value)}
            placeholder="Describe the work done..."
            className="min-h-[80px]"
          />
        </div>

        <div className="space-y-2">
          <Label>Recommendations</Label>
          <Textarea
            value={form.recommendations}
            onChange={(e) => update("recommendations", e.target.value)}
            placeholder="Any recommendations for follow-up..."
            className="min-h-[80px]"
          />
        </div>

        <Button type="submit" className="w-full h-12 font-semibold" disabled={saving || !form.customer_id || !form.service_type}>
          {saving ? "Creating..." : "Create Record"}
        </Button>
      </form>
    </div>
  );
}