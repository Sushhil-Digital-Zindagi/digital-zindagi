/**
 * Central error sanitizer — converts raw ICP canister errors to clean Hindi/English messages.
 * NEVER shows ic0.trap, canister IDs, or technical rejection codes to users.
 */

export function sanitizeBackendError(
  error: unknown,
  defaultMsg?: string,
): string {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  const lower = msg.toLowerCase();

  // ICP canister trap / rejection
  if (
    lower.includes("ic0.trap") ||
    lower.includes("reject code: 5") ||
    lower.includes("reject code 5") ||
    lower.includes("canister called") ||
    lower.includes("trapped explicitly") ||
    lower.includes(": error from canister") ||
    lower.includes("ic0503") ||
    lower.includes("canister trapped")
  ) {
    if (lower.includes("unauthorized") || lower.includes("admin only")) {
      return "आपके पास यह देखने की permission नहीं है।";
    }
    if (
      lower.includes("already_registered") ||
      lower.includes("already registered")
    ) {
      return "यह email/mobile already registered है। Login करें।";
    }
    if (
      lower.includes("wrong_password") ||
      lower.includes("not_found") ||
      lower.includes("wrong password")
    ) {
      return "Incorrect password, please try again.";
    }
    if (lower.includes("not found") || lower.includes("no user")) {
      return "यह account register नहीं है। पहले sign up करें।";
    }
    return "Server error आया। Please try again.";
  }

  // Canister ID pattern (e.g. qoab5-iyaaa-aaaad-aggsq-cai)
  if (/-[a-z0-9]+-cai/i.test(msg)) {
    return "Server से connect नहीं हो पा रहा — थोड़ा wait करें।";
  }

  // Network errors
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("network error") ||
    lower.includes("econnrefused") ||
    lower.includes("fetch")
  ) {
    return "Backend से connect नहीं हो पा रहा — थोड़ा wait करें।";
  }

  // Timeout
  if (lower.includes("timeout") || lower.includes("timed out")) {
    return "Request timeout हो गई। Please try again।";
  }

  // Method not found
  if (lower.includes("method not found") || lower.includes("no method")) {
    return "Service temporarily unavailable. Please try again.";
  }

  // "already registered" user-friendly
  if (
    lower.includes("already") &&
    (lower.includes("register") || lower.includes("exist"))
  ) {
    return "यह email/mobile already registered है। Login करें।";
  }

  return defaultMsg ?? msg;
}

/** Convert a Result<T, string> from ICP canister to a clean value or throw */
export function unwrapResult<T>(
  result: { __kind__: "ok"; ok: T } | { __kind__: "err"; err: string },
): T {
  if (result.__kind__ === "ok") return result.ok;
  throw new Error(result.err);
}
