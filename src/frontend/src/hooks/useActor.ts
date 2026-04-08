import { useActor as useCaffeineActor } from "@caffeineai/core-infrastructure";
import { createActor } from "../backend";
import type { BackendActorMethods } from "../types/appTypes";

// Stub upload/download functions for actor creation
const noopUpload = async () => new Uint8Array();
const noopDownload = async () =>
  ({ type: "", data: new Uint8Array() }) as never;

function createBackendActor(canisterId: string, options = {}) {
  return createActor(canisterId, noopUpload, noopDownload, options);
}

// Cast Backend to include all the methods pages call.
// The actual implementation is provided at runtime by the canister.
type ActorWithMethods = BackendActorMethods;

export function useActor(): {
  actor: ActorWithMethods | null;
  isFetching: boolean;
} {
  const result = useCaffeineActor(createBackendActor);
  return result as { actor: ActorWithMethods | null; isFetching: boolean };
}
