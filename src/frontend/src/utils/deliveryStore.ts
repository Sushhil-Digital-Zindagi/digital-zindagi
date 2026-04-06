// ============================================================
// Digital Zindagi — Delivery & Revenue Store
// All delivery state managed in localStorage with event sync
// ============================================================

export type RiderStatus = "pending" | "approved" | "rejected" | "blocked";
export type OrderStatus =
  | "open"
  | "accepted"
  | "pickup_otp_verified"
  | "delivering"
  | "completed"
  | "cancelled";

export interface DeliveryRider {
  id: string; // DZ-DB-1001 format
  name: string;
  phone: string;
  photoUrl: string; // base64 or URL
  idProofUrl: string; // base64 screenshot
  status: RiderStatus;
  walletBalance: number;
  createdAt: number;
  lat?: number;
  lng?: number;
  isOnline: boolean;
}

export interface DeliveryOrder {
  id: string;
  customerName: string;
  customerPhone: string;
  pickupAddress: string;
  pickupLat?: number;
  pickupLng?: number;
  deliveryAddress: string;
  deliveryLat?: number;
  deliveryLng?: number;
  distanceKm: number;
  customerFare: number;
  riderEarning: number;
  adminCommission: number;
  pickupOtp: string;
  deliveryOtp: string;
  status: OrderStatus;
  riderId?: string;
  riderName?: string;
  createdAt: number;
  acceptedAt?: number;
  completedAt?: number;
}

export interface DeliverySettings {
  serviceEnabled: boolean;
  baseFare: number; // Rs for 0-2 KM
  extraPerKm: number; // Rs per KM beyond 2 KM
  adminCommission: number; // Rs per delivery
  upiQrUrl: string;
  gpayNumber: string;
  broadcastRadiusKm: number; // default 5
}

const STORAGE_KEYS = {
  RIDERS: "dz_delivery_riders",
  ORDERS: "dz_delivery_orders",
  SETTINGS: "dz_delivery_settings",
  MY_RIDER_ID: "dz_my_rider_id",
} as const;

const DELIVERY_EVENT = "dz_delivery_update";

function broadcast() {
  window.dispatchEvent(new Event(DELIVERY_EVENT));
  // Also trigger settingsSync for cross-tab
  window.dispatchEvent(
    new StorageEvent("storage", { key: STORAGE_KEYS.ORDERS }),
  );
}

export function onDeliveryUpdate(cb: () => void) {
  window.addEventListener(DELIVERY_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(DELIVERY_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

// ----- Settings -----
export function getDeliverySettings(): DeliverySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) {
      const s = JSON.parse(raw);
      return {
        serviceEnabled: s.serviceEnabled ?? true,
        baseFare: s.baseFare ?? 30,
        extraPerKm: s.extraPerKm ?? 10,
        adminCommission: s.adminCommission ?? 5,
        upiQrUrl: s.upiQrUrl ?? "",
        gpayNumber: s.gpayNumber ?? "",
        broadcastRadiusKm: s.broadcastRadiusKm ?? 5,
      };
    }
  } catch {
    /* */
  }
  return {
    serviceEnabled: true,
    baseFare: 30,
    extraPerKm: 10,
    adminCommission: 5,
    upiQrUrl: "",
    gpayNumber: "",
    broadcastRadiusKm: 5,
  };
}

export function saveDeliverySettings(s: DeliverySettings) {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(s));
  broadcast();
}

// ----- Riders -----
export function getAllRiders(): DeliveryRider[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.RIDERS) ?? "[]");
  } catch {
    return [];
  }
}

export function saveAllRiders(riders: DeliveryRider[]) {
  localStorage.setItem(STORAGE_KEYS.RIDERS, JSON.stringify(riders));
  broadcast();
}

export function getRiderById(id: string): DeliveryRider | undefined {
  return getAllRiders().find((r) => r.id === id);
}

export function getRiderByPhone(phone: string): DeliveryRider | undefined {
  return getAllRiders().find((r) => r.phone === phone);
}

export function registerRider(data: {
  name: string;
  phone: string;
  photoUrl: string;
  idProofUrl: string;
}): DeliveryRider {
  const riders = getAllRiders();
  // Check duplicate
  const existing = riders.find((r) => r.phone === data.phone);
  if (existing)
    throw new Error("Is phone number se pehle se registration ho chuka hai.");

  const seq = riders.length + 1001;
  const newRider: DeliveryRider = {
    id: `DZ-DB-${seq}`,
    name: data.name,
    phone: data.phone,
    photoUrl: data.photoUrl,
    idProofUrl: data.idProofUrl,
    status: "pending",
    walletBalance: 0,
    createdAt: Date.now(),
    isOnline: false,
  };
  riders.push(newRider);
  saveAllRiders(riders);
  return newRider;
}

export function updateRiderStatus(riderId: string, status: RiderStatus) {
  const riders = getAllRiders();
  const idx = riders.findIndex((r) => r.id === riderId);
  if (idx === -1) return;
  riders[idx].status = status;
  saveAllRiders(riders);
}

