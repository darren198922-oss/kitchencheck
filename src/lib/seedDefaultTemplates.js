import { base44 } from "@/api/base44Client";

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
 * Called once from KCSettings on first load.
 */
export async function seedDefaultTemplatesIfEmpty() {
  if (import.meta.env.VITE_LOCAL_DEV_AUTH === 'true') {
    return false;
  }
  const existing = await base44.entities.ChecklistTemplate.list("name", 5);
  if (existing.length === 0) {
    await Promise.all(
      DEFAULT_TEMPLATES.map(t => base44.entities.ChecklistTemplate.create(t))
    );
    return true; // seeded
  }
  return false; // already had templates
}