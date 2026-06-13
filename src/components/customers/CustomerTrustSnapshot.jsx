import { format, parseISO } from "date-fns";
import { CheckCircle2, Camera, Bell, Wrench, Calendar } from "lucide-react";

export default function CustomerTrustSnapshot({ records, reminders, photoCounts }) {
  if (records.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-3 text-center">
        <p className="text-xs text-muted-foreground">No service history yet — log the first job to start building this customer's trail</p>
      </div>
    );
  }

  const completedRecords = records.filter(r => r.status === "completed");
  const totalPhotos = records.reduce((sum, r) => sum + (photoCounts[r.id] || 0), 0);
  const pendingFollowUps = reminders.filter(r => r.status === "pending").length;

  // Last completed job (sorted by visit_date descending, first completed)
  const lastCompleted = completedRecords.sort(
    (a, b) => new Date(b.visit_date) - new Date(a.visit_date)
  )[0];

  // Most common service type
  const serviceTypeCounts = {};
  records.forEach(r => {
    if (r.service_type) serviceTypeCounts[r.service_type] = (serviceTypeCounts[r.service_type] || 0) + 1;
  });
  const mainService = Object.entries(serviceTypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  const signals = [
    lastCompleted && {
      icon: Calendar,
      label: "Last job",
      value: format(parseISO(lastCompleted.visit_date), "d MMM yyyy"),
      color: "text-foreground",
    },
    {
      icon: CheckCircle2,
      label: "Jobs completed",
      value: completedRecords.length,
      color: "text-emerald-500",
    },
    totalPhotos > 0 && {
      icon: Camera,
      label: "Proof photos",
      value: totalPhotos,
      color: "text-primary",
    },
    {
      icon: Bell,
      label: "Follow-ups",
      value: pendingFollowUps > 0 ? `${pendingFollowUps} pending` : "None set",
      color: pendingFollowUps > 0 ? "text-amber-400" : "text-muted-foreground",
    },
    mainService && records.length > 1 && {
      icon: Wrench,
      label: "Main service",
      value: mainService,
      color: "text-foreground",
    },
  ].filter(Boolean);

  return (
    <div className="rounded-xl bg-secondary/40 border border-border p-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Service Memory</p>
      <div className="grid grid-cols-2 gap-y-3 gap-x-4">
        {signals.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="flex items-start gap-2 min-w-0">
            <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
            <div className="min-w-0">
              <p className={`text-sm font-semibold truncate ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}