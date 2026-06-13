import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export default function TermsOfService() {
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
          <h1 className="text-2xl font-bold">Terms of Service</h1>
          <p className="text-sm text-muted-foreground mt-1">Last updated: May 2025</p>
        </div>

        <div className="space-y-6 text-sm text-foreground leading-relaxed">

          <section className="space-y-2">
            <h2 className="font-bold text-base">What KitchenCheck is</h2>
            <p>KitchenCheck is a digital tool to help kitchens manage their daily operational food safety records. It is designed to support your existing food safety practices — not replace them.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-base">What KitchenCheck is not</h2>
            <p>KitchenCheck does not replace your legal food safety obligations, formal HACCP plans, Environmental Health Officer (EHO) inspections, or staff food hygiene training. You remain responsible for compliance with all applicable food safety laws and regulations.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-base">Your account</h2>
            <p>You are responsible for keeping your account secure and for the accuracy of records entered by your team. Do not share account access with people outside your organisation.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-base">Records and data</h2>
            <p>You own the records you create in KitchenCheck. We store them securely on your behalf. You can export your records at any time as PDFs. On account cancellation, we will retain your data for 30 days before deletion unless you request earlier removal.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-base">Service availability</h2>
            <p>We aim to keep KitchenCheck available and reliable. Occasionally, maintenance or unexpected issues may cause brief downtime. We are not liable for losses arising from service interruption.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-base">Changes</h2>
            <p>We may update these terms from time to time. We will notify you of significant changes by email. Continued use of KitchenCheck after changes means you accept the updated terms.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-base">Contact</h2>
            <p>Questions? Email us at <a href="mailto:hello@kitchencheck.app" className="text-primary underline">hello@kitchencheck.app</a>.</p>
          </section>
        </div>

        <div className="flex gap-5 text-xs text-muted-foreground pt-4">
          <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
          <Link to="/cookies" className="hover:text-foreground">Cookie Policy</Link>
          <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
        </div>
      </div>
    </div>
  );
}