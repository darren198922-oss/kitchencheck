import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { ClipboardList, Bell, CheckCircle2, AlertTriangle, Plus, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, isAfter, isBefore, startOfMonth, endOfMonth, parseISO } from "date-fns";
import StatCard from "@/components/dashboard/StatCard";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import GettingStartedCard from "@/components/dashboard/GettingStartedCard";

export default function Dashboard() {
  const [records, setRecords] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function load() {
      const [recs, rems, me, custs] = await Promise.all([
        base44.entities.ServiceRecord.list("-visit_date", 50),
        base44.entities.Reminder.list("-due_date", 50),
        base44.auth.me(),
        base44.entities.Customer.list("full_name", 10),
      ]);
      setRecords(recs);
      setReminders(rems);
      setUser(me);
      setCustomers(custs);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const thisMonthRecords = records.filter(r => {
    const d = parseISO(r.visit_date);
    return isAfter(d, monthStart) && isBefore(d, monthEnd);
  });

  const completedRecords = records.filter(r => r.status === "completed");
  const followUps = records.filter(r => r.status === "follow_up_required");
  const pendingReminders = reminders.filter(r => r.status === "pending");
  const overdueReminders = pendingReminders.filter(r => isBefore(parseISO(r.due_date), now));

  const recentRecords = records.slice(0, 5);

  const firstName = user?.full_name?.split(" ")[0] || "there";

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold">Hi, {firstName}</h1>
        <p className="text-sm text-muted-foreground">
          {format(now, "EEEE, d MMMM yyyy")}
        </p>
      </div>

      {/* Getting started card — shown until user has ≥1 customer AND ≥1 record */}
      <GettingStartedCard hasCustomer={customers.length > 0} hasRecord={records.length > 0} />

      {/* Quick actions */}
      <div className="flex gap-3">
        <Link to="/records/new" className="flex-1">
          <Button className="w-full h-12 text-sm font-semibold gap-2" size="lg">
            <Plus className="w-4 h-4" /> Log a Job
          </Button>
        </Link>
        <Link to="/customers/new" className="flex-1">
          <Button variant="secondary" className="w-full h-12 text-sm font-semibold gap-2" size="lg">
            <Plus className="w-4 h-4" /> Add Customer
          </Button>
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={ClipboardList} label="Jobs this month" value={thisMonthRecords.length} accent />
        <StatCard icon={CheckCircle2} label="Proof captured" value={completedRecords.length} />
        <StatCard icon={Bell} label="Follow-ups pending" value={pendingReminders.length} />
        <StatCard icon={AlertTriangle} label="Needs follow-up" value={followUps.length} />
      </div>

      {/* Overdue alert */}
      {overdueReminders.length > 0 && (
        <Link to="/reminders" className="block">
          <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-400">
                {overdueReminders.length} overdue follow-up{overdueReminders.length !== 1 ? "s" : ""}
              </p>
              <p className="text-xs text-red-400/70">Tap to review</p>
            </div>
            <ChevronRight className="w-5 h-5 text-red-400/50" />
          </div>
        </Link>
      )}

      {/* Recent records */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Recent Work</h2>
          <Link to="/records" className="text-xs text-primary font-medium flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {recentRecords.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No jobs logged yet"
            description="Log your first job to start building your service trail"
          />
        ) : (
          <div className="space-y-2">
            {recentRecords.map((rec) => (
              <Link key={rec.id} to={`/records/${rec.id}`}>
                <div className="rounded-xl bg-card border border-border p-3.5 flex items-center gap-3 active:scale-[0.98] transition-transform">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{rec.customer_name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground truncate">{rec.service_type} · {format(parseISO(rec.visit_date), "d MMM")}</p>
                  </div>
                  <StatusBadge status={rec.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming reminders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Upcoming Callbacks</h2>
          <Link to="/reminders" className="text-xs text-primary font-medium flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {pendingReminders.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No follow-ups scheduled"
            description="Set follow-ups to stay ahead of annual services and callbacks"
          />
        ) : (
          <div className="space-y-2">
            {pendingReminders.slice(0, 4).map((rem) => {
              const isOverdue = isBefore(parseISO(rem.due_date), now);
              return (
                <div key={rem.id} className="rounded-xl bg-card border border-border p-3.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{rem.title}</p>
                    <p className="text-xs text-muted-foreground">{format(parseISO(rem.due_date), "d MMM yyyy")}</p>
                  </div>
                  <StatusBadge status={isOverdue ? "overdue" : "pending"} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}