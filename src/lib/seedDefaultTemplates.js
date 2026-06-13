import {
  getCurrentSupabaseUser,
  listKcTemplates,
  createKcTemplate,
} from "@/lib/kitchencheckSupabase";

const DEFAULT_TEMPLATES = [
  {
    name: "Daily Opening Check",
    checklist_type: "opening",
    active: true,
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
    name: "Daily Closing Check",
    checklist_type: "closing",
    active: true,
    items: [
      "All food stored correctly and covered?",
      "All surfaces cleaned and sanitised?",
      "Bins emptied and areas clean?",
      "Fridges and freezers checked and secure?",
      "All equipment turned off or secured?",
    ],
  },
];

/**
 * If the current user has no templates at all, seed the two default ones.
 * Called from KCDashboard and KCSettings on first load.
 */
export async function seedDefaultTemplatesIfEmpty() {
  if (import.meta.env.VITE_LOCAL_DEV_AUTH === 'true') {
    return false;
  }

  const user = await getCurrentSupabaseUser();
  if (!user) return false;

  const existing = await listKcTemplates();
  if (existing.length > 0) {
    return false;
  }

  await Promise.all(
    DEFAULT_TEMPLATES.map((t) =>
      createKcTemplate({
        user_id: user.id,
        name: t.name,
        checklist_type: t.checklist_type,
        items: t.items,
        active: true,
        location_id: null,
        is_default: true,
      })
    )
  );

  return true;
}
