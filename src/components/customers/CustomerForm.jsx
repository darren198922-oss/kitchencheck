import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function CustomerForm({ customer, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    full_name: customer?.full_name || "",
    phone: customer?.phone || "",
    email: customer?.email || "",
    address: customer?.address || "",
    postcode: customer?.postcode || "",
    notes: customer?.notes || "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Full Name *</Label>
        <Input
          value={form.full_name}
          onChange={(e) => update("full_name", e.target.value)}
          placeholder="John Smith"
          required
          className="h-12"
        />
      </div>
      <div className="space-y-2">
        <Label>Phone</Label>
        <Input
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
          placeholder="07xxx xxxxxx"
          type="tel"
          className="h-12"
        />
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          placeholder="john@example.com"
          type="email"
          className="h-12"
        />
      </div>
      <div className="space-y-2">
        <Label>Address *</Label>
        <Textarea
          value={form.address}
          onChange={(e) => update("address", e.target.value)}
          placeholder="123 High Street, London"
          required
          className="min-h-[80px]"
        />
      </div>
      <div className="space-y-2">
        <Label>Postcode</Label>
        <Input
          value={form.postcode}
          onChange={(e) => update("postcode", e.target.value)}
          placeholder="SW1A 1AA"
          className="h-12"
        />
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          placeholder="Access notes, key safe code, etc."
          className="min-h-[80px]"
        />
      </div>
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="secondary" className="flex-1 h-12" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" className="flex-1 h-12 font-semibold" disabled={loading}>
          {loading ? "Saving..." : customer ? "Update Customer" : "Add Customer"}
        </Button>
      </div>
    </form>
  );
}