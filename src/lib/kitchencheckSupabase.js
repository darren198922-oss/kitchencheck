import { supabase, hasSupabaseEnv } from "@/lib/supabaseClient";

function throwOnError(error, context) {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

// ── Auth ──────────────────────────────────────────────────

export async function getCurrentSupabaseUser() {
  if (!hasSupabaseEnv) return null;
  const { data, error } = await supabase.auth.getUser();
  throwOnError(error, "getCurrentSupabaseUser failed");
  return data.user ?? null;
}

// ── Locations ─────────────────────────────────────────────

export async function listKcLocations() {
  if (!hasSupabaseEnv) return [];
  const { data, error } = await supabase.from("kc_locations").select("*");
  throwOnError(error, "listKcLocations failed");
  return data ?? [];
}

export async function createKcLocation(payload) {
  if (!hasSupabaseEnv) return null;
  const { data, error } = await supabase
    .from("kc_locations")
    .insert(payload)
    .select()
    .single();
  throwOnError(error, "createKcLocation failed");
  return data;
}

export async function updateKcLocation(id, payload) {
  if (!hasSupabaseEnv) return null;
  const { data, error } = await supabase
    .from("kc_locations")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  throwOnError(error, "updateKcLocation failed");
  return data;
}

export async function deleteKcLocation(id) {
  if (!hasSupabaseEnv) return false;
  const { error } = await supabase.from("kc_locations").delete().eq("id", id);
  throwOnError(error, "deleteKcLocation failed");
  return true;
}

// ── Templates ─────────────────────────────────────────────

export async function listKcTemplates() {
  if (!hasSupabaseEnv) return [];
  const { data, error } = await supabase.from("kc_checklist_templates").select("*");
  throwOnError(error, "listKcTemplates failed");
  return data ?? [];
}

export async function createKcTemplate(payload) {
  if (!hasSupabaseEnv) return null;
  const { data, error } = await supabase
    .from("kc_checklist_templates")
    .insert(payload)
    .select()
    .single();
  throwOnError(error, "createKcTemplate failed");
  return data;
}

export async function updateKcTemplate(id, payload) {
  if (!hasSupabaseEnv) return null;
  const { data, error } = await supabase
    .from("kc_checklist_templates")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  throwOnError(error, "updateKcTemplate failed");
  return data;
}

export async function deleteKcTemplate(id) {
  if (!hasSupabaseEnv) return false;
  const { error } = await supabase.from("kc_checklist_templates").delete().eq("id", id);
  throwOnError(error, "deleteKcTemplate failed");
  return true;
}

// ── Sessions ──────────────────────────────────────────────

export async function listKcSessions() {
  if (!hasSupabaseEnv) return [];
  const { data, error } = await supabase.from("kc_check_sessions").select("*");
  throwOnError(error, "listKcSessions failed");
  return data ?? [];
}

export async function createKcSession(payload) {
  if (!hasSupabaseEnv) return null;
  const { data, error } = await supabase
    .from("kc_check_sessions")
    .insert(payload)
    .select()
    .single();
  throwOnError(error, "createKcSession failed");
  return data;
}

export async function deleteKcSession(id) {
  if (!hasSupabaseEnv) return false;
  const { error } = await supabase.from("kc_check_sessions").delete().eq("id", id);
  throwOnError(error, "deleteKcSession failed");
  return true;
}

// ── Check items ───────────────────────────────────────────

export async function listKcCheckItems() {
  if (!hasSupabaseEnv) return [];
  const { data, error } = await supabase.from("kc_check_items").select("*");
  throwOnError(error, "listKcCheckItems failed");
  return data ?? [];
}

export async function listKcCheckItemsBySessionId(sessionId) {
  if (!hasSupabaseEnv) return [];
  const { data, error } = await supabase
    .from("kc_check_items")
    .select("*")
    .eq("session_id", sessionId);
  throwOnError(error, "listKcCheckItemsBySessionId failed");
  return data ?? [];
}

export async function createKcCheckItems(items) {
  if (!hasSupabaseEnv) return [];
  if (!items?.length) return [];
  const { data, error } = await supabase
    .from("kc_check_items")
    .insert(items)
    .select();
  throwOnError(error, "createKcCheckItems failed");
  return data ?? [];
}

export async function updateKcCheckItem(id, payload) {
  if (!hasSupabaseEnv) return null;
  const { data, error } = await supabase
    .from("kc_check_items")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  throwOnError(error, "updateKcCheckItem failed");
  return data;
}

export async function deleteKcCheckItemsBySessionId(sessionId) {
  if (!hasSupabaseEnv) return false;
  const { error } = await supabase
    .from("kc_check_items")
    .delete()
    .eq("session_id", sessionId);
  throwOnError(error, "deleteKcCheckItemsBySessionId failed");
  return true;
}

// ── Temperature logs ──────────────────────────────────────

export async function listKcTemperatureLogs() {
  if (!hasSupabaseEnv) return [];
  const { data, error } = await supabase.from("kc_temperature_logs").select("*");
  throwOnError(error, "listKcTemperatureLogs failed");
  return data ?? [];
}

export async function createKcTemperatureLog(payload) {
  if (!hasSupabaseEnv) return null;
  const { data, error } = await supabase
    .from("kc_temperature_logs")
    .insert(payload)
    .select()
    .single();
  throwOnError(error, "createKcTemperatureLog failed");
  return data;
}

export async function deleteKcTemperatureLog(id) {
  if (!hasSupabaseEnv) return false;
  const { error } = await supabase.from("kc_temperature_logs").delete().eq("id", id);
  throwOnError(error, "deleteKcTemperatureLog failed");
  return true;
}

// ── User settings ─────────────────────────────────────────

export async function getKcUserSettings() {
  if (!hasSupabaseEnv) return null;
  const user = await getCurrentSupabaseUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("kc_user_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  throwOnError(error, "getKcUserSettings failed");
  return data;
}

export async function upsertKcUserSettings(payload) {
  if (!hasSupabaseEnv) return null;
  const { data, error } = await supabase
    .from("kc_user_settings")
    .upsert(payload)
    .select()
    .single();
  throwOnError(error, "upsertKcUserSettings failed");
  return data;
}

// ── Diagnostics ───────────────────────────────────────────

export async function checkKitchenCheckSupabaseConnection() {
  if (!hasSupabaseEnv) {
    return { ok: false, reason: "missing_env" };
  }
  try {
    const { error } = await supabase
      .from("kc_locations")
      .select("*", { count: "exact", head: true });
    if (error) {
      return { ok: false, reason: error.message };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err.message || String(err) };
  }
}
