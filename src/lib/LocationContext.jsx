import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { hasSupabaseEnv } from "@/lib/supabaseClient";
import {
  listKcLocations,
  createKcLocation,
  updateKcLocation,
  deleteKcLocation,
  getKcUserSettings,
  upsertKcUserSettings,
} from "@/lib/kitchencheckSupabase";

const LocationContext = createContext(null);
const ACTIVE_KEY = "kc_active_location_id";

const LOCAL_DEV_AUTH = import.meta.env.VITE_LOCAL_DEV_AUTH === 'true';

const localDevLocations = [
  {
    id: "local-main-kitchen",
    name: "Main Kitchen",
    active: true,
    created_by_id: "local-dev-user",
  },
];

function resolveActiveLocationId(activeLocations, savedId, settingsActiveId) {
  if (settingsActiveId) {
    const fromSettings = activeLocations.find((l) => l.id === settingsActiveId);
    if (fromSettings) return fromSettings.id;
  }
  if (savedId) {
    const fromStorage = activeLocations.find((l) => l.id === savedId);
    if (fromStorage) return fromStorage.id;
  }
  return activeLocations[0]?.id ?? null;
}

export function LocationProvider({ children }) {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const [locations, setLocations] = useState([]);
  const [activeLocationId, setActiveLocationIdState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  const persistActiveLocationId = useCallback(async (id, userId) => {
    setActiveLocationIdState(id);
    if (id) {
      localStorage.setItem(ACTIVE_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_KEY);
    }

    if (!LOCAL_DEV_AUTH && userId && hasSupabaseEnv) {
      try {
        await upsertKcUserSettings({
          user_id: userId,
          active_location_id: id,
        });
      } catch (err) {
        console.error("LocationContext persist active location failed:", err);
      }
    }
  }, []);

  const initLocalDev = useCallback(() => {
    setCurrentUserId("local-dev-user");
    const active = localDevLocations.filter((l) => l.active !== false);
    setLocations(active);

    const saved = localStorage.getItem(ACTIVE_KEY);
    const valid = active.find((l) => l.id === saved);

    if (valid) {
      setActiveLocationIdState(valid.id);
    } else if (active.length > 0) {
      setActiveLocationIdState(active[0].id);
      localStorage.setItem(ACTIVE_KEY, active[0].id);
    } else {
      localStorage.removeItem(ACTIVE_KEY);
      setActiveLocationIdState(null);
    }

    setLocationError(null);
    setLoading(false);
  }, []);

  const loadSupabaseLocations = useCallback(async () => {
    if (!isAuthenticated || !user?.id) {
      setLocations([]);
      setActiveLocationIdState(null);
      setCurrentUserId(null);
      setLocationError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLocationError(null);

    try {
      if (!hasSupabaseEnv) {
        throw new Error("KitchenCheck Supabase env vars are missing.");
      }

      const [allLocations, settings] = await Promise.all([
        listKcLocations(),
        getKcUserSettings(),
      ]);

      setLocations(allLocations);
      setCurrentUserId(user.id);

      const activeLocations = allLocations.filter((l) => l.active !== false);
      const saved = localStorage.getItem(ACTIVE_KEY);
      const nextActiveId = resolveActiveLocationId(
        activeLocations,
        saved,
        settings?.active_location_id
      );

      setActiveLocationIdState(nextActiveId);

      if (nextActiveId) {
        localStorage.setItem(ACTIVE_KEY, nextActiveId);
        if (settings?.active_location_id !== nextActiveId) {
          await upsertKcUserSettings({
            user_id: user.id,
            active_location_id: nextActiveId,
          });
        }
      } else {
        localStorage.removeItem(ACTIVE_KEY);
      }
    } catch (err) {
      console.error("LocationContext load failed:", err);
      setLocationError(err.message || "Could not load locations.");
      setLocations([]);
      setActiveLocationIdState(null);
      setCurrentUserId(user.id);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (LOCAL_DEV_AUTH) {
      initLocalDev();
      return;
    }

    if (isLoadingAuth) return;
    loadSupabaseLocations();
  }, [LOCAL_DEV_AUTH, isLoadingAuth, isAuthenticated, user?.id, initLocalDev, loadSupabaseLocations]);

  const setActiveLocationId = useCallback((id) => {
    const owned = locations.find((l) => l.id === id);
    if (!owned && id !== null) return;

    setActiveLocationIdState(id);
    if (id) {
      localStorage.setItem(ACTIVE_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_KEY);
    }

    if (!LOCAL_DEV_AUTH && currentUserId && hasSupabaseEnv) {
      upsertKcUserSettings({
        user_id: currentUserId,
        active_location_id: id,
      }).catch((err) => {
        console.error("LocationContext setActiveLocationId failed:", err);
      });
    }
  }, [locations, currentUserId]);

  const createLocation = useCallback(async ({ name, address = null, notes = null }) => {
    const trimmedName = name?.trim();
    if (!trimmedName) {
      throw new Error("Location name is required.");
    }

    if (LOCAL_DEV_AUTH) {
      const created = {
        id: `local-location-${Date.now()}`,
        name: trimmedName,
        active: true,
        created_by_id: currentUserId || "local-dev-user",
        address,
        notes,
      };
      setLocations((prev) => [...prev, created]);
      if (!activeLocationId) {
        setActiveLocationId(created.id);
      }
      return created;
    }

    if (!currentUserId) {
      throw new Error("Not signed in.");
    }

    const created = await createKcLocation({
      user_id: currentUserId,
      name: trimmedName,
      address: address || null,
      notes: notes || null,
      active: true,
    });

    setLocations((prev) => [...prev, created]);
    if (!activeLocationId) {
      await persistActiveLocationId(created.id, currentUserId);
    }
    return created;
  }, [activeLocationId, currentUserId, persistActiveLocationId, setActiveLocationId]);

  const updateLocation = useCallback(async (id, payload) => {
    const owned = locations.find((l) => l.id === id);
    if (!owned) {
      throw new Error("Location not found.");
    }

    if (LOCAL_DEV_AUTH) {
      const updated = { ...owned, ...payload };
      setLocations((prev) => prev.map((l) => (l.id === id ? updated : l)));
      return updated;
    }

    const updated = await updateKcLocation(id, payload);
    setLocations((prev) => prev.map((l) => (l.id === id ? { ...l, ...updated } : l)));

    if (payload.active === false && activeLocationId === id) {
      const remainingActive = locations.filter((l) => l.id !== id && l.active !== false);
      const nextId = remainingActive[0]?.id ?? null;
      await persistActiveLocationId(nextId, currentUserId);
    }

    return updated;
  }, [locations, activeLocationId, currentUserId, persistActiveLocationId]);

  const deleteLocation = useCallback(async (id) => {
    const owned = locations.find((l) => l.id === id);
    if (!owned) {
      throw new Error("Location not found.");
    }

    if (!LOCAL_DEV_AUTH) {
      await deleteKcLocation(id);
    }

    const remaining = locations.filter((l) => l.id !== id);
    setLocations(remaining);

    if (activeLocationId === id) {
      const nextActive = remaining.filter((l) => l.active !== false);
      const nextId = nextActive[0]?.id ?? null;
      if (LOCAL_DEV_AUTH) {
        setActiveLocationId(nextId);
      } else {
        await persistActiveLocationId(nextId, currentUserId);
      }
    }

    return { remaining };
  }, [locations, activeLocationId, currentUserId, persistActiveLocationId, setActiveLocationId]);

  const activeLocation = locations.find((l) => l.id === activeLocationId) || null;
  const multiSite = locations.filter((l) => l.active !== false).length > 1;

  return (
    <LocationContext.Provider value={{
      locations,
      activeLocationId,
      activeLocation,
      setActiveLocationId,
      multiSite,
      loading,
      locationError,
      setLocations,
      currentUserId,
      createLocation,
      updateLocation,
      deleteLocation,
      refreshLocations: LOCAL_DEV_AUTH ? initLocalDev : loadSupabaseLocations,
    }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
}
