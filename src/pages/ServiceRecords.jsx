import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { ClipboardList, Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, parseISO } from "date-fns";
import PageHeader from "@/components/shared/PageHeader";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";

export default function ServiceRecords() {
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const data = await base44.entities.ServiceRecord.list("-visit_date", 200);
      setRecords(data);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = records.filter(r => {
    const matchesSearch =
      r.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.service_type?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
        title="Work Log"
        description={`${records.length} job${records.length !== 1 ? "s" : ""} on your work log`}
        action={
          <Button size="sm" className="gap-1.5" onClick={() => navigate("/records/new")}>
            <Plus className="w-4 h-4" /> New
          </Button>
        }
      />

      {/* Filters */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-4">
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1 text-xs">All</TabsTrigger>
          <TabsTrigger value="draft" className="flex-1 text-xs">In Progress</TabsTrigger>
          <TabsTrigger value="completed" className="flex-1 text-xs">Done</TabsTrigger>
          <TabsTrigger value="follow_up_required" className="flex-1 text-xs">Follow-up</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customer or service type..."
          className="pl-10 h-12"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={search || statusFilter !== "all" ? "No jobs found" : "No jobs logged yet"}
          description={search || statusFilter !== "all" ? "Try adjusting your search or filter" : "Log a job to start capturing proof of work and building your service trail"}
        >
          {!search && statusFilter === "all" && (
            <Button size="sm" onClick={() => navigate("/records/new")}>
              <Plus className="w-4 h-4 mr-1.5" /> Log a Job
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="space-y-2">
          {filtered.map((rec) => (
            <Link key={rec.id} to={`/records/${rec.id}`}>
              <div className="rounded-xl bg-card border border-border p-4 active:scale-[0.98] transition-transform">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{rec.customer_name || "Unknown Customer"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{rec.service_type}</p>
                  </div>
                  <StatusBadge status={rec.status} />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {format(parseISO(rec.visit_date), "d MMM yyyy")}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}