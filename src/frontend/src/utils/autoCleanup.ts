/**
 * Auto Cleanup Utility
 * Deletes ONLY old order history and order chats (completed or 6+ days old)
 * NEVER touches: user profiles, shop data, categories, subscription records
 */

const CLEANUP_KEY = "dz_last_cleanup";
const CLEANUP_INTERVAL_HOURS = 6; // Run cleanup every 6 hours
const ORDER_RETENTION_DAYS = 6; // Keep orders for 6 days

interface OrderRecord {
  id: string;
  status?: string;
  createdAt?: string;
  completedAt?: string;
  updatedAt?: string;
}

interface ChatMessage {
  orderId?: string;
  timestamp?: string;
  createdAt?: string;
}

/**
 * Check if a date string is older than N days
 */
function isOlderThanDays(dateStr: string | undefined, days: number): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= days;
}

/**
 * Clean up old orders from a localStorage key
 */
function cleanOrders(key: string): number {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const orders: OrderRecord[] = JSON.parse(raw);
    if (!Array.isArray(orders)) return 0;

    const before = orders.length;
    const filtered = orders.filter((order) => {
      // Keep if order is active (not completed)
      if (
        order.status &&
        !["completed", "delivered", "cancelled"].includes(
          order.status.toLowerCase(),
        )
      ) {
        // Still keep if recent
        return !isOlderThanDays(order.createdAt, ORDER_RETENTION_DAYS);
      }
      // Completed orders: delete if older than retention days
      const dateToCheck =
        order.completedAt || order.updatedAt || order.createdAt;
      return !isOlderThanDays(dateToCheck, ORDER_RETENTION_DAYS);
    });

    if (filtered.length !== before) {
      localStorage.setItem(key, JSON.stringify(filtered));
    }
    return before - filtered.length;
  } catch {
    return 0;
  }
}

/**
 * Clean up old chat messages
 */
function cleanChats(key: string): number {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const chats: ChatMessage[] = JSON.parse(raw);
    if (!Array.isArray(chats)) return 0;

    const before = chats.length;
    const filtered = chats.filter((msg) => {
      const dateStr = msg.timestamp || msg.createdAt;
      return !isOlderThanDays(dateStr, ORDER_RETENTION_DAYS);
    });

    if (filtered.length !== before) {
      localStorage.setItem(key, JSON.stringify(filtered));
    }
    return before - filtered.length;
  } catch {
    return 0;
  }
}

/**
 * Main cleanup function — call on app load
 * Scans all known order/chat keys and purges old data
 * PROTECTED keys (NEVER touched):
 *   dz_providers, dz_categories, dz_admin_*, dz_ebooks, dz_social_*,
 *   dz_affiliate_*, dz_scrap_rates, dz_homepage_*, dz_founder_*,
 *   dz_theme_*, dz_welcome_*, dz_tagline, dz_splash_*, dz_app_logo
 */
export function runAutoCleanup(): void {
  // Check if we ran cleanup recently
  const lastCleanup = localStorage.getItem(CLEANUP_KEY);
  if (lastCleanup) {
    const hoursSince =
      (Date.now() - Number.parseInt(lastCleanup)) / (1000 * 60 * 60);
    if (hoursSince < CLEANUP_INTERVAL_HOURS) return;
  }

  let totalCleaned = 0;

  // Order keys to clean
  const orderKeys = [
    "dz_orders",
    "dz_customer_orders",
    "dz_provider_orders",
    "dz_delivery_orders",
    "dz_order_history",
    "dz_completed_orders",
  ];

  // Chat keys to clean
  const chatKeys = [
    "dz_order_chats",
    "dz_chat_messages",
    "dz_order_chat_history",
  ];

  // Also scan for dynamic per-order chat keys
  const dynamicChatKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (
      key &&
      (key.startsWith("dz_chat_") || key.startsWith("dz_order_chat_"))
    ) {
      dynamicChatKeys.push(key);
    }
  }

  for (const key of orderKeys) {
    totalCleaned += cleanOrders(key);
  }

  for (const key of [...chatKeys, ...dynamicChatKeys]) {
    totalCleaned += cleanChats(key);
  }

  // Update cleanup timestamp
  localStorage.setItem(CLEANUP_KEY, Date.now().toString());

  if (totalCleaned > 0) {
    console.info(
      `[Digital Zindagi] Auto-cleanup: ${totalCleaned} purane records saaf kiye gaye.`,
    );
  }
}
