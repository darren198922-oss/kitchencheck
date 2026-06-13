import { cn } from "@/lib/utils";

export default function EmptyState({ icon: Icon, title, description, children, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 px-6 text-center", className)}>
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-muted-foreground" />
        </div>
      )}
      <h3 className="text-base font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}