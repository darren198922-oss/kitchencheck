import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { differenceInDays, parseISO, isAfter } from "date-fns";
import { AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const LOCAL_DEV_AUTH = import.meta.env.VITE_LOCAL_DEV_AUTH === 'true';

const ACCESS_LABELS = {
  active_trial: "Trial active",
  active_paid: "Active",
  beta_free: "Beta access",
  comped: "Complimentary access",
  grandfathered: "Grandfathered access",
  expired: "Trial expired",
  inactive: "Account inactive",
};

export default function AccessStatusBanner() {
  const [access, setAccess] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (LOCAL_DEV_AUTH) return;
    async function load() {
      try {
        const me = await base44.auth.me();
        const all = await base44.entities.AccountAccess.list("-created_date", 200);
        const found = all.find(a => a.user_email === me.email);
        setAccess(found || null);
      } catch (err) {
        console.error("AccessStatusBanner load failed:", err);
      }
    }
    load();
  }, []);

  if (!access || dismissed) return null;

  const now = new Date();
  const isExpired = access.access_mode === "expired" || access.access_mode === "inactive";
  const isActive = ["active_trial", "active_paid", "beta_free", "comped", "grandfathered"].includes(access.access_mode);

  // Calculate days remaining if trial
  let daysRemaining = null;
  let expiringSoon = false;
  if (access.trial_end_date && (access.access_mode === "active_trial" || access.access_mode === "beta_free")) {
    const end = parseISO(access.trial_end_date);
    if (isAfter(end, now)) {
      daysRemaining = differenceInDays(end, now);
      expiringSoon = daysRemaining <= 7;
    }
  }

  // Only show banner if there's something meaningful to surface
  const shouldShow = isExpired || expiringSoon || access.founder_override;
  if (!shouldShow) return null;

  const label = ACCESS_LABELS[access.access_mode] || access.access_mode;

  if (isExpired) {
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-amber-400">
            {label} — Billing not yet enabled
          </p>
          <p className="text-xs text-amber-400/70">Your access period has ended. Your data is safe — a team member will be in touch shortly.</p>
        </div>
      </div>
    );
  }

  if (expiringSoon) {
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-amber-400">
            {label} — {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} remaining
          </p>
          <p className="text-xs text-amber-400/70">Billing not yet enabled — no action needed right now.</p>
        </div>
        <button onClick={() => setDismissed(true)} className="text-amber-400/60 hover:text-amber-400 text-xs shrink-0">✕</button>
      </div>
    );
  }

  if (access.founder_override) {
    return (
      <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center gap-2">
        <Info className="w-4 h-4 text-primary shrink-0" />
        <p className="text-xs text-primary/80 flex-1">Founder override active — {label}</p>
        <button onClick={() => setDismissed(true)} className="text-primary/40 hover:text-primary/70 text-xs shrink-0">✕</button>
      </div>
    );
  }

  return null;
}