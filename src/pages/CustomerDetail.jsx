import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, Link } from "react-router-dom";
import { Phone, Mail, MapPin, ClipboardList, Pencil, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import CustomerForm from "@/components/customers/CustomerForm";
import ServiceTrail from "@/components/customers/ServiceTrail";
import CustomerTrustSnapshot from "@/components/customers/CustomerTrustSnapshot";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function CustomerDetail() {
  const id = window.location.pathname.split("/").pop();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [records, setRecords] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [photoCounts, setPhotoCounts] = useState({});
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const customers = await base44.entities.Customer.list("-created_date", 500);
      const found = customers.find(c => c.id === id);
      if (!found) { navigate("/customers"); return; }
      setCustomer(found);

      const [allRecords, allReminders, allPhotos] = await Promise.all([
        base44.entities.ServiceRecord.list("-visit_date", 200),
        base44.entities.Reminder.list("-due_date", 500),
        base44.entities.ServicePhoto.list("created_date", 1000),
      ]);

      const custRecords = allRecords.filter(r => r.customer_id === id);
      const custReminders = allReminders.filter(r => r.customer_id === id);

      // Build a photo count map keyed by service_record_id
      const counts = {};
      allPhotos.forEach(p => {
        if (p.service_record_id) {
          counts[p.service_record_id] = (counts[p.service_record_id] || 0) + 1;
        }
      });

      setRecords(custRecords);
      setReminders(custReminders);
      setPhotoCounts(counts);
      setLoading(false);
    }
    load();
  }, [id]);

  const handleUpdate = async (data) => {
    setSaving(true);
    await base44.entities.Customer.update(id, data);
    setCustomer({ ...customer, ...data });
    setEditing(false);
    setSaving(false);
  };

  const handleDelete = async () => {
    await base44.entities.Customer.delete(id);
    navigate("/customers");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (editing) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => setEditing(false)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Edit Customer</h1>
        </div>
        <CustomerForm customer={customer} onSubmit={handleUpdate} onCancel={() => setEditing(false)} loading={saving} />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-5 pb-8">
      {/* Back and actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => navigate("/customers")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" size="icon" onClick={() => setEditing(true)}>
            <Pencil className="w-4 h-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="secondary" size="icon">
                <Trash2 className="w-4 h-4 text-red-400" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete customer?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete {customer.full_name}. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Customer identity */}
      <div className="rounded-2xl bg-card border border-border p-5">
        <h2 className="text-xl font-bold mb-3">{customer.full_name}</h2>
        <div className="space-y-2 text-sm">
          {customer.address && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{customer.address}{customer.postcode ? `, ${customer.postcode}` : ""}</span>
            </div>
          )}
          {customer.phone && (
            <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-primary">
              <Phone className="w-4 h-4" />
              <span>{customer.phone}</span>
            </a>
          )}
          {customer.email && (
            <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-primary">
              <Mail className="w-4 h-4" />
              <span>{customer.email}</span>
            </a>
          )}
          {customer.notes && (
            <p className="text-muted-foreground pt-2 border-t border-border">{customer.notes}</p>
          )}
        </div>
      </div>

      {/* Service memory / trust snapshot */}
      <CustomerTrustSnapshot
        records={records}
        reminders={reminders}
        photoCounts={photoCounts}
      />

      {/* Service Trail */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold">Service Trail</h3>
            {records.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">{records.length} job{records.length !== 1 ? "s" : ""} on record · most recent first</p>
            )}
          </div>
          <Link to={`/records/new?customer=${id}`}>
            <Button size="sm" className="gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" /> Log Job
            </Button>
          </Link>
        </div>

        {records.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">No jobs logged yet</p>
            <p className="text-xs text-muted-foreground mt-1">Log the first job to start building this customer's service trail</p>
          </div>
        ) : (
          <ServiceTrail
            records={records}
            reminders={reminders}
            photoCounts={photoCounts}
          />
        )}
      </div>
    </div>
  );
}