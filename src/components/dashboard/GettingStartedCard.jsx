import { Link } from "react-router-dom";
import { CheckCircle2, Circle, UserPlus, ClipboardList, Send } from "lucide-react";

const steps = [
  {
    label: "Add your first customer",
    description: "Who did you do the job for?",
    href: "/customers/new",
    doneKey: "hasCustomer",
  },
  {
    label: "Log your first job",
    description: "Record what you did on site",
    href: "/records/new",
    doneKey: "hasRecord",
  },
  {
    label: "Send proof to your customer",
    description: "Email them a clean job record",
    href: "/documents",
    doneKey: null, // always shown as actionable until fully hidden
  },
];

export default function GettingStartedCard({ hasCustomer, hasRecord }) {
  // Hide once both are done — the "send proof" step becomes naturally discoverable
  if (hasCustomer && hasRecord) return null;

  return (
    <div className="rounded-2xl bg-card border border-border p-5 space-y-4">
      <div>
        <p className="text-sm font-semibold">Get started with WorkMark</p>
        <p className="text-xs text-muted-foreground mt-0.5">Three steps to your first proof of work</p>
      </div>

      <div className="space-y-3">
        {/* Step 1 */}
        <StepRow
          icon={UserPlus}
          label="Add your first customer"
          description="Who did you do the job for?"
          done={hasCustomer}
          href="/customers/new"
        />
        {/* Step 2 */}
        <StepRow
          icon={ClipboardList}
          label="Log your first job"
          description="Record what you did on site"
          done={hasRecord}
          href="/records/new"
        />
        {/* Step 3 — always shown as next action */}
        <StepRow
          icon={Send}
          label="Send proof to your customer"
          description="Email them a clean job record"
          done={false}
          href="/documents"
        />
      </div>
    </div>
  );
}

function StepRow({ icon: Icon, label, description, done, href }) {
  const content = (
    <div className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${done ? "opacity-50" : "hover:bg-secondary/60 cursor-pointer"}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-emerald-500/15" : "bg-secondary"}`}>
        {done
          ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          : <Icon className="w-4 h-4 text-muted-foreground" />
        }
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : ""}`}>{label}</p>
        {!done && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
  );

  if (done) return content;
  return <Link to={href}>{content}</Link>;
}