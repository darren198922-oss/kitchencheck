import { createContext, useContext, useEffect, useState } from "react";

const LocationContext = createContext(null);
const ACTIVE_KEY = "kc_active_location_id";

const LOCAL_DEV_AUTH = import.meta.env.VITE_LOCAL_DEV_AUTH === 'true';

const localDevLocations = [
  {
    id: "local-main-kitchen",
    name: "Main Kitchen",
    active: true,
    created_by_id: "local-dev-user",
  }
];

export function LocationProvider({ children }) {
  const [locations, setLocations] = useState([]);
  const [activeLocationId, setActiveLocationIdState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    async function init() {
      if (LOCAL_DEV_AUTH) {
        setCurrentUserId("local-dev-user");

        const active = localDevLocations.filter(l => l.active !== false);
        setLocations(active);

        const saved = localStorage.getItem(ACTIVE_KEY);
        const valid = active.find(l => l.id === saved);

        if (valid) {
          setActiveLocationIdState(valid.id);
        } else if (active.length > 0) {
          setActiveLocationIdState(active[0].id);
          localStorage.setItem(ACTIVE_KEY, active[0].id);
        } else {
          localStorage.removeItem(ACTIVE_KEY);
          setActiveLocationIdState(null);
        }

        setLoading(false);
        return;
      }

      setLocations([]);
      setActiveLocationIdState(null);
      setCurrentUserId(null);
      setLoading(false);
    }

    init();
  }, []);

  const setActiveLocationId = (id) => {
    const owned = locations.find(l => l.id === id);
    if (!owned && id !== null) return;

    setActiveLocationIdState(id);

    if (id) {
      localStorage.setItem(ACTIVE_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_KEY);
    }
  };

  const activeLocation = locations.find(l => l.id === activeLocationId) || null;
  const multiSite = locations.length > 1;

  return (
    <LocationContext.Provider value={{
      locations,
      activeLocationId,
      activeLocation,
      setActiveLocationId,
      multiSite,
      loading,
      setLocations,
      currentUserId,
    }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  return useContext(LocationContext);
}
