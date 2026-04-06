import { useEffect } from "react";

export function broadcastSettingsChange() {
  // Notify all listeners on current page
  window.dispatchEvent(new CustomEvent("dz-settings-changed"));
  // Also trigger storage event for cross-tab sync
  try {
    localStorage.setItem("dz_sync_ts", Date.now().toString());
  } catch {
    // ignore
  }
}

export function useSettingsListener(callback: () => void) {
  useEffect(() => {
    window.addEventListener("dz-settings-changed", callback);
    window.addEventListener("storage", callback);
    return () => {
      window.removeEventListener("dz-settings-changed", callback);
      window.removeEventListener("storage", callback);
    };
  }, [callback]);
}
