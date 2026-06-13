import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles = {
  draft: "bg-muted text-muted-foreground border-border",
  completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  follow_up_required: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  pending: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
  overdue: "bg-red-500/15 text-red-400 border-red-500/30",
};

const statusLabels = {
  draft: "In Progress",
  completed: "Completed",
  follow_up_required: "Follow-up",
  pending: "Pending",
  cancelled: "Cancelled",
  overdue: "Overdue",
};

export default function StatusBadge({ status }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-semibold px-2.5 py-0.5 rounded-full",
        statusStyles[status] || statusStyles.draft
      )}
    >
      {statusLabels[status] || status}
    </Badge>
  );
}