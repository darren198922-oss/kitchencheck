import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { addDays, parseISO, format } from "date-fns";

export default function SmartFollowUpPrompt({ record, reminders, onReminderCreated }) {
  const [dismissed, setDismissed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [done, setDone] = useState(false);

  // --- Display conditions ---
  const hasRecommendations = record.recommendations && record.recommendations.trim().length > 0;
  const hasPendingReminder = reminders.some(
    r => r.service_record_id === record.id && r.status === "pending"
  );

  if (
    dismissed ||
    done ||
    record.status !== "completed" ||
    !hasRecommendations ||
    hasPendingReminder
  ) {
    return null;
  }

  // --- Default due date: 30 days after visit_date, fallback to today ---
  let dueDate;
  try {
    dueDate = format(addDays(parseISO(record.visit_date), 30), "yyyy-MM-dd");
  } catch {
    dueDate = format(addDays(new Date(), 30), "yyyy-MM-dd");
  }

  const handleCreate = async () => {
    setCreating(true);
    const title = record.customer_name
      ? `Follow up with ${record.customer_name}`
      : `Follow-up for ${record.service_type}`;

    const notePreview = record.recommendations.trim().slice(0, 120);

    await base44.entities.Reminder.create({
      service_record_id: record.id,
      customer_id: record.customer_id || undefined,
      reminder_type: "follow_up",
      title,
      due_date: dueDate,
      status: "pending",
      notes: notePreview || undefined,
    });

    setDone(true);
    setCreating(false);
    if (onReminderCreated) onReminderCreated();
  };

  return (
    <div className="rounded-2xl border border-border bg-card px-5 py-4 flex items-start gap-4">
      <div className="mt-0.5 shrink-0 w-8 h-8 rounded-xl bg-secondary flex items-center justify-center">
        <RotateCcw className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-snug">
          Recommendations were noted
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          Set a follow-up so this job stays on your radar.
        </p>
        <div className="flex items-center gap-3 mt-3">
          <Button
            size="sm"
            className="h-8 px-4 text-xs font-semibold"
            onClick={handleCreate}
            disabled={creating}
          >
            {creating ? "Adding..." : "Set follow-up"}
          </Button>
          <button
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setDismissed(true)}
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}