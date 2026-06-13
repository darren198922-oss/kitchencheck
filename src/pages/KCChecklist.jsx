import { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate, useParams } from "react-router-dom";
import { useLocation } from "@/lib/LocationContext";
import {
  getLocalDevTemplates,
  createLocalDevSession,
  createLocalDevCheckItems,
} from "@/lib/localDevKitchenCheckData";
import { listKcTemplates } from "@/lib/kitchencheckSupabase";
import { CheckCircle2, AlertTriangle, ChevronLeft, Flag, Check, X, Minus, Camera, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const LOCAL_DEV_AUTH = import.meta.env.VITE_LOCAL_DEV_AUTH === 'true';

// ── Staff name persistence ────────────────────────────────
const STAFF_KEY = "kc_recent_staff";
function getRecentStaff() {
  try { return JSON.parse(localStorage.getItem(STAFF_KEY) || "[]"); } catch { return []; }
}
function saveStaffName(name) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const prev = getRecentStaff().filter(n => n !== trimmed);
  localStorage.setItem(STAFF_KEY, JSON.stringify([trimmed, ...prev].slice(0, 5)));
}

// ── Draft save/restore ────────────────────────────────────
function draftKey(templateId) { return `kc_draft_${templateId}`; }
function saveDraft(templateId, staffName, items, currentIdx) {
  localStorage.setItem(draftKey(templateId), JSON.stringify({ staffName, items, currentIdx, savedAt: Date.now() }));
}
function loadDraft(templateId) {
  try {
    const raw = localStorage.getItem(draftKey(templateId));
    if (!raw) return null;
    const d = JSON.parse(raw);
    // Discard drafts older than 24h
    if (Date.now() - d.savedAt > 86400000) { clearDraft(templateId); return null; }
    return d;
  } catch { return null; }
}
function clearDraft(templateId) { localStorage.removeItem(draftKey(templateId)); }

