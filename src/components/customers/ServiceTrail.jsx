import { Link } from "react-router-dom";
import { format, parseISO, isBefore } from "date-fns";
import { Camera, Bell, ChevronRight, AlertCircle, CheckCircle2, Clock, FileText, ShieldCheck } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";

function ProofIndicator({ photos }) {
  if (!photos || photos === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-500 font-medium">
      <Camera className="w-3 h-3" />
      {photos} photo{photos !== 1 ? "s" : ""}
    </span>
  );
}

function ReminderPill({ reminder }) {
  const now = new Date();
  const isOverdue = reminder.status === "pending" && isBefore(parseISO(reminder.due_date), now);
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border",
      isOverdue
        ? "bg-red-500/10 text-red-400 border-red-500/20"
        : reminder.status === "completed"
        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
    )}>
      <Bell className="w-2.5 h-2.5" />
      {isOverdue ? "Overdue" : reminder.status === "completed" ? "Done" : format(parseISO(reminder.due_date), "d MMM")}
    </span>
  );
}

export default function ServiceTrail({ records, reminders, photoCounts }) {
  if (records.length === 0) return null;

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[19px] top-6 bottom-0 w-px bg-border" />

      <div className="space-y-3">
        {records.map((rec, idx) => {
          const recReminders = reminders.filter(r => r.service_record_id === rec.id);
          const photoCount = photoCounts?.[rec.id] || 0;
          const hasRecommendation = !!rec.recommendations;
          const isFirst = idx === 0;

          return (
            <Link key={rec.id} to={`/records/${rec.id}`}>
              <div className={cn(
                "relative pl-10 group active:scale-[0.99] transition-transform"
              )}>
                {/* Timeline dot */}
                <div className={cn(
                  "absolute left-0 top-4 w-10 flex items-center justify-center",
                )}>
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                    rec.status === "completed"
                      ? "bg-emerald-500/15 border-emerald-500/50"
                      : rec.status === "follow_up_required"
                      ? "bg-amber-500/15 border-amber-500/50"
                      : "bg-muted border-border"
                  )}>
                    {rec.status === "completed" ? (
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                    ) : rec.status === "follow_up_required" ? (
                      <AlertCircle className="w-2.5 h-2.5 text-amber-400" />
                    ) : (
                      <Clock className="w-2.5 h-2.5 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Card */}
                <div className="rounded-xl bg-card border border-border p-3.5 group-hover:border-primary/30 transition-colors">
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-tight truncate">{rec.service_type}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(parseISO(rec.visit_date), "d MMM yyyy")}
                        {isFirst && <span className="ml-1.5 text-primary font-medium">· Latest</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <StatusBadge status={rec.status} />
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </div>

                  {/* Indicators row */}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {rec.status === "completed" && (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-500 font-medium">
                        <ShieldCheck className="w-3 h-3" />
                        Proof ready
                      </span>
                    )}
                    {photoCount > 0 && <ProofIndicator photos={photoCount} />}
                    {hasRecommendation && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <FileText className="w-3 h-3" />
                        Recommendations noted
                      </span>
                    )}
                    {recReminders.map(rem => (
                      <ReminderPill key={rem.id} reminder={rem} />
                    ))}
                  </div>

                  {/* Recommendation preview */}
                  {rec.recommendations && (
                    <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border line-clamp-2">
                      {rec.recommendations}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}