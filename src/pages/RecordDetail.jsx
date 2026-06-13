import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Pencil, CheckCircle2, Clock, FileText, Bell, Trash2, Save, Send } from "lucide-react";
import ProofSummaryCard from "@/components/records/ProofSummaryCard";
import SmartFollowUpPrompt from "@/components/records/SmartFollowUpPrompt";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, parseISO } from "date-fns";
import StatusBadge from "@/components/shared/StatusBadge";
import SignaturePad from "@/components/records/SignaturePad";
import PhotoUploader from "@/components/records/PhotoUploader";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function RecordDetail() {
  const id = window.location.pathname.split("/").pop();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const allRecords = await base44.entities.ServiceRecord.list("-visit_date", 500);
      const found = allRecords.find(r => r.id === id);
      if (!found) { navigate("/records"); return; }
      setRecord(found);
      setEditForm(found);
      const [allPhotos, allReminders] = await Promise.all([
        base44.entities.ServicePhoto.list("-created_date", 200),
        base44.entities.Reminder.list("-due_date", 200),
      ]);
      setPhotos(allPhotos.filter(p => p.service_record_id === id));
      setReminders(allReminders.filter(r => r.service_record_id === id));
      setLoading(false);
    }
    load();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.ServiceRecord.update(id, {
      problem_reported: editForm.problem_reported,
      findings: editForm.findings,
      work_completed: editForm.work_completed,
      recommendations: editForm.recommendations,
      engineer_signature: editForm.engineer_signature,
      customer_signature: editForm.customer_signature,
      follow_up_due_date: editForm.follow_up_due_date,
    });
    setRecord({ ...record, ...editForm });
    setEditing(false);
    setSaving(false);
  };

  const handleComplete = async () => {
    const now = new Date().toISOString();
    await base44.entities.ServiceRecord.update(id, {
      status: "completed",
      signed_at: now,
    });
    setRecord({ ...record, status: "completed", signed_at: now });
  };

  const handleFollowUp = async () => {
    await base44.entities.ServiceRecord.update(id, { status: "follow_up_required" });
    setRecord({ ...record, status: "follow_up_required" });
  };

  const handleDelete = async () => {
    await base44.entities.ServiceRecord.delete(id);
    navigate("/records");
  };

  const updateEdit = (field, value) => setEditForm(prev => ({ ...prev, [field]: value }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => navigate("/records")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" size="icon" onClick={() => setEditing(!editing)}>
            <Pencil className="w-4 h-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="secondary" size="icon">
                <Trash2 className="w-4 h-4 text-red-400" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete record?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete this service record.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Summary card */}
      <div className="rounded-2xl bg-card border border-border p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold">{record.customer_name || "Unknown"}</h2>
            <p className="text-sm text-muted-foreground">{record.service_type}</p>
          </div>
          <StatusBadge status={record.status} />
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Job date: {format(parseISO(record.visit_date), "d MMMM yyyy")}</p>
          {record.signed_at && <p>Proof captured: {format(new Date(record.signed_at), "d MMM yyyy, HH:mm")}</p>}
          {record.follow_up_due_date && <p>Follow-up due: {format(parseISO(record.follow_up_due_date), "d MMM yyyy")}</p>}
        </div>
      </div>

      {/* Proof Summary — completed records only */}
      {record.status === "completed" && (
        <ProofSummaryCard record={record} photos={photos} reminders={reminders} />
      )}

      {/* Smart Follow-Up Prompt — completed + recommendations + no pending reminder */}
      <SmartFollowUpPrompt
        record={record}
        reminders={reminders}
        onReminderCreated={() =>
          base44.entities.Reminder.list("-due_date", 200).then(all =>
            setReminders(all.filter(r => r.service_record_id === id))
          )
        }
      />

      {/* Details - view or edit */}
      {editing ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Problem Reported</Label>
            <Textarea value={editForm.problem_reported || ""} onChange={(e) => updateEdit("problem_reported", e.target.value)} className="min-h-[80px]" />
          </div>
          <div className="space-y-2">
            <Label>Findings</Label>
            <Textarea value={editForm.findings || ""} onChange={(e) => updateEdit("findings", e.target.value)} className="min-h-[80px]" />
          </div>
          <div className="space-y-2">
            <Label>Work Completed</Label>
            <Textarea value={editForm.work_completed || ""} onChange={(e) => updateEdit("work_completed", e.target.value)} className="min-h-[80px]" />
          </div>
          <div className="space-y-2">
            <Label>Recommendations</Label>
            <Textarea value={editForm.recommendations || ""} onChange={(e) => updateEdit("recommendations", e.target.value)} className="min-h-[80px]" />
          </div>
          <div className="space-y-2">
            <Label>Follow-up Due Date</Label>
            <Input type="date" value={editForm.follow_up_due_date || ""} onChange={(e) => updateEdit("follow_up_due_date", e.target.value)} className="h-12" />
          </div>

          {/* Signatures */}
          <SignaturePad label="Engineer Signature" initialValue={editForm.engineer_signature} onSave={(v) => updateEdit("engineer_signature", v)} />
          <SignaturePad label="Customer Signature" initialValue={editForm.customer_signature} onSave={(v) => updateEdit("customer_signature", v)} />

          <Button onClick={handleSave} className="w-full h-12 font-semibold gap-2" disabled={saving}>
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {record.problem_reported && (
            <DetailSection title="Problem Reported" text={record.problem_reported} />
          )}
          {record.findings && (
            <DetailSection title="Findings" text={record.findings} />
          )}
          {record.work_completed && (
            <DetailSection title="Work Completed" text={record.work_completed} />
          )}
          {record.recommendations && (
            <DetailSection title="Recommendations" text={record.recommendations} />
          )}
          {record.engineer_signature && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Engineer Signature</p>
              <img src={record.engineer_signature} alt="Engineer signature" className="h-16 rounded-lg border border-border bg-secondary p-2" />
            </div>
          )}
          {record.customer_signature && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Customer Signature</p>
              <img src={record.customer_signature} alt="Customer signature" className="h-16 rounded-lg border border-border bg-secondary p-2" />
            </div>
          )}
        </div>
      )}

      {/* Photos */}
      <PhotoUploader serviceRecordId={id} photos={photos} onPhotosChange={setPhotos} />

      {/* Actions */}
      <div className="space-y-2 pt-2">
        {record.status !== "completed" && (
          <Button onClick={handleComplete} className="w-full h-12 font-semibold gap-2 bg-emerald-600 hover:bg-emerald-700">
            <CheckCircle2 className="w-4 h-4" /> Mark as Completed
          </Button>
        )}

        {/* Send Proof CTA — prominent when completed */}
        {record.status === "completed" && (
          <Link to={`/documents?record=${id}`} className="block">
            <Button className="w-full h-12 font-semibold gap-2">
              <Send className="w-4 h-4" /> Send Proof to Customer →
            </Button>
          </Link>
        )}

        {record.status !== "follow_up_required" && (
          <Button onClick={handleFollowUp} variant="secondary" className="w-full h-12 font-semibold gap-2">
            <Clock className="w-4 h-4" /> Needs Follow-up
          </Button>
        )}
        <div className="flex gap-2">
          <Link to={`/documents?record=${id}`} className="flex-1">
            <Button variant="secondary" className="w-full h-12 font-semibold gap-2">
              <FileText className="w-4 h-4" /> Generate Proof
            </Button>
          </Link>
          <Link to={`/reminders/new?record=${id}&customer=${record.customer_id}`} className="flex-1">
            <Button variant="secondary" className="w-full h-12 font-semibold gap-2">
              <Bell className="w-4 h-4" /> Set Follow-up
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function DetailSection({ title, text }) {
  return (
    <div className="rounded-xl bg-secondary/50 p-3.5">
      <p className="text-xs font-medium text-muted-foreground mb-1">{title}</p>
      <p className="text-sm whitespace-pre-wrap">{text}</p>
    </div>
  );
}