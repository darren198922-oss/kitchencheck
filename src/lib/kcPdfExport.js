import { jsPDF } from "jspdf";

const PAGE_W = 210;
const MARGIN = 20;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_Y = 287;

export const KC_PDF_TITLE = "KitchenCheck";
export const KC_PDF_SESSION_SUBTITLE = "Operational Kitchen Record";
export const KC_PDF_HISTORY_SUBTITLE = "Operational Kitchen History";

export function kcPdfSafeText(str) {
  if (str == null || str === "") return "";
  return String(str)
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\x20-\x7E\n]/g, "");
}

export function kcPdfFmtLondon(iso) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      timeZone: "Europe/London",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return kcPdfSafeText(String(iso));
  }
}

export function kcPdfFooterText(generatedAt) {
  return `KitchenCheck - Generated ${generatedAt} - Operational record only - not a compliance certificate`;
}

export function kcPdfSafeFilename(part, fallback = "report") {
  const slug = String(part ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return slug || fallback;
}

function kcPdfLocationSlug(locationName) {
  const slug = kcPdfSafeFilename(locationName, "");
  return slug || "kitchencheck";
}

function createPdfContext() {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = 20;

  const checkY = (needed = 10) => {
    if (y + needed > 270) {
      doc.addPage();
      y = 20;
    }
  };

  const drawDivider = (gap = 6) => {
    checkY(gap + 4);
    doc.setDrawColor(200);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += gap;
  };

  return { doc, checkY, drawDivider, getY: () => y, setY: (val) => { y = val; }, bumpY: (val) => { y += val; } };
}

function addPdfFooters(doc, generatedAt) {
  const footer = kcPdfFooterText(generatedAt);
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(160);
    doc.text(footer, MARGIN, FOOTER_Y, { maxWidth: CONTENT_W - 20 });
    doc.text(`Page ${i} of ${pageCount}`, PAGE_W - MARGIN, 290, { align: "right" });
    doc.setTextColor(0);
  }
}

function drawPdfHeader(doc, y, subtitle) {
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text(KC_PDF_TITLE, MARGIN, y);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text(subtitle, MARGIN, y + 6);
  doc.setTextColor(0);
  return y + 14;
}

function sessionIsFlagged(session) {
  return session.status === "flagged" || session.status === "issues_flagged";
}

function itemIsFlagged(item) {
  return item.flagged === true || item.answer === "no" || item.issue_status === "open";
}

function answerLabel(answer) {
  if (answer === "yes") return "Yes";
  if (answer === "no") return "No";
  return "N/A";
}

function issueStatusLabel(status) {
  const labels = {
    open: "Open",
    in_progress: "In Progress",
    resolved: "Resolved",
    not_required: "Not Required",
  };
  return labels[status] || kcPdfSafeText(status).replace(/_/g, " ");
}

function formatTempLogLine(log) {
  const dateTime = log.logged_at ? kcPdfFmtLondon(log.logged_at) : kcPdfSafeText(log.log_date || "-");
  const equipment = kcPdfSafeText(log.equipment_name || "Equipment");
  const tempVal = log.temperature != null
    ? `${log.temperature > 0 ? "+" : ""}${log.temperature}C`
    : "-";
  let line = `${dateTime} - ${equipment} - ${tempVal}`;
  if (log.logged_by) {
    line += ` - by ${kcPdfSafeText(log.logged_by)}`;
  }
  return line;
}

function appendIssueDetails(doc, ctx, item, indent = 6) {
  const { checkY, bumpY } = ctx;
  if (item.issue_status) {
    checkY(5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100);
    doc.text(`Issue status: ${issueStatusLabel(item.issue_status)}`, MARGIN + indent, ctx.getY());
    doc.setTextColor(0);
    bumpY(4);
  }
  if (item.resolution_note) {
    checkY(5);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(100);
    const lines = doc.splitTextToSize(`Resolution: ${kcPdfSafeText(item.resolution_note)}`, CONTENT_W - indent - 4);
    doc.text(lines, MARGIN + indent, ctx.getY());
    doc.setTextColor(0);
    bumpY(lines.length * 4 + 1);
  }
  if (item.resolved_by) {
    checkY(4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100);
    doc.text(`Actioned by: ${kcPdfSafeText(item.resolved_by)}`, MARGIN + indent, ctx.getY());
    doc.setTextColor(0);
    bumpY(4);
  }
}