// ── Photo capture ─────────────────────────────────────────
function PhotoCapture({ photoUrl, onPhotoChange, onSkipWithNote }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(false);

  const compressImage = (file) => new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        const MAX = 1280;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
          else { width = Math.round(width * MAX / height); height = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => resolve(new File([blob], file.name, { type: "image/jpeg" })), "image/jpeg", 0.82);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setUploadError(false);
    try {
      const compressed = await compressImage(file);
      if (LOCAL_DEV_AUTH) {
        onPhotoChange(URL.createObjectURL(compressed));
        setUploadError(false);
      } else {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: compressed });
        onPhotoChange(file_url);
        setUploadError(false);
      }
    } catch {
      setUploadError(true);
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleSkip = () => {
    setUploadError(false);
    onSkipWithNote?.();
  };

  if (photoUrl) {
    return (
      <div className="space-y-1">
        <div className="relative">
          <img src={photoUrl} alt="Evidence" className="w-full h-32 object-cover rounded-xl border border-amber-400/30" />
          <button onClick={() => onPhotoChange("")} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center">
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
        <button onClick={() => fileRef.current?.click()} className="text-[11px] text-amber-600 font-semibold underline flex items-center gap-1">
          <RotateCcw className="w-3 h-3" /> Retake photo
        </button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
      </div>
    );
  }

  return (
    <>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
      <button
        onClick={() => { setUploadError(false); fileRef.current?.click(); }}
        disabled={uploading}
        className="w-full h-11 rounded-xl border-2 border-dashed border-amber-400/40 bg-amber-500/5 flex items-center justify-center gap-2 text-sm font-semibold text-amber-600 active:scale-[0.97] transition-transform"
      >
        {uploading
          ? <><div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /> Uploading…</>
          : <><Camera className="w-4 h-4" /> Photograph the issue</>
        }
      </button>
      {LOCAL_DEV_AUTH && !uploadError && (
        <p className="text-[11px] text-muted-foreground text-center">
          Local dev: photo preview only (upload disabled during migration)
        </p>
      )}
      {uploadError && (
        <div className="rounded-xl bg-red-500/10 border border-red-400/40 p-3 space-y-2">
          <p className="text-xs font-bold text-red-600 flex items-center gap-1.5">
            ⚠ {LOCAL_DEV_AUTH ? "Photo preview failed" : "Upload failed — photo not saved"}
          </p>
          <p className="text-[11px] text-red-500/80">
            {LOCAL_DEV_AUTH
              ? "Continue without a photo, or try selecting another image."
              : "Check your signal and try again, or continue without a photo."}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex-1 h-9 rounded-lg bg-red-500 text-white text-xs font-bold active:scale-[0.97] transition-transform"
            >
              Retry upload
            </button>
            <button
              onClick={handleSkip}
              className="flex-1 h-9 rounded-lg border border-red-400/40 text-red-600 text-xs font-semibold active:scale-[0.97] transition-transform"
            >
              Continue without photo
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ── N/A reason prompt ─────────────────────────────────────
function NaReasonPrompt({ value, onChange }) {
  const PRESETS = ["Equipment not in use", "Area not applicable today", "Already checked separately"];
  return (
    <div className="space-y-2 pt-1">
      <p className="text-xs font-bold text-muted-foreground">Why N/A? <span className="font-normal">(optional but helpful)</span></p>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map(p => (
          <button key={p} onClick={() => onChange(value === p ? "" : p)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              value === p ? "bg-secondary border-secondary-foreground/20 text-foreground font-semibold" : "border-border text-muted-foreground"
            }`}>
            {p}
          </button>
        ))}
      </div>
      <input
        type="text"
        value={PRESETS.includes(value) ? "" : value}
        onChange={e => onChange(e.target.value)}
        placeholder="Or type a reason..."
        className="w-full h-9 px-3 rounded-lg border border-input bg-card text-xs focus:outline-none focus:ring-1 focus:ring-ring"
      />
    </div>
  );
}

// ── Staff name phase ──────────────────────────────────────
function StaffNamePhase({ template, onStart, hasDraft, onResumeDraft, draftStaffName }) {
  const navigate = useNavigate();
  const recent = getRecentStaff();
  const prefilled = recent[0] || "";

  // "confirm" = asking if prefilled name is correct, "enter" = editing name
  const [mode, setMode] = useState(prefilled ? "confirm" : "enter");
  const [name, setName] = useState(prefilled);

  // Draft resume confirmation state
  const [showDraftConfirm, setShowDraftConfirm] = useState(false);

  const handleConfirmYes = () => {
    onStart(name.trim());
  };
  const handleConfirmNo = () => {
    setName("");
    setMode("enter");
  };

  const handleDraftResumeYes = () => {
    onResumeDraft(draftStaffName);
  };
  const handleDraftChangeStaff = () => {
    setShowDraftConfirm(false);
    setMode("enter");
    setName("");
    // Resume draft but with a new name — parent handles this via onResumeDraft with override
    onResumeDraft(null); // null = keep draft answers but prompt for new name
  };

  return (
    <div className="p-4 max-w-lg mx-auto flex flex-col gap-5 pt-6">
      <div>
        <button onClick={() => navigate("/")} className="flex items-center gap-1.5 text-sm text-muted-foreground mb-5 -ml-1">
          <ChevronLeft className="w-4 h-4" /> Today
        </button>
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">{template.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5 capitalize">
              {template.checklist_type?.replace(/_/g, " ")} · {template.items?.length} items
            </p>
          </div>
        </div>
      </div>

      {/* Resume draft banner — with identity check */}
      {hasDraft && !showDraftConfirm && (
        <button
          onClick={() => setShowDraftConfirm(true)}
          className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-left"
        >
          <RotateCcw className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-700 dark:text-amber-400">Resume unfinished check</p>
            <p className="text-xs text-amber-600/80">
              {draftStaffName ? `Started by ${draftStaffName} · ` : ""}Continue from where you left off
            </p>
          </div>
        </button>
      )}

      {/* Draft identity confirmation */}
      {hasDraft && showDraftConfirm && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/25 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
              Continue as {draftStaffName || "previous staff member"}?
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 h-10" onClick={handleDraftResumeYes}>
              Yes, continue
            </Button>
            <Button size="sm" variant="outline" className="flex-1 h-10" onClick={handleDraftChangeStaff}>
              Change staff member
            </Button>
          </div>
        </div>
      )}

      {/* Staff confirmation — if prefilled name exists */}
      {mode === "confirm" && !showDraftConfirm && (
        <div className="rounded-2xl bg-secondary/50 border border-border p-4 space-y-3">
          <p className="text-sm font-bold">Is this still <span className="text-primary">{name}</span>?</p>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 h-10" onClick={handleConfirmYes}>
              Yes, continue
            </Button>
            <Button size="sm" variant="outline" className="flex-1 h-10" onClick={handleConfirmNo}>
              No, change name
            </Button>
          </div>
        </div>
      )}

      {/* Name entry — shown when no prefill or user chose "No" */}
      {mode === "enter" && !showDraftConfirm && (
        <div className="space-y-2.5">
          <label className="text-sm font-bold">Who's completing this check?</label>
          {recent.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {recent.map(n => (
                <button key={n} onClick={() => setName(n)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                    name === n ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground"
                  }`}>
                  {n}
                </button>
              ))}
            </div>
          )}
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={recent.length > 0 ? "Or type a different name" : "Enter your name"}
            className="w-full h-14 px-4 rounded-xl border-2 border-input bg-card text-base focus:outline-none focus:border-primary transition-colors"
            autoFocus
            onKeyDown={e => e.key === "Enter" && name.trim() && onStart(name.trim())}
          />
          <Button className="h-14 text-base font-bold w-full" disabled={!name.trim()} onClick={() => onStart(name.trim())}>
            Begin Check →
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Main checklist page ───────────────────────────────────
export default function KCChecklist() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const { activeLocationId, activeLocation } = useLocation();

  const [template, setTemplate] = useState(null);
  const [items, setItems] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [staffName, setStaffName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [phase, setPhase] = useState("name");
  const [sessionNotes, setSessionNotes] = useState("");
  const [hasDraft, setHasDraft] = useState(false);
  const [draftStaffName, setDraftStaffName] = useState("");
  const [answerFlash, setAnswerFlash] = useState(null); // brief feedback state

  useEffect(() => {
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        let found;
        if (LOCAL_DEV_AUTH) {
          found = getLocalDevTemplates().find(t => t.id === templateId);
        } else {
          const all = await listKcTemplates();
          found = all.find(t => t.id === templateId);
        }
        if (!found) {
          navigate("/");
          return;
        }
        setTemplate(found);
        setItems(
          (found.items || []).map((text, i) => ({
            item_text: text, answer: null, flagged: false, note: "", photo_url: "", na_reason: "", item_order: i,
          }))
        );
        const draft = loadDraft(templateId);
        setHasDraft(!!draft);
        if (draft) setDraftStaffName(draft.staffName || "");
      } catch (err) {
        console.error("KCChecklist load failed:", err);
        setLoadError("Couldn't load this checklist. Please go back and try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [templateId]);

  // Auto-save draft whenever items/currentIdx change (only during checking phase)
  useEffect(() => {
    if (phase === "checking" && template) {
      saveDraft(templateId, staffName, items, currentIdx);
    }
  }, [items, currentIdx, phase]);

  const current = items[currentIdx];
  const answeredCount = items.filter(i => i.answer !== null).length;
  const progress = items.length > 0 ? (answeredCount / items.length) * 100 : 0;
  const allAnswered = items.every(i => i.answer !== null);

  const updateCurrent = (patch) => {
    setItems(prev => prev.map((item, i) => i === currentIdx ? { ...item, ...patch } : item));
  };

  const handleAnswer = (answer) => {
    const flagged = answer === "no";
    updateCurrent({ answer, flagged, na_reason: answer !== "na" ? "" : current?.na_reason });
    setAnswerFlash(answer);
    setTimeout(() => setAnswerFlash(null), 350);
    if (answer === "yes" && currentIdx < items.length - 1) {
      setTimeout(() => setCurrentIdx(i => i + 1), 350);
    }
  };

  const handleNext = () => { if (currentIdx < items.length - 1) setCurrentIdx(i => i + 1); };
  const handlePrev = () => { if (currentIdx > 0) setCurrentIdx(i => i - 1); };

  const handleStart = (name) => {
    saveStaffName(name);
    setStaffName(name);
    setPhase("checking");
  };

  // nameOverride=null means keep draft but require staff to re-enter name
  const handleResumeDraft = (nameOverride) => {
    const draft = loadDraft(templateId);
    if (!draft) return;
    setItems(draft.items);
    setCurrentIdx(draft.currentIdx);
    if (nameOverride !== null) {
      saveStaffName(draft.staffName);
      setStaffName(draft.staffName);
      setPhase("checking");
    } else {
      // Keep draft items loaded but go to name entry for new staff
      setStaffName("");
      setPhase("name_after_draft");
    }
  };

  const handleReview = () => {
    if (!allAnswered) return;
    setPhase("review");
  };

  const handleSubmit = async () => {
    if (!allAnswered) return;
    setSubmitting(true);
    setSubmitError(null);
    const now = new Date().toISOString();
    const today = format(new Date(), "yyyy-MM-dd");
    const anyFlagged = items.some(i => i.flagged);

    try {
      if (LOCAL_DEV_AUTH) {
        const sessionId = `local-session-${Date.now()}`;
        const session = createLocalDevSession({
          id: sessionId,
          template_id: template.id,
          template_name: template.name,
          location_id: activeLocationId || template.location_id || "",
          location_name: activeLocation?.name || "",
          completed_by: staffName,
          completed_at: now,
          session_date: today,
          status: anyFlagged ? "flagged" : "completed",
          notes: sessionNotes,
        });
        const savedItems = createLocalDevCheckItems(
          sessionId,
          items.map(item => ({
            item_text: item.item_text,
            answer: item.answer,
            flagged: item.flagged,
            note: item.answer === "na" && item.na_reason ? item.na_reason : item.note,
            photo_url: item.photo_url || undefined,
            item_order: item.item_order,
          }))
        );
        console.log("Local dev checklist submitted:", { session, items: savedItems });
      } else {
        const sessionPayload = {
          id: `pending-session-${Date.now()}`,
          template_id: template.id,
          template_name: template.name,
          location_id: activeLocationId || template.location_id || "",
          location_name: activeLocation?.name || "",
          completed_by: staffName,
          completed_at: now,
          session_date: today,
          status: anyFlagged ? "flagged" : "completed",
          notes: sessionNotes,
        };
        const checkItemsPayload = items.map(item => ({
          item_text: item.item_text,
          answer: item.answer,
          flagged: item.flagged,
          note: item.answer === "na" && item.na_reason ? item.na_reason : item.note,
          photo_url: item.photo_url || undefined,
          item_order: item.item_order,
        }));
        console.log("KitchenCheck checklist submitted (sessions not migrated yet):", {
          session: sessionPayload,
          items: checkItemsPayload,
        });
      }

      clearDraft(templateId);
      setPhase("done");
    } catch (err) {
      console.error("KCChecklist submit failed:", err);
      setSubmitError("Couldn't save this check. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (loadError) {
    return (
      <div className="p-4 max-w-lg mx-auto flex flex-col items-center gap-4 pt-16 text-center">
        <AlertTriangle className="w-10 h-10 text-amber-500" />
        <p className="text-sm text-muted-foreground">{loadError}</p>
        <Button variant="outline" onClick={() => navigate("/")}>Back to Dashboard</Button>
      </div>
    );
  }

  if (!template) return null;

  // ── Phase: name (or name re-entry after draft change-staff) ──
  if (phase === "name" || phase === "name_after_draft") {
    return (
      <StaffNamePhase
        template={template}
        onStart={handleStart}
        hasDraft={hasDraft && phase === "name"}
        draftStaffName={draftStaffName}
        onResumeDraft={handleResumeDraft}
      />
    );
  }

  // ── Phase: done ──
  if (phase === "done") {
    const flaggedItems = items.filter(i => i.flagged);
    return (
      <div className="p-4 max-w-lg mx-auto flex flex-col gap-5 pt-8">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Check Submitted</h1>
            <p className="text-sm text-muted-foreground mt-1">{template.name} · {format(new Date(), "HH:mm")}</p>
            <p className="text-sm text-muted-foreground">{staffName}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[["yes","emerald","Yes"],["no","red","No"],["na","muted","N/A"]].map(([ans, col, label]) => (
            <div key={ans} className="rounded-xl bg-card border border-border p-3 text-center">
              <p className={`text-xl font-bold text-${col}-500`}>{items.filter(i => i.answer === ans).length}</p>
              <p className="text-[10px] text-muted-foreground font-semibold uppercase mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {flaggedItems.length > 0 && (
          <div className="rounded-2xl bg-amber-500/10 border border-amber-500/25 p-4 space-y-2.5">
            <p className="text-sm font-bold text-amber-600 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {flaggedItems.length} item{flaggedItems.length !== 1 ? "s" : ""} flagged
            </p>
            {flaggedItems.map((item, i) => (
              <div key={i} className="pl-3 border-l-2 border-amber-400/50">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-300">{item.item_text}</p>
                {item.note && <p className="text-xs text-amber-600/70 mt-0.5 italic">{item.note}</p>}
              </div>
            ))}
          </div>
        )}

        <Button className="w-full h-14 text-base font-bold" onClick={() => navigate("/")}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  // ── Phase: review ──
  if (phase === "review") {
    const ICONS = { yes: "✓", no: "✗", na: "—" };
    const COLORS = {
      yes: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
      no: "text-red-600 bg-red-500/10 border-red-500/20",
      na: "text-muted-foreground bg-secondary border-border",
    };
    return (
      <div className="flex flex-col max-w-lg mx-auto" style={{ height: "calc(100dvh - 112px)" }}>
        <div className="px-4 pt-4 pb-2 border-b border-border">
          <h2 className="text-lg font-bold">Review before submitting</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Check your answers before saving this record.</p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {items.map((item, i) => (
            <div key={i} className={`flex items-start gap-3 p-3.5 rounded-xl border ${item.flagged ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-card"}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold border ${COLORS[item.answer] || COLORS.na}`}>
                {ICONS[item.answer] || "—"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-snug">{item.item_text}</p>
                {item.flagged && <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wide mt-0.5">⚠ Flagged</p>}
                {item.note && <p className="text-xs text-muted-foreground mt-0.5 italic">{item.note}</p>}
                {item.photo_url && <p className="text-[10px] text-primary mt-0.5 font-semibold">📷 Photo attached</p>}
              </div>
              <button
                onClick={() => { setCurrentIdx(i); setPhase("checking"); }}
                className="text-xs text-primary font-bold shrink-0 py-1 px-2 rounded-lg bg-primary/8 active:scale-[0.97] transition-transform"
              >
                Edit
              </button>
            </div>
          ))}

          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-bold text-muted-foreground">Notes for this check (optional)</label>
            <textarea
              value={sessionNotes}
              onChange={e => setSessionNotes(e.target.value)}
              placeholder="Any overall comments..."
              className="w-full h-14 px-3 py-2 rounded-xl border border-input bg-card text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="px-4 pb-4 pt-3 border-t border-border space-y-2">
          {submitError && (
            <p className="text-xs text-red-600 text-center">{submitError}</p>
          )}
          <Button
            className="w-full h-14 text-base font-bold bg-emerald-600 hover:bg-emerald-700"
            disabled={submitting}
            onClick={handleSubmit}
          >
            <CheckCircle2 className="w-5 h-5" />
            {submitting ? "Saving..." : "Submit Record"}
          </Button>
          <button
            onClick={() => setPhase("checking")}
            className="w-full h-10 rounded-xl text-sm font-semibold text-muted-foreground border border-border bg-card active:scale-[0.98] transition-transform"
          >
            ← Edit answers
          </button>
        </div>
      </div>
    );
  }

  // ── Phase: checking ──
  const isLastItem = currentIdx === items.length - 1;

  return (
    <div className="flex flex-col max-w-lg mx-auto" style={{ height: "calc(100dvh - 112px)" }}>

      {/* Progress */}
      <div className="px-4 pt-3 pb-2 space-y-2">
        <div className="flex items-center justify-between">
          <button onClick={handlePrev} disabled={currentIdx === 0} className="flex items-center gap-1 text-sm text-muted-foreground disabled:opacity-30 -ml-1 py-1 px-1">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <span className="text-xs font-bold text-muted-foreground tabular-nums">
            Item {currentIdx + 1} of {items.length}
          </span>
          <div className="w-12" />
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        {items.length <= 12 && (
          <div className="flex gap-1.5 justify-center">
            {items.map((item, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${
                i === currentIdx ? "w-4 bg-primary" :
                item.answer !== null ? (item.flagged ? "w-1.5 bg-amber-500" : "w-1.5 bg-emerald-500") :
                "w-1.5 bg-muted-foreground/30"
              }`} />
            ))}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col justify-between px-4 pb-2 overflow-y-auto">
        <div className="flex-1 flex flex-col justify-center gap-4">
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-muted-foreground capitalize">{template.checklist_type?.replace(/_/g, " ")}</p>
            <h2 className="text-2xl font-bold leading-snug">{current?.item_text}</h2>
          </div>

          <div className="flex flex-col gap-3 relative">
            {/* Answer flash overlay */}
            {answerFlash && (
              <div className={`absolute inset-0 rounded-2xl flex items-center justify-center pointer-events-none z-10 transition-opacity ${
                answerFlash === "yes" ? "bg-emerald-500/20" :
                answerFlash === "no" ? "bg-red-500/20" : "bg-secondary/50"
              }`}>
                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                  answerFlash === "yes" ? "bg-emerald-500" :
                  answerFlash === "no" ? "bg-red-500" : "bg-secondary"
                }`}>
                  {answerFlash === "yes" && <Check className="w-7 h-7 text-white" />}
                  {answerFlash === "no" && <X className="w-7 h-7 text-white" />}
                  {answerFlash === "na" && <Minus className="w-7 h-7 text-muted-foreground" />}
                </div>
              </div>
            )}
            <button onClick={() => handleAnswer("yes")}
              className={`h-16 rounded-2xl border-2 text-lg font-bold transition-all active:scale-[0.97] flex items-center justify-center gap-3 ${
                current?.answer === "yes" ? "bg-emerald-500 text-white border-emerald-500" : "bg-card border-border text-foreground hover:border-emerald-400"
              }`}>
              <Check className="w-5 h-5" /> Yes
            </button>
            <button onClick={() => handleAnswer("no")}
              className={`h-16 rounded-2xl border-2 text-lg font-bold transition-all active:scale-[0.97] flex items-center justify-center gap-3 ${
                current?.answer === "no" ? "bg-red-500 text-white border-red-500" : "bg-card border-border text-foreground hover:border-red-400"
              }`}>
              <X className="w-5 h-5" /> No
            </button>
            <button onClick={() => handleAnswer("na")}
              className={`h-12 rounded-xl border-2 text-sm font-semibold transition-all active:scale-[0.97] flex items-center justify-center gap-2 ${
                current?.answer === "na" ? "bg-secondary text-secondary-foreground border-secondary-foreground/20" : "bg-transparent border-border text-muted-foreground"
              }`}>
              <Minus className="w-4 h-4" /> Not applicable
            </button>
          </div>

          {current?.answer === "na" && (
            <NaReasonPrompt value={current.na_reason || ""} onChange={v => updateCurrent({ na_reason: v })} />
          )}

          {current?.answer && current.answer !== "no" && current.answer !== "na" && (
            <button
              onClick={() => updateCurrent({ flagged: !current.flagged })}
              className={`flex items-center justify-center gap-2 text-sm font-semibold py-2 rounded-xl transition-colors ${
                current.flagged ? "text-amber-600 bg-amber-500/10" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Flag className="w-4 h-4" />
              {current.flagged ? "Flagged as issue" : "Flag as issue"}
            </button>
          )}

          {current?.flagged && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-amber-600">Issue note (optional)</label>
              <textarea
                value={current.note}
                onChange={e => updateCurrent({ note: e.target.value })}
                placeholder="Describe the issue..."
                className="w-full h-14 px-3 py-2 rounded-xl border-2 border-amber-400/40 bg-amber-500/5 text-sm resize-none focus:outline-none focus:border-amber-400"
              />
              <PhotoCapture
                photoUrl={current.photo_url}
                onPhotoChange={url => updateCurrent({ photo_url: url })}
                onSkipWithNote={() => updateCurrent({
                  note: current.note ? current.note + " · Photo not attached" : "Photo not attached"
                })}
              />
            </div>
          )}
        </div>

        <div className="space-y-2.5 pt-3 border-t border-border">
          {!isLastItem ? (
            <Button className="w-full h-14 text-base font-bold" disabled={!current?.answer} onClick={handleNext}>
              Next →
            </Button>
          ) : (
            <Button
              className="w-full h-14 text-base font-bold"
              disabled={!allAnswered}
              onClick={handleReview}
            >
              <CheckCircle2 className="w-5 h-5" />
              Review check →
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );
}