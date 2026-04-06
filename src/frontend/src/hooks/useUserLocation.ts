import { useEffect, useState } from "react";

export type LocationStatus =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "unavailable";

export interface UserLocation {
  lat: number;
  lng: number;
}

export interface UseUserLocationResult {
  location: UserLocation | null;
  status: LocationStatus;
  error: string | null;
  requestLocation: () => void;
}

export function useUserLocation(): UseUserLocationResult {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  // Auto-request on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus("unavailable");
      setError("Aapka browser GPS ko support nahi karta");
      return;
    }
    setStatus("requesting");
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus("granted");
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus("denied");
          setError("Location permission nahi diya gaya");
        } else {
          setStatus("unavailable");
          setError("Location detect nahi ho saki, dobara try karein");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setStatus("unavailable");
      setError("Aapka browser GPS ko support nahi karta");
      return;
    }
    setStatus("requesting");
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus("granted");
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus("denied");
          setError("Location permission nahi diya gaya");
        } else {
          setStatus("unavailable");
          setError("Location detect nahi ho saki, dobara try karein");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  return { location, status, error, requestLocation };
}
