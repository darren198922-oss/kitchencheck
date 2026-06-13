import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { updateLocalDevCheckItem } from "@/lib/localDevKitchenCheckData";
import { CheckCircle2, Clock, Wrench, MinusCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";

const LOCAL_DEV_AUTH = import.meta.env.VITE_LOCAL_DEV_AUTH === 'true';

const STATUSES = [
  { value: "open", label: "Open", icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10 border-amber-400/30" },
  { value: "in_progress", label: "In Progress", icon: Wrench, color: "text-blue-500", bg: "bg-blue-500/10 border-blue-400/30" },
  { value: "resolved", label: "Resolved", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-400/30" },
  { value: "not_required", label: "Not Required", icon: MinusCircle, color: "text-muted-foreground", bg: "bg-secondary border-border" },
];

export default function IssueResolutionPanel({ item, onUpdated }) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState(item.issue_status || "open");
  const [note, setNote] = useState(item.resolution_note || "");
  const [resolvedBy, setResolvedBy] = useState(item.resolved_by || "");
  const [saving, setSaving] = useState(false);

  const currentStatus = STATUSES.find(s => s.value === status) || STATUSES[0];
  const Icon = currentStatus.icon;

  const handleSave = async () => {
    setSaving(true);
    const patch = {
      issue_status: status,
      resolution_note: note.trim() || undefined,
      resolved_by: resolvedBy.trim() || undefined,
      resolved_at: status === "resolved" ? new Date().toISOString() : undefined,
    };
    try {
      if (LOCAL_DEV_AUTH) {
        const updated = updateLocalDevCheckItem(item.id, patch);
        onUpdated(updated || { ...item, ...patch });
      } else {
        await base44.entities.CheckItem.update(item.id, patch);
        onUpdated({ ...item, ...patch });
      }
      setExpanded(false);
      toast.success("Issue status updated");
    } catch (err) {
      console.error("IssueResolutionPanel save failed:", err);
      toast.error("Couldn't save issue status — please try again");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`rounded-xl border p-3 space-y-2 ${currentStatus.bg}`}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 shrink-0 ${currentStatus.color}`} />
          <span className="text-xs font-bold text-foreground">Issue status: {currentStatus.label}</span>
          {item.resolved_at && status === "resolved" && (
            <span className="text-[10px] text-muted-foreground">
              · {format(new Date(item.resolved_at), "d MMM, HH:mm")}
              {item.resolved_by ? ` · ${item.resolved_by}` : ""}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="space-y-3 pt-1 border-t border-border/50">
          {/* Status selector */}
          <div className="grid grid-cols-2 gap-1.5">
            {STATUSES.map(s => {
              const SIcon = s.icon;
              return (
                <button
                  key={s.value}
                  onClick={() => setStatus(s.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                    status === s.value
                      ? `${s.bg} ${s.color} font-bold`
                      : "bg-background border-border text-muted-foreground"
                  }`}
                >
                  <SIcon className="w-3.5 h-3.5 shrink-0" />
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Resolution note */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground">Resolution note (optional)</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Describe what was done or why no action is needed..."
              className="w-full h-14 px-3 py-2 rounded-xl border border-input bg-background text-xs resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Resolved by */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-muted-foreground">Actioned by (optional)</label>
            <input
              type="text"
              value={resolvedBy}
              onChange={e => setResolvedBy(e.target.value)}
              placeholder="Name of person who actioned this"
              className="w-full h-9 px-3 rounded-xl border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <Button size="sm" className="w-full h-9" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save issue status"}
          </Button>
        </div>
      )}
    </div>
  );
}