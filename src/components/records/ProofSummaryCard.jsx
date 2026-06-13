import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { CheckCircle2, Camera, FileText, Bell, BellOff, ImageOff, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function ProofChip({ icon: Icon, label, active, muted }) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border font-medium",
      active
        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
        : muted
        ? "bg-muted/50 border-border text-muted-foreground"
        : "bg-muted/50 border-border text-muted-foreground"
    )}>
      <Icon className="w-3 h-3 shrink-0" />
      {label}
    </div>
  );
}

export default function ProofSummaryCard({ record, photos = [], reminders = [] }) {
  if (!record || record.status !== "completed") return null;

  const photoCount = photos.length;
  const linkedReminder = reminders.find(r => r.service_record_id === record.id && r.status === "pending");
  const hasRecommendations = !!record.recommendations;
  const hasWorkCompleted = !!record.work_completed;
  const visitDate = record.visit_date ? format(parseISO(record.visit_date), "d MMMM yyyy") : null;

  return (
    <div className="rounded-2xl bg-white border border-border/60 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-border/40">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
              Proof of Work
            </p>
            <h3 className="text-base font-bold text-foreground leading-tight truncate">
              {record.service_type || "Completed Job"}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {record.customer_name && (
                <span className="font-medium text-foreground/80">{record.customer_name}</span>
              )}
              {record.customer_name && visitDate && <span className="mx-1.5 text-border">·</span>}
              {visitDate && <span>{visitDate}</span>}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span className="text-xs font-semibold text-emerald-600">Completed</span>
          </div>
        </div>
      </div>

      {/* Proof indicators */}
      <div className="px-5 py-4 border-b border-border/40">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5">
          Proof captured
        </p>
        <div className="flex flex-wrap gap-2">
          {photoCount > 0 ? (
            <ProofChip icon={Camera} label={`${photoCount} photo${photoCount !== 1 ? "s" : ""}`} active />
          ) : (
            <ProofChip icon={ImageOff} label="No photos" muted />
          )}
          {hasRecommendations ? (
            <ProofChip icon={FileText} label="Recommendations noted" active />
          ) : (
            <ProofChip icon={FileText} label="No recommendations" muted />
          )}
          {linkedReminder ? (
            <ProofChip
              icon={Bell}
              label={`Follow-up ${format(parseISO(linkedReminder.due_date), "d MMM")}`}
              active
            />
          ) : (
            <ProofChip icon={BellOff} label="No follow-up set" muted />
          )}
        </div>
      </div>

      {/* Content preview */}
      {(hasWorkCompleted || hasRecommendations) && (
        <div className="px-5 py-4 border-b border-border/40 space-y-3">
          {hasWorkCompleted && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Work completed
              </p>
              <p className="text-sm text-foreground/80 line-clamp-2 leading-relaxed">
                {record.work_completed}
              </p>
            </div>
          )}
          {hasRecommendations && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Recommendations
              </p>
              <p className="text-sm text-foreground/80 line-clamp-2 leading-relaxed">
                {record.recommendations}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Footer actions */}
      <div className="px-5 py-3 flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Ready to show your customer</p>
        <div className="flex items-center gap-1 text-xs font-medium text-primary">
          Full record
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
}