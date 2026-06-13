import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { sessionId } = await req.json();
  if (!sessionId) return Response.json({ error: 'sessionId required' }, { status: 400 });

  // Fetch session + items
  const [allSessions, allItems] = await Promise.all([
    base44.entities.CheckSession.filter({ created_by_id: user.id }, '-completed_at', 500),
    base44.entities.CheckItem.filter({ created_by_id: user.id }, 'item_order', 2000),
  ]);

  const session = allSessions.find(s => s.id === sessionId);
  if (!session) return Response.json({ error: 'Session not found' }, { status: 404 });

  const items = allItems
    .filter(i => i.session_id === sessionId)
    .sort((a, b) => (a.item_order || 0) - (b.item_order || 0));

  // ASCII-safe text sanitiser — strips non-latin1 characters that cause encoding artefacts
  const safeText = (str) => (str || '').replace(/[\u2013\u2014]/g, '-').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[^\x00-\xFF]/g, '');

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = 20;

  const checkY = (needed = 10) => {
    if (y + needed > 270) { doc.addPage(); y = 20; }
  };

  // ── HEADER ──────────────────────────────────────────────
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('KitchenCheck', margin, y);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120);
  doc.text('Operational Kitchen Record', margin, y + 6);
  doc.setTextColor(0);

  // Divider
  y += 14;
  doc.setDrawColor(200);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // ── SESSION META ────────────────────────────────────────
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(safeText(session.template_name || 'Checklist'), margin, y);
  y += 7;

  const statusText = session.status === 'flagged' ? 'ISSUES FLAGGED' : 'ALL CLEAR';
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(session.status === 'flagged' ? 180 : 0, session.status === 'flagged' ? 100 : 130, 0);
  doc.text(statusText, margin, y);
  doc.setTextColor(0);
  y += 8;

  const fmtUK = (iso) => iso
    ? new Date(iso).toLocaleString('en-GB', {
        timeZone: 'Europe/London',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false,
      })
    : '—';

  const submittedAt = fmtUK(session.completed_at);

  const metaRows = [
    ['Completed by', safeText(session.completed_by || '-')],
    ['Date', safeText(session.session_date || '-')],
    ['Submitted at', submittedAt],
    ['Record ID', session.id],
  ];
  if (session.location_name) metaRows.unshift(['Location', safeText(session.location_name)]);

  doc.setFontSize(9);
  metaRows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label + ':', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 32, y);
    y += 6;
  });

  if (session.notes) {
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', margin, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    const noteLines = doc.splitTextToSize(safeText(session.notes), contentW);
    doc.text(noteLines, margin, y);
    y += noteLines.length * 5 + 2;
  }

  y += 4;
  doc.setDrawColor(200);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // ── FLAGGED ITEMS SUMMARY ────────────────────────────────
  const flagged = items.filter(i => i.flagged);
  if (flagged.length > 0) {
    checkY(20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Flagged Items (${flagged.length})`, margin, y);
    y += 6;

    flagged.forEach(item => {
      checkY(12);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 100, 0);
      const lines = doc.splitTextToSize('Flagged: ' + safeText(item.item_text), contentW - 4);
      doc.text(lines, margin + 2, y);
      doc.setTextColor(0);
      y += lines.length * 5;
      if (item.note) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        const noteLines = doc.splitTextToSize('Note: ' + safeText(item.note), contentW - 8);
        doc.text(noteLines, margin + 6, y);
        y += noteLines.length * 4.5 + 1;
      }
      if (item.photo_url) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(80);
        doc.text('[Photo evidence attached - see URL below]', margin + 6, y);
        y += 4;
        const urlLines = doc.splitTextToSize(item.photo_url, contentW - 8);
        doc.text(urlLines, margin + 6, y);
        doc.setTextColor(0);
        y += urlLines.length * 4 + 1;
      }
      y += 2;
    });

    y += 2;
    doc.setDrawColor(200);
    doc.line(margin, y, pageW - margin, y);
    y += 8;
  }

  // ── ALL CHECKLIST ITEMS ──────────────────────────────────
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Checklist Items', margin, y);
  y += 7;

  // Table header
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y - 4, contentW, 7, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('#', margin + 1, y);
  doc.text('Item', margin + 8, y);
  doc.text('Answer', margin + contentW - 20, y);
  y += 5;
  doc.setDrawColor(220);
  doc.line(margin, y, pageW - margin, y);
  y += 4;

  items.forEach((item, idx) => {
    const answerLabel = item.answer === 'yes' ? 'Yes' : item.answer === 'no' ? 'No' : 'N/A';
    const itemLines = doc.splitTextToSize(safeText(item.item_text), contentW - 30);
    const rowH = Math.max(itemLines.length * 5, 6) + 4;
    checkY(rowH);

    if (item.flagged) {
      doc.setFillColor(255, 248, 235);
      doc.rect(margin, y - 3, contentW, rowH, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(String(idx + 1), margin + 1, y);
    doc.setTextColor(0);
    doc.text(itemLines, margin + 8, y);

    // Answer
    doc.setFont('helvetica', 'bold');
    if (item.answer === 'yes') doc.setTextColor(0, 130, 0);
    else if (item.answer === 'no') doc.setTextColor(180, 0, 0);
    else doc.setTextColor(120);
    doc.text(answerLabel, margin + contentW - 20, y);
    doc.setTextColor(0);

    y += rowH;

    if (item.note) {
      checkY(6);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(100);
      const noteLines = doc.splitTextToSize('Note: ' + safeText(item.note), contentW - 12);
      doc.text(noteLines, margin + 10, y);
      doc.setTextColor(0);
      y += noteLines.length * 4.5 + 1;
    }

    doc.setDrawColor(235);
    doc.line(margin, y, pageW - margin, y);
    y += 2;
  });

  // ── FOOTER ──────────────────────────────────────────────
  const generatedAt = fmtUK(new Date().toISOString());
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160);
    doc.text(`KitchenCheck - Generated ${generatedAt} - Operational record only - not a compliance certificate`, margin, 287, { maxWidth: contentW - 20 });
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin, 290, { align: 'right' });
  }

  const pdfBytes = doc.output('arraybuffer');
  const filename = `kitchencheck-${session.template_name?.replace(/\s+/g, '-').toLowerCase() || 'session'}-${session.session_date || 'report'}.pdf`;

  return new Response(pdfBytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});