export function updateRiderWallet(riderId: string, delta: number) {
  const riders = getAllRiders();
  const idx = riders.findIndex((r) => r.id === riderId);
  if (idx === -1) return;
  riders[idx].walletBalance = Math.max(0, riders[idx].walletBalance + delta);
  saveAllRiders(riders);
}

export function setRiderOnline(
  riderId: string,
  online: boolean,
  lat?: number,
  lng?: number,
) {
  const riders = getAllRiders();
  const idx = riders.findIndex((r) => r.id === riderId);
  if (idx === -1) return;
  riders[idx].isOnline = online;
  if (lat !== undefined) riders[idx].lat = lat;
  if (lng !== undefined) riders[idx].lng = lng;
  saveAllRiders(riders);
}

// ----- Orders -----
export function getAllOrders(): DeliveryOrder[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) ?? "[]");
  } catch {
    return [];
  }
}

export function saveAllOrders(orders: DeliveryOrder[]) {
  localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  broadcast();
}

function generateOtp(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function calcFare(
  distanceKm: number,
  settings: DeliverySettings,
): { customerFare: number; riderEarning: number; adminCommission: number } {
  const base = settings.baseFare;
  const extra = distanceKm > 2 ? (distanceKm - 2) * settings.extraPerKm : 0;
  const customerFare = Math.round(base + extra);
  const adminCommission = settings.adminCommission;
  const riderEarning = Math.max(0, customerFare - adminCommission);
  return { customerFare, riderEarning, adminCommission };
}

export function createOrder(data: {
  customerName: string;
  customerPhone: string;
  pickupAddress: string;
  pickupLat?: number;
  pickupLng?: number;
  deliveryAddress: string;
  deliveryLat?: number;
  deliveryLng?: number;
  distanceKm: number;
}): DeliveryOrder {
  const settings = getDeliverySettings();
  const fare = calcFare(data.distanceKm, settings);
  const orders = getAllOrders();
  const order: DeliveryOrder = {
    id: `ORD-${Date.now()}`,
    ...data,
    ...fare,
    pickupOtp: generateOtp(),
    deliveryOtp: generateOtp(),
    status: "open",
    createdAt: Date.now(),
  };
  orders.push(order);
  saveAllOrders(orders);
  return order;
}

export function acceptOrder(
  orderId: string,
  riderId: string,
  riderName: string,
): boolean {
  const orders = getAllOrders();
  const idx = orders.findIndex((o) => o.id === orderId);
  if (idx === -1 || orders[idx].status !== "open") return false; // Already taken
  orders[idx].status = "accepted";
  orders[idx].riderId = riderId;
  orders[idx].riderName = riderName;
  orders[idx].acceptedAt = Date.now();
  saveAllOrders(orders);
  return true;
}

export function verifyPickupOtp(
  orderId: string,
  riderId: string,
  otp: string,
): boolean {
  const orders = getAllOrders();
  const idx = orders.findIndex((o) => o.id === orderId);
  if (idx === -1) return false;
  const order = orders[idx];
  if (order.riderId !== riderId) return false;
  if (order.pickupOtp !== otp) return false;
  if (order.status !== "accepted") return false;
  orders[idx].status = "pickup_otp_verified";
  saveAllOrders(orders);
  return true;
}

export function verifyDeliveryOtp(
  orderId: string,
  riderId: string,
  otp: string,
): boolean {
  const orders = getAllOrders();
  const idx = orders.findIndex((o) => o.id === orderId);
  if (idx === -1) return false;
  const order = orders[idx];
  if (order.riderId !== riderId) return false;
  if (order.deliveryOtp !== otp) return false;
  if (order.status !== "pickup_otp_verified") return false;
  orders[idx].status = "completed";
  orders[idx].completedAt = Date.now();
  saveAllOrders(orders);
  // Deduct admin commission from rider wallet
  updateRiderWallet(riderId, -order.adminCommission);
  return true;
}

export function getOpenOrdersNearby(
  riderLat: number,
  riderLng: number,
  radiusKm: number,
): DeliveryOrder[] {
  const orders = getAllOrders();
  return orders.filter((o) => {
    if (o.status !== "open") return false;
    if (o.pickupLat == null || o.pickupLng == null) return true; // no GPS, show all
    const dist = calcDistKm(riderLat, riderLng, o.pickupLat, o.pickupLng);
    return dist <= radiusKm;
  });
}

function calcDistKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Session: remember which rider is logged in on this device
export function setMyRiderId(id: string | null) {
  if (id) localStorage.setItem(STORAGE_KEYS.MY_RIDER_ID, id);
  else localStorage.removeItem(STORAGE_KEYS.MY_RIDER_ID);
}

export function getMyRiderId(): string | null {
  return localStorage.getItem(STORAGE_KEYS.MY_RIDER_ID);
}

// Daily profit stats
export function getDailyStats(): {
  deliveries: number;
  totalAdminProfit: number;
} {
  const today = new Date().toDateString();
  const orders = getAllOrders();
  const todayCompleted = orders.filter((o) => {
    if (o.status !== "completed" || !o.completedAt) return false;
    return new Date(o.completedAt).toDateString() === today;
  });
  return {
    deliveries: todayCompleted.length,
    totalAdminProfit: todayCompleted.reduce(
      (sum, o) => sum + o.adminCommission,
      0,
    ),
  };
}
