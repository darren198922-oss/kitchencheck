import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { locationId, locationName, startDate, endDate } = await req.json();
  if (!startDate || !endDate) return Response.json({ error: 'startDate and endDate required' }, { status: 400 });

  // Fetch only this user's data (RLS enforced server-side; filter is defence-in-depth)
  const [allSessions, allItems, allTempLogs] = await Promise.all([
    base44.entities.CheckSession.filter({ created_by_id: user.id }, '-session_date', 500),
    base44.entities.CheckItem.filter({ created_by_id: user.id }, 'item_order', 5000),
    base44.entities.TemperatureLog.filter({ created_by_id: user.id }, '-log_date', 1000),
  ]);

  // Filter sessions by location (must match this user's location) and date range
  const sessions = allSessions.filter(s => {
    const inLocation = locationId ? s.location_id === locationId : true;
    const inRange = s.session_date >= startDate && s.session_date <= endDate;
    return inLocation && inRange;
  }).sort((a, b) => (a.session_date > b.session_date ? 1 : -1));

  // Filter temp logs strictly by location_id and date range
  const tempLogs = allTempLogs.filter(l => {
    const inLocation = locationId ? l.location_id === locationId : true;
    const inRange = l.log_date >= startDate && l.log_date <= endDate;
    return inLocation && inRange;
  }).sort((a, b) => (a.log_date > b.log_date ? 1 : -1));

  // Get check items for exported sessions only
  const sessionIds = new Set(sessions.map(s => s.id));
  const itemsBySession = {};
  allItems.forEach(item => {
    if (!sessionIds.has(item.session_id)) return;
    if (!itemsBySession[item.session_id]) itemsBySession[item.session_id] = [];
    itemsBySession[item.session_id].push(item);
  });
  // Sort items within each session
  Object.values(itemsBySession).forEach(arr => arr.sort((a, b) => (a.item_order || 0) - (b.item_order || 0)));

  const allFlagged = Object.values(itemsBySession).flat().filter(i => i.flagged);
  const openFlagged = allFlagged.filter(i => !i.issue_status || i.issue_status === 'open');

  const fmtUK = (iso) => iso
    ? new Date(iso).toLocaleString('en-GB', {
        timeZone: 'Europe/London',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false,
      })
    : '—';

  // ── PDF setup ──────────────────────────────────────────────
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = 20;

  const checkY = (needed = 10) => {
    if (y + needed > 275) { doc.addPage(); y = 20; }
  };

  const drawDivider = (gap = 6) => {
    checkY(gap + 4);
    doc.setDrawColor(200);
    doc.line(margin, y, pageW - margin, y);
    y += gap;
  };

  const safeText = (str) => (str || '').replace(/[^\x20-\x7E\n]/g, '');

  // ── HEADER ──────────────────────────────────────────────────
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('KitchenCheck', margin, y);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120);
  doc.text('Operational Kitchen History', margin, y + 6);
  doc.setTextColor(0);
  y += 14;

  drawDivider(8);

  // ── REPORT META ─────────────────────────────────────────────
  const generatedAt = fmtUK(new Date().toISOString());

  const metaRows = [
    ['Location', safeText(locationName) || 'All locations'],
    ['Date range', `${startDate} to ${endDate}`],
    ['Generated', generatedAt],
  ];

  doc.setFontSize(9);
  metaRows.forEach(([label, value]) => {
    checkY(7);
    doc.setFont('helvetica', 'bold');
    doc.text(label + ':', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.text(safeText(value), margin + 30, y);
    y += 6;
  });

  drawDivider(8);

  // ── SUMMARY ─────────────────────────────────────────────────
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', margin, y);
  y += 7;

  const summaryRows = [
    ['Check sessions', String(sessions.length)],
    ['Temperature logs', String(tempLogs.length)],
    ['Flagged items', String(allFlagged.length)],
    ['Open / unresolved flagged items', String(openFlagged.length)],
  ];

  doc.setFontSize(9);
  summaryRows.forEach(([label, value]) => {
    checkY(6);
    doc.setFont('helvetica', 'normal');
    doc.text(label + ':', margin + 2, y);
    doc.setFont('helvetica', 'bold');
    doc.text(value, margin + contentW - 10, y, { align: 'right' });
    y += 6;
  });

  if (sessions.length === 0 && tempLogs.length === 0) {
    y += 4;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(140);
    doc.text('No records found for this date range.', margin + 2, y);
    doc.setTextColor(0);
    y += 8;
  }

  // ── CHECK SESSIONS ───────────────────────────────────────────
  if (sessions.length > 0) {
    drawDivider(8);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Check Sessions', margin, y);
    y += 8;

    sessions.forEach((session, idx) => {
      const items = itemsBySession[session.id] || [];
      const flaggedItems = items.filter(i => i.flagged);
      const estimatedH = 30 + items.length * 7 + flaggedItems.length * 10;
      checkY(Math.min(estimatedH, 40));

      // Session header band
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, y - 4, contentW, 9, 'F');

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      const sessionTitle = safeText(session.template_name || 'Checklist');
      doc.text(sessionTitle, margin + 2, y);

      const statusText = session.status === 'flagged' ? 'ISSUES NOTED' : 'ALL CLEAR';
      doc.setTextColor(session.status === 'flagged' ? 160 : 0, session.status === 'flagged' ? 80 : 120, 0);
      doc.text(statusText, pageW - margin - 2, y, { align: 'right' });
      doc.setTextColor(0);
      y += 8;

      // Session meta
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const sessionTime = session.completed_at
        ? 'at ' + new Date(session.completed_at).toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hour12: false })
        : '';
      const metaParts = [
        session.session_date || '',
        sessionTime,
        session.completed_by ? 'by ' + safeText(session.completed_by) : '',
      ].filter(Boolean).join(' - ');
      checkY(6);
      doc.text(metaParts, margin + 2, y);
      y += 6;

      if (session.notes) {
        checkY(6);
        doc.setFont('helvetica', 'italic');
        const noteLines = doc.splitTextToSize('Notes: ' + safeText(session.notes), contentW - 4);
        doc.text(noteLines, margin + 2, y);
        y += noteLines.length * 4.5 + 2;
      }

      // Flagged items
      if (flaggedItems.length > 0) {
        checkY(8);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(160, 80, 0);
        doc.text('Flagged items:', margin + 2, y);
        doc.setTextColor(0);
        y += 5;
        flaggedItems.forEach(item => {
          checkY(10);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(160, 80, 0);
          const flines = doc.splitTextToSize('Flagged: ' + safeText(item.item_text), contentW - 8);
          doc.text(flines, margin + 4, y);
          doc.setTextColor(0);
          y += flines.length * 4.5;
          if (item.note) {
            checkY(5);
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(7.5);
            doc.setTextColor(100);
            const fnLines = doc.splitTextToSize('Note: ' + safeText(item.note), contentW - 10);
            doc.text(fnLines, margin + 6, y);
            doc.setTextColor(0);
            y += fnLines.length * 4 + 1;
          }
          if (item.issue_status && item.issue_status !== 'open') {
            checkY(5);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(100);
            doc.text('Status: ' + safeText(item.issue_status).replace('_', ' '), margin + 6, y);
            doc.setTextColor(0);
            y += 4;
          }
        });
        y += 2;
      }

      // All checklist items
      if (items.length > 0) {
        checkY(8);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(100);
        doc.text('Checklist answers:', margin + 2, y);
        doc.setTextColor(0);
        y += 5;

        items.forEach(item => {
          const answerLabel = item.answer === 'yes' ? 'Yes' : item.answer === 'no' ? 'No' : 'N/A';
          const itemLines = doc.splitTextToSize(safeText(item.item_text), contentW - 22);
          const rowH = Math.max(itemLines.length * 4.5, 5) + 2;
          checkY(rowH);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(0);
          doc.text(itemLines, margin + 4, y);

          doc.setFont('helvetica', 'bold');
          if (item.answer === 'yes') doc.setTextColor(0, 120, 0);
          else if (item.answer === 'no') doc.setTextColor(170, 0, 0);
          else doc.setTextColor(120);
          doc.text(answerLabel, pageW - margin - 2, y, { align: 'right' });
          doc.setTextColor(0);

          y += rowH;
        });
      }

      // Spacer between sessions
      y += 4;
      if (idx < sessions.length - 1) {
        checkY(4);
        doc.setDrawColor(225);
        doc.line(margin, y, pageW - margin, y);
        y += 6;
      }
    });
  }

  // ── TEMPERATURE LOGS ────────────────────────────────────────
  if (tempLogs.length > 0) {
    drawDivider(8);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Temperature Logs', margin, y);
    y += 8;

    // Table header
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y - 4, contentW, 7, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Date / Time', margin + 2, y);
    doc.text('Equipment', margin + 40, y);
    doc.text('Reading', margin + contentW - 20, y, { align: 'right' });
    y += 5;
    doc.setDrawColor(220);
    doc.line(margin, y, pageW - margin, y);
    y += 3;

    tempLogs.forEach(log => {
      checkY(7);
      const logTime = log.logged_at
        ? new Date(log.logged_at).toLocaleString('en-GB', { timeZone: 'Europe/London', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
        : (log.log_date || '');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(0);
      doc.text(safeText(logTime), margin + 2, y);
      doc.text(safeText(log.equipment_name || ''), margin + 40, y);

      const tempVal = log.temperature != null
        ? (log.temperature > 0 ? '+' : '') + log.temperature + 'C'
        : '-';
      doc.setFont('helvetica', 'bold');
      doc.text(tempVal, margin + contentW - 2, y, { align: 'right' });

      y += 5;
      if (log.note) {
        checkY(5);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(120);
        const noteLines = doc.splitTextToSize('Note: ' + safeText(log.note), contentW - 10);
        doc.text(noteLines, margin + 4, y);
        doc.setTextColor(0);
        y += noteLines.length * 3.5 + 1;
      }

      doc.setDrawColor(235);
      doc.line(margin, y, pageW - margin, y);
      y += 2;
    });
  }

  // ── FOOTER ──────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160);
    doc.text(
      `KitchenCheck - Generated ${generatedAt} - Operational record only - not a compliance certificate`,
      margin, 287, { maxWidth: contentW - 20 }
    );
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin, 290, { align: 'right' });
  }

  const pdfBytes = doc.output('arraybuffer');
  const filename = `kitchencheck-history-${startDate}-to-${endDate}.pdf`;

  return new Response(pdfBytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});