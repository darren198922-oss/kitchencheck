import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import SiteFooter from "@/components/layout/SiteFooter";

export default function CookiePolicy() {
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
          <h1 className="text-2xl font-bold">Cookie Policy</h1>
          <p className="text-sm text-muted-foreground mt-1">Last updated: May 2025</p>
        </div>

        <div className="space-y-6 text-sm text-foreground leading-relaxed">

          <section className="space-y-2">
            <h2 className="font-bold text-base">What we use</h2>
            <p>KitchenCheck uses a small amount of browser local storage to keep the app working smoothly on your device. We do not use advertising cookies or third-party tracking cookies.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-base">What's stored on your device</h2>
            <ul className="space-y-2 list-disc list-inside text-muted-foreground">
              <li><span className="text-foreground font-medium">Recent staff names</span> — so your team don't have to re-type their name every time they log a check.</li>
              <li><span className="text-foreground font-medium">Equipment list preferences</span> — to remember which equipment you've set up for temperature logging.</li>
              <li><span className="text-foreground font-medium">Unfinished checklist drafts</span> — so an interrupted check can be resumed on the same device (cleared after 24 hours).</li>
              <li><span className="text-foreground font-medium">Authentication session</span> — to keep you logged in.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-base">What we don't do</h2>
            <p>We do not use cookies for advertising, remarketing, or selling data to third parties. We do not use Google Analytics or similar tracking services.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-base">Clearing stored data</h2>
            <p>You can clear local storage at any time through your browser settings. This will remove saved staff names, equipment preferences, and any unfinished drafts on that device.</p>
          </section>

          <section className="space-y-2">
            <h2 className="font-bold text-base">Contact</h2>
            <p>Questions? Email us at <a href="mailto:hello@nfdlogicsystems.co.uk" className="text-primary underline">hello@nfdlogicsystems.co.uk</a>.</p>
          </section>
        </div>

        <div className="flex gap-5 text-xs text-muted-foreground pt-4">
          <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
          <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
          <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
        </div>

        <SiteFooter showBuiltBy className="pt-2" />
      </div>
    </div>
  );
}