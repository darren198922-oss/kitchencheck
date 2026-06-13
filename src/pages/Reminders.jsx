import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Bell, Plus, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO, isBefore } from "date-fns";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";

export default function Reminders() {
  const [reminders, setReminders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [tab, setTab] = useState("pending");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const [rems, custs] = await Promise.all([
        base44.entities.Reminder.list("-due_date", 200),
        base44.entities.Customer.list("full_name", 500),
      ]);
      setReminders(rems);
      setCustomers(custs);
      setLoading(false);
    }
    load();
  }, []);

  const now = new Date();

  const getCustomerName = (id) => customers.find(c => c.id === id)?.full_name || "";

  const filtered = reminders.filter(r => {
    if (tab === "pending") return r.status === "pending";
    if (tab === "overdue") return r.status === "pending" && isBefore(parseISO(r.due_date), now);
    if (tab === "completed") return r.status === "completed";
    return true;
  });

  const handleComplete = async (id) => {
    await base44.entities.Reminder.update(id, { status: "completed" });
    setReminders(prev => prev.map(r => r.id === id ? { ...r, status: "completed" } : r));
  };

  const handleCancel = async (id) => {
    await base44.entities.Reminder.update(id, { status: "cancelled" });
    setReminders(prev => prev.map(r => r.id === id ? { ...r, status: "cancelled" } : r));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <PageHeader
        title="Follow-ups"
        description={`${reminders.filter(r => r.status === "pending").length} pending · callbacks, revisits & annual services`}
        action={
          <Button size="sm" className="gap-1.5" onClick={() => navigate("/reminders/new")}>
            <Plus className="w-4 h-4" /> New
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList className="w-full">
          <TabsTrigger value="pending" className="flex-1 text-xs">Pending</TabsTrigger>
          <TabsTrigger value="overdue" className="flex-1 text-xs">Overdue</TabsTrigger>
          <TabsTrigger value="completed" className="flex-1 text-xs">Completed</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={tab === "pending" ? "No follow-ups scheduled" : tab === "overdue" ? "Nothing overdue" : "No completed follow-ups yet"}
          description={tab === "pending" ? "Set follow-ups after jobs to stay ahead of callbacks, annual services, and recommended revisits" : tab === "overdue" ? "You're on top of everything — nothing needs urgent attention" : "Completed follow-ups will appear here so you can track your service history"}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((rem) => {
            const isOverdue = rem.status === "pending" && isBefore(parseISO(rem.due_date), now);
            const custName = getCustomerName(rem.customer_id);
            return (
              <div key={rem.id} className="rounded-xl bg-card border border-border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{rem.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {custName && `${custName} · `}
                      {format(parseISO(rem.due_date), "d MMM yyyy")}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">{rem.reminder_type?.replace(/_/g, " ")}</p>
                    {rem.notes && <p className="text-xs text-muted-foreground mt-1">{rem.notes}</p>}
                  </div>
                  <StatusBadge status={isOverdue ? "overdue" : rem.status} />
                </div>
                {rem.status === "pending" && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="secondary" className="flex-1 gap-1" onClick={() => handleComplete(rem.id)}>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mark Complete
                    </Button>
                    <Button size="sm" variant="ghost" className="gap-1 text-muted-foreground" onClick={() => handleCancel(rem.id)}>
                      <X className="w-3.5 h-3.5" /> Cancel
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}