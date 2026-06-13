import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import {
  getLocalDevSessions,
  getLocalDevCheckItemsBySessionId,
  deleteLocalDevSession,
} from "@/lib/localDevKitchenCheckData";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, X, AlertTriangle, ChevronLeft, Minus, FileDown, Trash2 } from "lucide-react";
import IssueResolutionPanel from "@/components/sessions/IssueResolutionPanel";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const LOCAL_DEV_AUTH = import.meta.env.VITE_LOCAL_DEV_AUTH === 'true';

const ANSWER_ICONS = {
  yes: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  no: { icon: X, color: "text-red-500", bg: "bg-red-500/10" },
  na: { icon: Minus, color: "text-muted-foreground", bg: "bg-secondary" },
};

export default function KCSessionDetail() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [checkItems, setCheckItems] = useState([]);
  const handleItemUpdated = (updated) => {
    setCheckItems(prev => prev.map(i => i.id === updated.id ? updated : i));
  };
  const [loading, setLoading] = useState(true);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        let found;
        let items;
        if (LOCAL_DEV_AUTH) {
          found = getLocalDevSessions().find(s => s.id === sessionId);
          items = getLocalDevCheckItemsBySessionId(sessionId);
        } else {
          const [allSessions, allItems] = await Promise.all([
            base44.entities.CheckSession.list("-completed_at", 200),
            base44.entities.CheckItem.list("item_order", 500),
          ]);
          found = allSessions.find(s => s.id === sessionId);
          items = allItems
            .filter(i => i.session_id === sessionId)
            .sort((a, b) => (a.item_order || 0) - (b.item_order || 0));
        }
        if (!found) {
          navigate("/history");
          return;
        }
        setSession(found);
        setCheckItems(items);
      } catch (err) {
        console.error("KCSessionDetail load failed:", err);
        setLoadError("Couldn't load this record. Please go back and try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      if (LOCAL_DEV_AUTH) {
        deleteLocalDevSession(session.id);
      } else {
        await Promise.all(checkItems.map(item => base44.entities.CheckItem.delete(item.id)));
        await base44.entities.CheckSession.delete(session.id);
      }
      toast.success("Record deleted");
      navigate("/history");
    } catch (err) {
      console.error("KCSessionDetail delete failed:", err);
      toast.error("Delete failed — please try again");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const handleExportPdf = async () => {
    if (exportingPdf) return;
    if (LOCAL_DEV_AUTH) {
      toast.error("PDF export is disabled in local migration mode");
      return;
    }
    setExportingPdf(true);
    try {
      const response = await base44.functions.invoke("generateSessionPdf", { sessionId });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kitchencheck-${session.template_name?.replace(/\s+/g, "-").toLowerCase()}-${session.session_date}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF saved");
    } catch (err) {
      console.error("KCSessionDetail PDF export failed:", err);
      toast.error("PDF generation failed — please try again");
    } finally {
      setExportingPdf(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (loadError) {
    return (
      <div className="p-4 max-w-lg mx-auto flex flex-col items-center gap-4 pt-16 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-500" />
        <p className="text-sm text-muted-foreground">{loadError}</p>
        <Button variant="outline" onClick={() => navigate("/history")}>Back to History</Button>
      </div>
    );
  }

  if (!session) return null;

  const flaggedItems = checkItems.filter(i => i.flagged);

  return (
    <div className="p-4 max-w-lg mx-auto space-y-5 pb-8">
      {/* Back + export */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate("/history")} className="flex items-center gap-1 text-sm text-muted-foreground">
          <ChevronLeft className="w-4 h-4" /> History
        </button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-9"
            onClick={handleExportPdf}
            disabled={exportingPdf}
          >
            <FileDown className="w-4 h-4" />
            {exportingPdf ? "Preparing PDF…" : "Save PDF"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 w-9 p-0 text-destructive border-destructive/30 hover:bg-destructive/5"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="rounded-xl bg-destructive/5 border border-destructive/30 p-4 space-y-3">
          <p className="text-sm font-semibold text-destructive">Delete this kitchen record?</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            This will remove the check session and its checklist answers. This cannot be undone.
          </p>
          <div className="flex gap-2">
            <Button variant="destructive" size="sm" className="flex-1 h-10" disabled={deleting} onClick={handleDelete}>
              {deleting ? "Deleting…" : "Delete record"}
            </Button>
            <Button variant="secondary" size="sm" className="flex-1 h-10" onClick={() => setConfirmDelete(false)} disabled={deleting}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Header card */}
      <div className="rounded-2xl bg-card border border-border p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold">{session.template_name}</h1>
            <p className="text-sm text-muted-foreground">{session.completed_by}</p>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full shrink-0 ${
            session.status === "flagged"
              ? "bg-amber-500/10 text-amber-600"
              : "bg-emerald-500/10 text-emerald-600"
          }`}>
            {session.status === "flagged" ? "⚠ Issues noted" : "✓ All clear"}
          </span>
        </div>
        <div className="text-xs text-muted-foreground space-y-0.5">
          {session.location_name && <p className="font-medium text-foreground/60">Location: {session.location_name}</p>}
          <p>{session.session_date ? (() => { try { return format(parseISO(session.session_date), "EEEE, d MMMM yyyy"); } catch { return session.session_date; } })() : "—"}</p>
          {session.completed_at && <p>Completed at {format(new Date(session.completed_at), "HH:mm")}</p>}
        </div>
        {session.notes && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs font-bold text-muted-foreground mb-1">Notes</p>
            <p className="text-sm">{session.notes}</p>
          </div>
        )}
      </div>

      {/* Flagged summary with photos */}
      {flaggedItems.length > 0 && (
        <div className="rounded-2xl bg-amber-500/8 border border-amber-500/25 p-4 space-y-3">
          <p className="text-sm font-bold text-amber-600 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {flaggedItems.length} flagged item{flaggedItems.length !== 1 ? "s" : ""} — follow-up required
          </p>
          {flaggedItems.map(item => (
            <div key={item.id} className="pl-3 border-l-2 border-amber-400/50 space-y-2">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-300">{item.item_text}</p>
              {item.note && <p className="text-xs text-amber-600/80 italic">{item.note}</p>}
              {item.photo_url && (
                <a href={item.photo_url} target="_blank" rel="noopener noreferrer">
                  <img
                    src={item.photo_url}
                    alt="Issue evidence"
                    className="w-full max-h-48 object-cover rounded-xl border border-amber-400/30 mt-1"
                  />
                  <p className="text-[10px] text-amber-500/70 mt-1">Tap photo to enlarge</p>
                </a>
              )}
              <IssueResolutionPanel item={item} onUpdated={handleItemUpdated} />
            </div>
          ))}
        </div>
      )}

      {/* All items */}
      <div>
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Full record</p>
        <div className="space-y-2">
          {checkItems.map(item => {
            const config = ANSWER_ICONS[item.answer] || ANSWER_ICONS.na;
            const Icon = config.icon;
            return (
              <div key={item.id} className={`flex items-start gap-3 p-3.5 rounded-xl border ${
                item.flagged ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-card"
              }`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${config.bg}`}>
                  <Icon className={`w-4 h-4 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="text-sm font-medium">{item.item_text}</p>
                  {item.flagged && <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">⚠ Flagged</span>}
                  {item.note && <p className="text-xs text-muted-foreground">{item.note}</p>}
                  {item.photo_url && (
                    <a href={item.photo_url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={item.photo_url}
                        alt="Evidence photo"
                        className="w-24 h-24 object-cover rounded-lg border border-border mt-1"
                      />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}