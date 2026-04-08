import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

// Module-level queryClient ref that gets set by the provider
let _queryClient: ReturnType<typeof useQueryClient> | null = null;

/** Call this inside a component that has QueryClient access to register it */
export function useRegisterQueryClient() {
  const qc = useQueryClient();
  _queryClient = qc;
}

const CONTENT_QUERY_KEYS = [
  ["categories"],
  ["news"],
  ["jobs"],
  ["custom-codes"],
  ["scrap-rates"],
  ["videos"],
];

export function broadcastSettingsChange() {
  // Notify all listeners on current page
  window.dispatchEvent(new CustomEvent("dz-settings-changed"));
  // Also trigger storage event for cross-tab sync
  try {
    localStorage.setItem("dz_sync_ts", Date.now().toString());
  } catch {
    // ignore
  }
  // Invalidate React Query caches so 2-second pollers refetch immediately
  if (_queryClient) {
    for (const queryKey of CONTENT_QUERY_KEYS) {
      _queryClient.invalidateQueries({ queryKey });
    }
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
