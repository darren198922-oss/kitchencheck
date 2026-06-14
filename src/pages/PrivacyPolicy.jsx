import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-3 flex items-center gap-3">
        <Link to="/" className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <ChevronLeft className="w-4 h-4" /> Back
        </Link>
        <span className="font-bold text-base tracking-tight">KitchenCheck</span>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mt-1">Last updated: May 2025</p>
        </div>

        <div className="space-y-6 text-sm text-foreground leading-relaxed">

          <section className="space-y-2">
            <h2 className="font-bold text-base">What we collect</h2>
            <p>When you use KitchenCheck, we store the information you enter — including checklist records, temperature logs, staff names used during checks, and any photos uploaded as evidence. We also store your account email and basic account details.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-base">How we use it</h2>
            <p>Your data is used to run KitchenCheck — to display your records, generate PDFs, and provide your check history. We do not sell your data, and we do not use it for advertising.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-base">Data storage</h2>
            <p>Your data is stored securely. Photos and records are kept as long as your account is active. You can request deletion of your account and data by contacting us.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-base">Staff names</h2>
            <p>Staff names entered during checks are stored as part of the operational record. These are not personal profiles. Staff names are not used for any other purpose.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-base">Cookies</h2>
            <p>KitchenCheck uses minimal cookies and local browser storage to remember device preferences (such as equipment lists and recent staff names). See our <Link to="/cookies" className="text-primary underline">Cookie Policy</Link> for details.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-base">Your rights</h2>
            <p>You can request access to, correction of, or deletion of your data at any time by contacting us at <a href="mailto:hello@kitchencheck.app" className="text-primary underline">hello@kitchencheck.app</a>.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-base">Contact</h2>
            <p>Questions about privacy? Email us at <a href="mailto:hello@kitchencheck.app" className="text-primary underline">hello@kitchencheck.app</a>.</p>
          </section>
        </div>

        <div className="flex gap-5 text-xs text-muted-foreground pt-4">
          <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
          <Link to="/cookies" className="hover:text-foreground">Cookie Policy</Link>
          <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
        </div>
      </div>
    </div>
  );
}