import { useActor as useCaffeineActor } from "@caffeineai/core-infrastructure";
import { createActor } from "../backend";
import type { BackendActorMethods } from "../types/appTypes";

// Stub upload/download functions for actor creation
const noopUpload = async () => new Uint8Array();
const noopDownload = async () =>
  ({ type: "", data: new Uint8Array() }) as never;

function createBackendActor(canisterId: string, options = {}) {
  try {
    return createActor(canisterId, noopUpload, noopDownload, options);
  } catch {
    return null;
  }
}

// Cast Backend to include all the methods pages call.
// The actual implementation is provided at runtime by the canister.
type ActorWithMethods = BackendActorMethods;

/**
 * Retry a canister call with exponential backoff on failure.
 * @param fn - Async function to retry
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param baseDelayMs - Base delay in ms, doubles each retry (default: 500)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 500,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((resolve) =>
          setTimeout(resolve, baseDelayMs * 2 ** attempt),
        );
      }
    }
  }
  throw lastError;
}

export function useActor(): {
  actor: ActorWithMethods | null;
  isFetching: boolean;
} {
  const result = useCaffeineActor(createBackendActor);
  return result as { actor: ActorWithMethods | null; isFetching: boolean };
}