export function downloadKcSessionPdf({ session, items = [], locationName }) {
  if (!session) throw new Error("Session is required");

  const sortedItems = [...items].sort((a, b) => (a.item_order || 0) - (b.item_order || 0));
  const generatedAt = kcPdfFmtLondon(new Date().toISOString());
  const ctx = createPdfContext();
  const { doc, checkY, drawDivider } = ctx;
  let y = drawPdfHeader(doc, 20, KC_PDF_SESSION_SUBTITLE);
  ctx.setY(y);

  drawDivider(8);
  y = ctx.getY();

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(kcPdfSafeText(session.template_name || "Checklist"), MARGIN, y);
  ctx.bumpY(7);

  const flaggedSession = sessionIsFlagged(session);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(flaggedSession ? 180 : 0, flaggedSession ? 100 : 130, 0);
  doc.text(flaggedSession ? "ISSUES FLAGGED" : "ALL CLEAR", MARGIN, ctx.getY());
  doc.setTextColor(0);
  ctx.bumpY(8);

  const metaRows = [
    ["Completed by", kcPdfSafeText(session.completed_by || "-")],
    ["Date", kcPdfSafeText(session.session_date || "-")],
    ["Submitted at", kcPdfFmtLondon(session.completed_at || session.submitted_at)],
    ["Record ID", kcPdfSafeText(session.id || "-")],
  ];
  if (session.location_name) metaRows.unshift(["Location", kcPdfSafeText(session.location_name)]);

  doc.setFontSize(9);
  metaRows.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, MARGIN, ctx.getY());
    doc.setFont("helvetica", "normal");
    doc.text(value, MARGIN + 32, ctx.getY());
    ctx.bumpY(6);
  });

  if (session.notes) {
    ctx.bumpY(2);
    doc.setFont("helvetica", "bold");
    doc.text("Notes:", MARGIN, ctx.getY());
    ctx.bumpY(5);
    doc.setFont("helvetica", "normal");
    const noteLines = doc.splitTextToSize(kcPdfSafeText(session.notes), CONTENT_W);
    doc.text(noteLines, MARGIN, ctx.getY());
    ctx.bumpY(noteLines.length * 5 + 2);
  }

  ctx.bumpY(4);
  drawDivider(8);

  const flagged = sortedItems.filter(itemIsFlagged);
  if (flagged.length > 0) {
    checkY(20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Flagged Items (${flagged.length})`, MARGIN, ctx.getY());
    ctx.bumpY(6);

    flagged.forEach((item) => {
      checkY(12);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(180, 100, 0);
      const lines = doc.splitTextToSize(`Flagged: ${kcPdfSafeText(item.item_text)}`, CONTENT_W - 4);
      doc.text(lines, MARGIN + 2, ctx.getY());
      doc.setTextColor(0);
      ctx.bumpY(lines.length * 5);

      if (item.note) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        const noteLines = doc.splitTextToSize(`Note: ${kcPdfSafeText(item.note)}`, CONTENT_W - 8);
        doc.text(noteLines, MARGIN + 6, ctx.getY());
        ctx.bumpY(noteLines.length * 4.5 + 1);
      }
      if (item.photo_url) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(80);
        doc.text("Photo attached", MARGIN + 6, ctx.getY());
        doc.setTextColor(0);
        ctx.bumpY(4);
      }
      appendIssueDetails(doc, ctx, item, 6);
      ctx.bumpY(2);
    });

    ctx.bumpY(2);
    drawDivider(8);
  }

  checkY(14);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Checklist Items", MARGIN, ctx.getY());
  ctx.bumpY(7);

  doc.setFillColor(240, 240, 240);
  doc.rect(MARGIN, ctx.getY() - 4, CONTENT_W, 7, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("#", MARGIN + 1, ctx.getY());
  doc.text("Item", MARGIN + 8, ctx.getY());
  doc.text("Answer", MARGIN + CONTENT_W - 20, ctx.getY());
  ctx.bumpY(5);
  doc.setDrawColor(220);
  doc.line(MARGIN, ctx.getY(), PAGE_W - MARGIN, ctx.getY());
  ctx.bumpY(4);

  sortedItems.forEach((item, idx) => {
    const itemLines = doc.splitTextToSize(kcPdfSafeText(item.item_text), CONTENT_W - 30);
    const rowH = Math.max(itemLines.length * 5, 6) + 4;
    checkY(rowH);

    if (itemIsFlagged(item)) {
      doc.setFillColor(255, 248, 235);
      doc.rect(MARGIN, ctx.getY() - 3, CONTENT_W, rowH, "F");
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(String(idx + 1), MARGIN + 1, ctx.getY());
    doc.setTextColor(0);
    doc.text(itemLines, MARGIN + 8, ctx.getY());

    doc.setFont("helvetica", "bold");
    if (item.answer === "yes") doc.setTextColor(0, 130, 0);
    else if (item.answer === "no") doc.setTextColor(180, 0, 0);
    else doc.setTextColor(120);
    doc.text(answerLabel(item.answer), MARGIN + CONTENT_W - 20, ctx.getY());
    doc.setTextColor(0);

    ctx.bumpY(rowH);

    if (item.note) {
      checkY(6);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(100);
      const noteLines = doc.splitTextToSize(`Note: ${kcPdfSafeText(item.note)}`, CONTENT_W - 12);
      doc.text(noteLines, MARGIN + 10, ctx.getY());
      doc.setTextColor(0);
      ctx.bumpY(noteLines.length * 4.5 + 1);
    }
    if (item.photo_url) {
      checkY(4);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100);
      doc.text("Photo attached", MARGIN + 10, ctx.getY());
      doc.setTextColor(0);
      ctx.bumpY(4);
    }
    if (itemIsFlagged(item) && (item.issue_status || item.resolution_note || item.resolved_by)) {
      appendIssueDetails(doc, ctx, item, 10);
    }

    doc.setDrawColor(235);
    doc.line(MARGIN, ctx.getY(), PAGE_W - MARGIN, ctx.getY());
    ctx.bumpY(2);
  });

  addPdfFooters(doc, generatedAt);

  const locSlug = kcPdfLocationSlug(locationName || session.location_name);
  const filename = `${locSlug}-${kcPdfSafeFilename(session.template_name || "session")}-${kcPdfSafeFilename(session.session_date || "report")}.pdf`;
  doc.save(filename);
  return filename;
}

export function downloadKcHistoryPdf({ sessions = [], itemsBySession = {}, temperatureLogs = [], locationName, startDate, endDate }) {
  const generatedAt = kcPdfFmtLondon(new Date().toISOString());
  const ctx = createPdfContext();
  const { doc, checkY, drawDivider } = ctx;
  let y = drawPdfHeader(doc, 20, KC_PDF_HISTORY_SUBTITLE);
  ctx.setY(y);

  drawDivider(8);

  const metaRows = [
    ["Location", kcPdfSafeText(locationName) || "All locations"],
    ["Date range", `${startDate} to ${endDate}`],
    ["Generated", generatedAt],
  ];

  doc.setFontSize(9);
  metaRows.forEach(([label, value]) => {
    checkY(7);
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, MARGIN, ctx.getY());
    doc.setFont("helvetica", "normal");
    doc.text(kcPdfSafeText(value), MARGIN + 30, ctx.getY());
    ctx.bumpY(6);
  });

  drawDivider(8);

  const allItems = Object.values(itemsBySession).flat();
  const allFlagged = allItems.filter(itemIsFlagged);
  const openFlagged = allFlagged.filter((i) => !i.issue_status || i.issue_status === "open");

  checkY(10);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Summary", MARGIN, ctx.getY());
  ctx.bumpY(7);

  const summaryRows = [
    ["Check sessions", String(sessions.length)],
    ["Temperature readings", String(temperatureLogs.length)],
    ["Flagged items", String(allFlagged.length)],
    ["Open / unresolved flagged items", String(openFlagged.length)],
  ];

  doc.setFontSize(9);
  summaryRows.forEach(([label, value]) => {
    checkY(6);
    doc.setFont("helvetica", "normal");
    doc.text(`${label}:`, MARGIN + 2, ctx.getY());
    doc.setFont("helvetica", "bold");
    doc.text(value, MARGIN + CONTENT_W - 10, ctx.getY(), { align: "right" });
    ctx.bumpY(6);
  });

  if (sessions.length === 0 && temperatureLogs.length === 0) {
    ctx.bumpY(4);
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(140);
    doc.text("No records found for this date range.", MARGIN + 2, ctx.getY());
    doc.setTextColor(0);
    ctx.bumpY(8);
  }

  if (sessions.length > 0) {
    drawDivider(8);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Check Sessions", MARGIN, ctx.getY());
    ctx.bumpY(8);

    sessions.forEach((session, idx) => {
      const items = (itemsBySession[session.id] || []).sort((a, b) => (a.item_order || 0) - (b.item_order || 0));
      const flaggedItems = items.filter(itemIsFlagged);
      checkY(30);

      doc.setFillColor(245, 245, 245);
      doc.rect(MARGIN, ctx.getY() - 4, CONTENT_W, 9, "F");

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);
      doc.text(kcPdfSafeText(session.template_name || "Checklist"), MARGIN + 2, ctx.getY());

      const flaggedSession = sessionIsFlagged(session);
      doc.setTextColor(flaggedSession ? 160 : 0, flaggedSession ? 80 : 120, 0);
      doc.text(flaggedSession ? "ISSUES NOTED" : "ALL CLEAR", PAGE_W - MARGIN - 2, ctx.getY(), { align: "right" });
      doc.setTextColor(0);
      ctx.bumpY(8);

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      const sessionTime = session.completed_at || session.submitted_at
        ? `at ${new Date(session.completed_at || session.submitted_at).toLocaleTimeString("en-GB", {
            timeZone: "Europe/London",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}`
        : "";
      const metaParts = [
        session.session_date || "",
        sessionTime,
        session.completed_by ? `by ${kcPdfSafeText(session.completed_by)}` : "",
      ].filter(Boolean).join(" - ");
      checkY(6);
      doc.text(metaParts, MARGIN + 2, ctx.getY());
      ctx.bumpY(6);

      if (session.notes) {
        checkY(6);
        doc.setFont("helvetica", "italic");
        const noteLines = doc.splitTextToSize(`Notes: ${kcPdfSafeText(session.notes)}`, CONTENT_W - 4);
        doc.text(noteLines, MARGIN + 2, ctx.getY());
        ctx.bumpY(noteLines.length * 4.5 + 2);
      }

      if (flaggedItems.length > 0) {
        checkY(8);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(160, 80, 0);
        doc.text("Flagged items:", MARGIN + 2, ctx.getY());
        doc.setTextColor(0);
        ctx.bumpY(5);

        flaggedItems.forEach((item) => {
          checkY(10);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(160, 80, 0);
          const flines = doc.splitTextToSize(`Flagged: ${kcPdfSafeText(item.item_text)}`, CONTENT_W - 8);
          doc.text(flines, MARGIN + 4, ctx.getY());
          doc.setTextColor(0);
          ctx.bumpY(flines.length * 4.5);

          if (item.note) {
            checkY(5);
            doc.setFont("helvetica", "italic");
            doc.setFontSize(7.5);
            doc.setTextColor(100);
            const fnLines = doc.splitTextToSize(`Note: ${kcPdfSafeText(item.note)}`, CONTENT_W - 10);
            doc.text(fnLines, MARGIN + 6, ctx.getY());
            doc.setTextColor(0);
            ctx.bumpY(fnLines.length * 4 + 1);
          }
          if (item.photo_url) {
            checkY(4);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(100);
            doc.text("Photo attached", MARGIN + 6, ctx.getY());
            doc.setTextColor(0);
            ctx.bumpY(4);
          }
          appendIssueDetails(doc, ctx, item, 6);
        });
        ctx.bumpY(2);
      } else if (sessionIsFlagged(session)) {
        checkY(6);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text("Session flagged - item details not available.", MARGIN + 2, ctx.getY());
        doc.setTextColor(0);
        ctx.bumpY(6);
      }

      ctx.bumpY(4);
      if (idx < sessions.length - 1) {
        checkY(4);
        doc.setDrawColor(225);
        doc.line(MARGIN, ctx.getY(), PAGE_W - MARGIN, ctx.getY());
        ctx.bumpY(6);
      }
    });
  }

  drawDivider(8);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Temperature Logs", MARGIN, ctx.getY());
  ctx.bumpY(8);

  if (temperatureLogs.length === 0) {
    checkY(8);
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(140);
    doc.text("No temperature readings recorded in this range.", MARGIN + 2, ctx.getY());
    doc.setTextColor(0);
    ctx.bumpY(8);
  } else {
    temperatureLogs.forEach((log) => {
      checkY(10);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(0);
      const line = formatTempLogLine(log);
      const lineParts = doc.splitTextToSize(line, CONTENT_W - 4);
      doc.text(lineParts, MARGIN + 2, ctx.getY());
      ctx.bumpY(lineParts.length * 4.5 + 1);

      if (log.note) {
        checkY(6);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7.5);
        doc.setTextColor(100);
        const noteLines = doc.splitTextToSize(`Note: ${kcPdfSafeText(log.note)}`, CONTENT_W - 8);
        doc.text(noteLines, MARGIN + 4, ctx.getY());
        doc.setTextColor(0);
        ctx.bumpY(noteLines.length * 4 + 2);
      }

      doc.setDrawColor(235);
      doc.line(MARGIN, ctx.getY(), PAGE_W - MARGIN, ctx.getY());
      ctx.bumpY(2);
    });
  }

  addPdfFooters(doc, generatedAt);

  const locSlug = kcPdfLocationSlug(locationName);
  const filename = `${locSlug}-history-${kcPdfSafeFilename(startDate)}-to-${kcPdfSafeFilename(endDate)}.pdf`;
  doc.save(filename);
  return filename;
}
