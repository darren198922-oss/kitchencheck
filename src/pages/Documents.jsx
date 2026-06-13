import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, Send, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import PageHeader from "@/components/shared/PageHeader";
import DocumentPreview from "@/components/documents/DocumentPreview";

export default function Documents() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedRecord = urlParams.get("record");

  const [records, setRecords] = useState([]);
  const [selectedRecordId, setSelectedRecordId] = useState(preselectedRecord || "");
  const [record, setRecord] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [user, setUser] = useState(null);
  const [template, setTemplate] = useState("service_record");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    async function load() {
      const [recs, me] = await Promise.all([
        base44.entities.ServiceRecord.list("-visit_date", 200),
        base44.auth.me(),
      ]);
      setRecords(recs);
      setUser(me);
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    async function loadRecord() {
      if (!selectedRecordId) { setRecord(null); return; }
      const allRecords = await base44.entities.ServiceRecord.list("-visit_date", 500);
      const found = allRecords.find(r => r.id === selectedRecordId);
      if (!found) return;
      setRecord(found);
      
      const [allPhotos, allCustomers] = await Promise.all([
        base44.entities.ServicePhoto.list("-created_date", 200),
        base44.entities.Customer.list("full_name", 500),
      ]);
      setPhotos(allPhotos.filter(p => p.service_record_id === selectedRecordId));
      setCustomer(allCustomers.find(c => c.id === found.customer_id) || null);
    }
    loadRecord();
  }, [selectedRecordId]);

  const handleEmail = async () => {
    if (!customer?.email) {
      toast.error("Customer has no email address");
      return;
    }
    setSending(true);
    
    const body = generateEmailBody(record, customer, photos, user, template);
    
    await base44.integrations.Core.SendEmail({
      to: customer.email,
      subject: `Service Record — ${record.service_type} — ${format(parseISO(record.visit_date), "d MMM yyyy")}`,
      body: body,
      from_name: user?.business_name || "WorkMark",
    });
    
    toast.success(`Email sent to ${customer.email}`);
    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4 pb-24">
      <PageHeader title="Proof & Documents" description="Customer-ready evidence for every completed job" />

      {/* Select record */}
      {records.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm font-medium text-muted-foreground">No jobs logged yet</p>
          <p className="text-xs text-muted-foreground mt-1">Log a completed job first — then return here to generate customer-ready proof</p>
        </div>
      ) : (
        <div className="space-y-2">
          <Select value={selectedRecordId} onValueChange={setSelectedRecordId}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select a job to generate proof" />
            </SelectTrigger>
            <SelectContent>
              {records.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.customer_name} — {r.service_type} — {format(parseISO(r.visit_date), "d MMM")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Template picker */}
      {record && (
        <div className="space-y-2">
          <Select value={template} onValueChange={setTemplate}>
            <SelectTrigger className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="service_record">Full Service Record</SelectItem>
              <SelectItem value="work_summary">Work Completed Summary</SelectItem>
              <SelectItem value="follow_up">Recommended Follow-Up</SelectItem>
              <SelectItem value="customer_copy">Customer Copy</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Preview */}
      {record && (
        <DocumentPreview
          record={record}
          customer={customer}
          photos={photos}
          user={user}
          template={template}
        />
      )}

      {/* Actions */}
      {record && (
        <div className="space-y-2">
          <Button onClick={handleEmail} disabled={sending || !customer?.email} className="w-full h-12 font-semibold gap-2">
            <Send className="w-4 h-4" /> {sending ? "Sending..." : "Send Proof to Customer"}
          </Button>
          {!customer?.email && (
            <p className="text-xs text-muted-foreground text-center">Add an email address to this customer to enable sending</p>
          )}
        </div>
      )}
    </div>
  );
}

function generateEmailBody(record, customer, photos, user, template) {
  const date = format(parseISO(record.visit_date), "d MMMM yyyy");
  const bizName = user?.business_name || "ServiceProof";
  const engineerName = user?.full_name || "Your Engineer";

  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #0d9488; margin-bottom: 4px;">${bizName}</h2>
      <p style="color: #666; font-size: 14px; margin-top: 0;">Service Record</p>
      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 16px 0;" />
      
      <p><strong>Customer:</strong> ${customer?.full_name || "N/A"}</p>
      <p><strong>Address:</strong> ${customer?.address || "N/A"}</p>
      <p><strong>Date of Visit:</strong> ${date}</p>
      <p><strong>Service Type:</strong> ${record.service_type}</p>
      <p><strong>Engineer:</strong> ${engineerName}</p>
  `;

  if (template !== "customer_copy") {
    if (record.problem_reported) html += `<h3>Problem Reported</h3><p>${record.problem_reported}</p>`;
    if (record.findings) html += `<h3>Findings</h3><p>${record.findings}</p>`;
  }

  if (record.work_completed) html += `<h3>Work Completed</h3><p>${record.work_completed}</p>`;

  if (template === "follow_up" || template === "service_record") {
    if (record.recommendations) html += `<h3>Recommendations</h3><p>${record.recommendations}</p>`;
  }

  if (record.follow_up_due_date) {
    html += `<p><strong>Follow-up Due:</strong> ${format(parseISO(record.follow_up_due_date), "d MMMM yyyy")}</p>`;
  }

  if (photos.length > 0) {
    html += `<h3>Photos</h3>`;
    photos.forEach(p => {
      html += `<p><img src="${p.photo_url}" style="max-width: 100%; border-radius: 8px;" alt="${p.photo_type}" /></p>`;
      if (p.caption) html += `<p style="font-size: 12px; color: #666;">${p.caption}</p>`;
    });
  }

  html += `
      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0 16px;" />
      <p style="font-size: 12px; color: #999;">Proof of work record — generated by WorkMark</p>
    </div>
  `;

  return html;
}