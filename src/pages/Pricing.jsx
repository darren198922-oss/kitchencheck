import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Mail, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const TIERS = [
  {
    name: "Single Site",
    monthly: "£7.99",
    annual: "£79",
    desc: "One kitchen, one location.",
    features: [
      "Unlimited checklists",
      "Temperature logging",
      "Photo evidence",
      "PDF export",
      "Check history",
    ],
    highlight: false,
  },
  {
    name: "2–5 Sites",
    monthly: "£19.99",
    annual: "£199",
    desc: "For small groups and multi-site operators.",
    features: [
      "Everything in Single Site",
      "Up to 5 locations",
      "Shared check history",
    ],
    highlight: true,
  },
  {
    name: "6–15 Sites",
    monthly: "£49.99",
    annual: "£499",
    desc: "Larger groups, same simple setup.",
    features: [
      "Everything in 2–5 Sites",
      "Up to 15 locations",
    ],
    highlight: false,
  },
  {
    name: "Larger Groups",
    monthly: "Contact us",
    annual: "",
    desc: "More than 15 sites? Get in touch.",
    features: [
      "Custom site count",
      "Priority support",
    ],
    highlight: false,
    cta: "contact",
  },
];

export default function Pricing() {
  const [billingPeriod, setBillingPeriod] = useState("monthly");

  return (
    <div className="min-h-screen bg-background">
      {/* Simple header */}
      <header className="border-b border-border px-4 py-3 flex items-center gap-3">
        <Link to="/" className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <ChevronLeft className="w-4 h-4" /> Back
        </Link>
        <span className="font-bold text-base tracking-tight text-foreground">KitchenCheck</span>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-10">

        {/* Heading */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Simple, flat pricing</h1>
          <p className="text-muted-foreground text-base">
            Less than the cost of one takeaway coffee a week. Priced by site, not by staff.
          </p>
          <p className="text-sm font-semibold text-primary mt-1">
            Early pilot: 60 days free, then from £7.99/month per site. Cancel anytime.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center">
          <div className="inline-flex gap-1 bg-secondary rounded-lg p-1">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingPeriod === "monthly"
                  ? "bg-card text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod("annual")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                billingPeriod === "annual"
                  ? "bg-card text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Annual
            </button>
          </div>
        </div>

        {/* Tiers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TIERS.map((tier) => {
            const price = billingPeriod === "monthly" ? tier.monthly : tier.annual;
            const period = billingPeriod === "monthly" ? "/month" : "/year";
            return (
            <div
              key={tier.name}
              className={`rounded-2xl border p-5 space-y-4 flex flex-col ${
                tier.highlight
                  ? "border-primary bg-accent/30"
                  : "border-border bg-card"
              }`}
            >

              <div>
                <h2 className="text-lg font-bold">{tier.name}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{tier.desc}</p>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-3xl font-bold">{price}</span>
                {price !== "Contact us" && price && <span className="text-sm text-muted-foreground mb-1">{period}</span>}
              </div>
              <ul className="space-y-2 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              {tier.cta === "contact" ? (
                <a href="mailto:hello@kitchencheck.app">
                  <Button variant="outline" className="w-full">
                    <Mail className="w-4 h-4" /> Get in touch
                  </Button>
                </a>
              ) : (
                <p className="text-xs text-muted-foreground pt-1">Billing coming soon</p>
              )}
            </div>
            );
          })}
        </div>

        {/* Annual helper copy */}
        {billingPeriod === "annual" && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Annual plans include roughly 2 months free.</p>
          </div>
        )}

        {/* No nonsense line */}
        <div className="rounded-xl bg-secondary/50 border border-border p-4 text-center space-y-1">
          <p className="text-sm font-semibold">No per-user fees. No setup charges. Cancel any time.</p>
          <p className="text-xs text-muted-foreground">Questions? Email us at <a href="mailto:hello@kitchencheck.app" className="text-primary underline">hello@kitchencheck.app</a></p>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center leading-relaxed px-2">
          KitchenCheck helps organise operational kitchen records. It does not provide legal advice, food safety advice, certification, or a guarantee of compliance. Your business remains responsible for following appropriate food safety procedures, training, and legal requirements.
        </p>

        {/* Policy links */}
        <div className="flex justify-center gap-5 text-xs text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
          <Link to="/cookies" className="hover:text-foreground">Cookie Policy</Link>
        </div>
      </div>
    </div>
  );
}