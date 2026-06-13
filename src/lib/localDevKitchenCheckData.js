export const LOCAL_DEV_TEMPLATES = [
  {
    id: "local-template-opening",
    name: "Daily Opening Check",
    checklist_type: "opening",
    active: true,
    location_id: null,
    items: [
      "All fridges and freezers at correct temperature?",
      "Handwashing facilities stocked and accessible?",
      "All surfaces cleaned and sanitised?",
      "Date labels checked and in-date items only in use?",
      "Personal protective equipment available?",
      "Pest control — no signs of pests?",
    ],
  },
  {
    id: "local-template-closing",
    name: "Daily Closing Check",
    checklist_type: "closing",
    active: true,
    location_id: null,
    items: [
      "All food stored correctly and covered?",
      "All surfaces cleaned and sanitised?",
      "Bins emptied and areas clean?",
      "Fridges and freezers checked and secure?",
      "All equipment turned off or secured?",
    ],
  },
];

const sessions = [];
const checkItems = [];
const temperatureLogs = [];

export const LOCAL_DEV_SESSIONS = sessions;
export const LOCAL_DEV_TEMPERATURE_LOGS = temperatureLogs;

export function getLocalDevTemplates() {
  return LOCAL_DEV_TEMPLATES.map(t => ({ ...t, items: [...(t.items || [])] }));
}

export function getLocalDevSessions() {
  return [...sessions].sort((a, b) => (b.completed_at || "").localeCompare(a.completed_at || ""));
}

export function getLocalDevTemperatureLogs() {
  return [...temperatureLogs].sort((a, b) => (b.logged_at || "").localeCompare(a.logged_at || ""));
}

export function createLocalDevSession(payload) {
  const session = {
    id: payload.id || `local-session-${Date.now()}`,
    ...payload,
  };
  sessions.unshift(session);
  return { ...session };
}

export function createLocalDevCheckItems(sessionId, items) {
  const created = items.map((item, i) => ({
    id: `local-check-item-${sessionId}-${i}`,
    session_id: sessionId,
    item_text: item.item_text,
    answer: item.answer,
    flagged: item.flagged,
    note: item.note,
    photo_url: item.photo_url,
    item_order: item.item_order ?? i,
    issue_status: item.issue_status,
    resolution_note: item.resolution_note,
    resolved_by: item.resolved_by,
    resolved_at: item.resolved_at,
  }));
  checkItems.push(...created);
  return created.map(i => ({ ...i }));
}

export function getLocalDevCheckItemsBySessionId(sessionId) {
  return checkItems
    .filter(i => i.session_id === sessionId)
    .sort((a, b) => (a.item_order || 0) - (b.item_order || 0))
    .map(i => ({ ...i }));
}

export function updateLocalDevCheckItem(id, patch) {
  const item = checkItems.find(i => i.id === id);
  if (!item) return null;
  Object.assign(item, patch);
  return { ...item };
}

export function deleteLocalDevSession(sessionId) {
  const sessionIdx = sessions.findIndex(s => s.id === sessionId);
  if (sessionIdx >= 0) sessions.splice(sessionIdx, 1);
  for (let i = checkItems.length - 1; i >= 0; i--) {
    if (checkItems[i].session_id === sessionId) checkItems.splice(i, 1);
  }
  return sessionIdx >= 0;
}

export function createLocalDevTemperatureLog(payload) {
  const log = {
    id: `local-temp-log-${Date.now()}`,
    logged_at: new Date().toISOString(),
    ...payload,
  };
  temperatureLogs.unshift(log);
  return { ...log };
}

export function deleteLocalDevTemperatureLog(id) {
  const idx = temperatureLogs.findIndex(l => l.id === id);
  if (idx >= 0) temperatureLogs.splice(idx, 1);
  return idx >= 0;
}

export function clearLocalDevDataForLocation(locationId) {
  if (!locationId) return;
  const sessionIds = new Set(
    sessions.filter(s => s.location_id === locationId).map(s => s.id)
  );
  for (let i = sessions.length - 1; i >= 0; i--) {
    if (sessions[i].location_id === locationId) sessions.splice(i, 1);
  }
  for (let i = checkItems.length - 1; i >= 0; i--) {
    if (sessionIds.has(checkItems[i].session_id)) checkItems.splice(i, 1);
  }
  for (let i = temperatureLogs.length - 1; i >= 0; i--) {
    if (temperatureLogs[i].location_id === locationId) temperatureLogs.splice(i, 1);
  }
}
