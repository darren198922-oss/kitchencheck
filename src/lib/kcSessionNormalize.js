export function normalizeKcSession(session, locationName = "") {
  const flagged = session.status === "issues_flagged";
  return {
    ...session,
    location_name: session.location_name || locationName,
    completed_at: session.submitted_at || session.completed_at,
    status: flagged ? "flagged" : "completed",
  };
}

export function normalizeKcCheckItem(item) {
  return {
    ...item,
    item_order: item.order_index ?? item.item_order ?? 0,
    flagged: item.flagged === true || item.answer === "no" || item.issue_status === "open",
  };
}
