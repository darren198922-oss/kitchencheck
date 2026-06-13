import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { format, subDays, startOfMonth } from "date-fns";
import { X, FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const LOCAL_DEV_AUTH = import.meta.env.VITE_LOCAL_DEV_AUTH === 'true';

const RANGE_OPTIONS = [
  { label: "Today", value: "today" },
  { label: "Last 7 days", value: "last7" },
  { label: "This month", value: "month" },
  { label: "Custom range", value: "custom" },
];

function getDateRange(rangeValue, customStart, customEnd) {
  const today = format(new Date(), "yyyy-MM-dd");
  switch (rangeValue) {
    case "today":
      return { startDate: today, endDate: today };
    case "last7":
      return { startDate: format(subDays(new Date(), 6), "yyyy-MM-dd"), endDate: today };
    case "month":
      return { startDate: format(startOfMonth(new Date()), "yyyy-MM-dd"), endDate: today };
    case "custom":
      return { startDate: customStart, endDate: customEnd };
    default:
      return { startDate: today, endDate: today };
  }
}

export default function ExportHistoryModal({ locationId, locationName, onClose }) {
  const [range, setRange] = useState("last7");
  const [customStart, setCustomStart] = useState(format(subDays(new Date(), 6), "yyyy-MM-dd"));
  const [customEnd, setCustomEnd] = useState(format(new Date(), "yyyy-MM-dd"));
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    const { startDate, endDate } = getDateRange(range, customStart, customEnd);
    if (!startDate || !endDate || startDate > endDate) {
      toast.error("Please check your date range");
      return;
    }
    setExporting(true);
    try {
      if (LOCAL_DEV_AUTH) {
        toast.error("PDF export is disabled in local migration mode");
        return;
      }
      const response = await base44.functions.invoke("generateHistoryPdf", {
        locationId,
        locationName,
        startDate,
        endDate,
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kitchencheck-history-${startDate}-to-${endDate}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("History PDF saved");
      onClose();
    } catch (err) {
      console.error("ExportHistoryModal export failed:", err);
      toast.error("Export failed — please try again");
    } finally {
      setExporting(false);
    }
  };

  const { startDate, endDate } = getDateRange(range, customStart, customEnd);
  const rangeValid = startDate && endDate && startDate <= endDate;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4 pb-4 sm:pb-0">
      <div className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-xl space-y-5 p-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold">Export History PDF</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {locationName ? `Records for: ${locationName}` : "All locations"} — operational record only
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-secondary text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Range selector */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Date range</p>
          <div className="grid grid-cols-2 gap-2">
            {RANGE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={`h-11 rounded-xl text-sm font-medium border transition-colors ${
                  range === opt.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-secondary text-secondary-foreground border-transparent"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom range inputs */}
        {range === "custom" && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Custom range</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">From</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">To</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            {!rangeValid && (
              <p className="text-xs text-destructive">End date must be on or after start date</p>
            )}
          </div>
        )}

        {/* Range preview */}
        {rangeValid && (
          <div className="rounded-xl bg-secondary/50 px-3 py-2.5 text-xs text-muted-foreground">
            Exporting records from <span className="font-semibold text-foreground">{startDate}</span> to <span className="font-semibold text-foreground">{endDate}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button variant="secondary" className="flex-1 h-11" onClick={onClose} disabled={exporting}>
            Cancel
          </Button>
          <Button
            className="flex-1 h-11 gap-2"
            disabled={!rangeValid || exporting}
            onClick={handleExport}
          >
            {exporting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Preparing PDF…</>
            ) : (
              <><FileDown className="w-4 h-4" /> Export PDF</>
            )}
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground text-center leading-relaxed -mt-2">
          Exports records for the selected location only. Operational record — not a compliance certificate.
        </p>
      </div>
    </div>
  );
}