// ============================================================
// Error Handler — converts raw ICP/backend errors to clean
// Hindi/English messages. Use sanitizeError() in all catch blocks.
// ============================================================

const ERROR_MAP: Array<{ patterns: string[]; message: string }> = [
  {
    patterns: ["ic0.trap", "canister trapped", "trapped explicitly"],
    message: "Server se connect nahi hua, please try again",
  },
  {
    patterns: ["unauthorized", "admin only", "only admins"],
    message: "Admin access required — pehle login karein",
  },
  {
    patterns: [
      "method not found",
      "no query method",
      "no update method",
      "has no",
    ],
    message: "Feature abhi load ho raha hai, refresh karein",
  },
  {
    patterns: [
      "already_registered",
      "already registered",
      "already exists",
      "email already",
    ],
    message: "Yeh email pehle se registered hai",
  },
  {
    patterns: [
      "wrong password",
      "incorrect password",
      "password mismatch",
      "invalid password",
    ],
    message: "Password galat hai — dobara try karein",
  },
  {
    patterns: ["user not found", "no user", "does not exist"],
    message: "Account nahi mila — pehle register karein",
  },
  {
    patterns: ["reject code: 5", "reject code 5", "ic0503"],
    message: "Backend se response nahi aaya, retry karein",
  },
  {
    patterns: [
      "failed to fetch",
      "networkerror",
      "network error",
      "fetch failed",
    ],
    message: "Internet connection check karein aur retry karein",
  },
  {
    patterns: ["timeout", "timed out"],
    message: "Server slow hai — thoda wait karke retry karein",
  },
  {
    patterns: ["actor not available", "actor not ready"],
    message: "App load ho rahi hai, ek second wait karein",
  },
  {
    patterns: ["canister id", "principal", "-cai"],
    message: "Backend connection mein problem hai, refresh karein",
  },
  {
    patterns: ["current password", "current pin", "galat password"],
    message: "Password galat hai — dobara try karein",
  },
];

/**
 * Convert any raw error (ICP trap, method-not-found, etc.) to a clean message.
 * Never returns raw technical strings to the user.
 */
export function sanitizeError(err: unknown): string {
  const raw =
    (err as Error)?.message ?? (typeof err === "string" ? err : "") ?? "";
  const lower = raw.toLowerCase();

  // Check each pattern group
  for (const { patterns, message } of ERROR_MAP) {
    if (patterns.some((p) => lower.includes(p))) {
      return message;
    }
  }

  // If the raw message looks like a technical blob (contains hex, bytes, etc.)
  if (
    /0x[0-9a-f]{4,}/i.test(raw) ||
    /\b[0-9a-f]{8,}\b/.test(raw) ||
    raw.length > 200 ||
    /request id:/i.test(raw)
  ) {
    return "Kuch problem hua — please try again";
  }

  // If the message is reasonably short and not technical, return as-is
  if (
    raw.length > 0 &&
    raw.length < 120 &&
    !raw.includes("0:") &&
    !raw.includes('"')
  ) {
    return raw;
  }

  return "Kuch problem hua — please try again";
}

/**
 * Returns true if the error indicates the user is already registered.
 */
export function isAlreadyRegisteredError(err: unknown): boolean {
  const raw =
    (err as Error)?.message ?? (typeof err === "string" ? err : "") ?? "";
  const lower = raw.toLowerCase();
  return (
    lower.includes("already_registered") ||
    lower.includes("already registered") ||
    lower.includes("already exists") ||
    lower.includes("email already")
  );
}

/**
 * Returns true if the error indicates unauthorized / admin-only access.
 */
export function isUnauthorizedError(err: unknown): boolean {
  const raw =
    (err as Error)?.message ?? (typeof err === "string" ? err : "") ?? "";
  const lower = raw.toLowerCase();
  return (
    lower.includes("unauthorized") ||
    lower.includes("admin only") ||
    lower.includes("only admins") ||
    lower.includes("ic0.trap")
  );
}
