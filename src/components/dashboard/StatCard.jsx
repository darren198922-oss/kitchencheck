import { cn } from "@/lib/utils";

export default function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className={cn(
      "rounded-2xl p-4 border border-border bg-card",
      accent && "border-primary/30"
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
          accent ? "bg-primary/15" : "bg-secondary"
        )}>
          <Icon className={cn("w-5 h-5", accent ? "text-primary" : "text-muted-foreground")} />
        </div>
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
      </div>
    </div>
  );
}