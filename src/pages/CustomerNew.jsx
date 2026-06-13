import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/shared/PageHeader";
import CustomerForm from "@/components/customers/CustomerForm";

export default function CustomerNew() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (data) => {
    setLoading(true);
    const user = await base44.auth.me();
    await base44.entities.Customer.create({
      ...data,
      created_by_user_email: user.email,
    });
    navigate("/customers");
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <PageHeader title="New Customer" />
      <CustomerForm onSubmit={handleSubmit} onCancel={() => navigate("/customers")} loading={loading} />
    </div>
  );
}