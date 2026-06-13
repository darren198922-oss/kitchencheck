import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { Users, Plus, Search, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      const data = await base44.entities.Customer.list("-created_date", 200);
      setCustomers(data);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = customers.filter(c =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.postcode?.toLowerCase().includes(search.toLowerCase()) ||
    c.address?.toLowerCase().includes(search.toLowerCase())
  );

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
        title="Customers"
        description={`${customers.length} customer${customers.length !== 1 ? "s" : ""} · service history on record`}
        action={
          <Button size="sm" className="gap-1.5" onClick={() => navigate("/customers/new")}>
            <Plus className="w-4 h-4" /> Add
          </Button>
        }
      />

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, postcode, address..."
          className="pl-10 h-12"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? "No customers found" : "No customers yet"}
          description={search ? "Try a different name, postcode, or address" : "Add your first customer to start building their service trail and proof of work history"}
        >
          {!search && (
            <Button size="sm" onClick={() => navigate("/customers/new")}>
              <Plus className="w-4 h-4 mr-1.5" /> Add Customer
            </Button>
          )}
        </EmptyState>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <Link key={c.id} to={`/customers/${c.id}`}>
              <div className="rounded-xl bg-card border border-border p-4 active:scale-[0.98] transition-transform">
                <p className="text-sm font-semibold">{c.full_name}</p>
                <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                  {c.postcode && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {c.postcode}
                    </span>
                  )}
                  {c.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {c.phone}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}