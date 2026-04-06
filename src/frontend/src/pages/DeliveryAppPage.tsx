import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "../lib/router";
import {
  type DeliveryOrder,
  type DeliveryRider,
  acceptOrder,
  getAllOrders,
  getDeliverySettings,
  getMyRiderId,
  getOpenOrdersNearby,
  getRiderById,
  onDeliveryUpdate,
  setMyRiderId,
  setRiderOnline,
  verifyDeliveryOtp,
  verifyPickupOtp,
} from "../utils/deliveryStore";

type TabType = "orders" | "active" | "wallet" | "idcard";

export default function DeliveryAppPage() {
  const navigate = useNavigate();
  const [rider, setRider] = useState<DeliveryRider | null>(null);
  const [tab, setTab] = useState<TabType>("orders");
  const [isOnline, setIsOnline] = useState(false);
  const [availableOrders, setAvailableOrders] = useState<DeliveryOrder[]>([]);
  const [activeOrder, setActiveOrder] = useState<DeliveryOrder | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const [loginPhone, setLoginPhone] = useState("");
  const [loginMode, setLoginMode] = useState(false);
  const positionRef = useRef<{ lat: number; lng: number } | null>(null);
  const settings = getDeliverySettings();

  const reload = useCallback(() => {
    const riderId = getMyRiderId();
    if (!riderId) {
      setRider(null);
      return;
    }
    const r = getRiderById(riderId);
    setRider(r ?? null);
    if (r) {
      // Get active order
      const orders = getAllOrders();
      const active = orders.find(
        (o) =>
          o.riderId === riderId &&
          ["accepted", "pickup_otp_verified"].includes(o.status),
      );
      setActiveOrder(active ?? null);
      // Get open orders nearby
      if (r.isOnline) {
        const pos = positionRef.current;
        const nearby = pos
          ? getOpenOrdersNearby(pos.lat, pos.lng, settings.broadcastRadiusKm)
          : getAllOrders().filter((o) => o.status === "open");
        setAvailableOrders(nearby);
      } else {
        setAvailableOrders([]);
      }
      setIsOnline(r.isOnline);
    }
  }, [settings.broadcastRadiusKm]);

  useEffect(() => {
    reload();
    const unsub = onDeliveryUpdate(reload);
    return unsub;
  }, [reload]);

  // Get GPS position
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      positionRef.current = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      };
      reload();
    });
  }, [reload]);

  function handleToggleOnline() {
    if (!rider) return;
    const newStatus = !isOnline;
    const pos = positionRef.current;
    setRiderOnline(rider.id, newStatus, pos?.lat, pos?.lng);
    setIsOnline(newStatus);
    toast.success(newStatus ? "🟢 आप Online हो गए" : "🔴 आप Offline हो गए");
    reload();
  }

  function handleAccept(order: DeliveryOrder) {
    if (!rider) return;
    if (rider.walletBalance <= 0) {
      toast.error("Wallet balance ₹0 है। पहले Recharge करें।");
      return;
    }
    const success = acceptOrder(order.id, rider.id, rider.name);
    if (success) {
      toast.success("Order Accept हो गया! Pickup OTP vendor से लें।");
      setTab("active");
      reload();
    } else {
      toast.error("Order किसी और ने ले लिया। अगला Order देखें।");
      reload();
    }
  }

  function handlePickupOtp() {
    if (!rider || !activeOrder) return;
    const ok = verifyPickupOtp(activeOrder.id, rider.id, otpInput.trim());
    if (ok) {
      toast.success("✅ Pickup OTP सही! अब सामान ले जाएं और Delivery OTP डालें।");
      setOtpInput("");
      reload();
    } else {
      toast.error("❌ OTP गलत है। Vendor से दोबारा लें।");
    }
  }

  function handleDeliveryOtp() {
    if (!rider || !activeOrder) return;
    const ok = verifyDeliveryOtp(activeOrder.id, rider.id, otpInput.trim());
    if (ok) {
      toast.success(
        `🎉 Delivery Complete! ₹${activeOrder.adminCommission} commission deduct हुआ।`,
      );
      setOtpInput("");
      setTab("orders");
      reload();
    } else {
      toast.error("❌ Delivery OTP गलत है। Customer से लें।");
    }
  }

  function handleLogin() {
    const riders = JSON.parse(
      localStorage.getItem("dz_delivery_riders") ?? "[]",
    ) as DeliveryRider[];
    const found = riders.find((r) => r.phone === loginPhone.trim());
    if (!found) {
      toast.error("इस नंबर से कोई rider नहीं मिला");
      return;
    }
    setMyRiderId(found.id);
    setLoginMode(false);
    reload();
    toast.success(`Welcome back, ${found.name}!`);
  }

  // --- Not logged in ---
  if (!rider) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
          <span className="text-5xl">🛵</span>
          <h2 className="text-xl font-bold text-gray-800 mt-3">
            Delivery Boy Login
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Digital Zindagi Delivery Network
          </p>
          {loginMode ? (
            <div className="mt-4 space-y-3">
              <input
                type="tel"
                value={loginPhone}
                onChange={(e) =>
                  setLoginPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                placeholder="अपना registered Phone नंबर"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleLogin}
                className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl"
              >
                Login करें
              </button>
              <button
                type="button"
                onClick={() => setLoginMode(false)}
                className="text-gray-400 text-sm underline"
              >
                वापस जाएं
              </button>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              <button
                type="button"
                onClick={() => navigate("/delivery-register")}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl"
              >
                🆕 नया Registration करें
              </button>
              <button
                type="button"
                onClick={() => setLoginMode(true)}
                className="w-full border-2 border-blue-600 text-blue-600 font-bold py-3 rounded-xl"
              >
                📱 Phone से Login करें
              </button>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="text-gray-400 text-sm underline"
              >
                Home पर जाएं
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Pending/Rejected/Blocked ---
  if (rider.status === "pending") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
          <span className="text-5xl">⏳</span>
          <h2 className="text-xl font-bold text-gray-800 mt-3">
            Approval Pending
          </h2>
          <p className="text-gray-600 text-sm mt-2">
            आपकी Registration Submit हो गई है।
            <br />
            Admin approval का wait करें।
          </p>
          <p className="text-blue-600 font-semibold mt-3 text-sm">
            ID: {rider.id}
          </p>
          <button
            type="button"
            onClick={() => {
              setMyRiderId(null);
              reload();
            }}
            className="mt-4 text-gray-400 text-sm underline"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  if (rider.status === "rejected") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
          <span className="text-5xl">❌</span>
          <h2 className="text-xl font-bold text-gray-800 mt-3">
            Application Rejected
          </h2>
          <p className="text-gray-500 text-sm mt-2">
            Admin ने आपकी application reject कर दी।
            <br />
            Support से contact करें।
          </p>
          <button
            type="button"
            onClick={() => {
              setMyRiderId(null);
              reload();
            }}
            className="mt-4 text-gray-400 text-sm underline"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  if (rider.status === "blocked") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
          <span className="text-5xl">🚫</span>
          <h2 className="text-xl font-bold text-gray-800 mt-3">
            Account Blocked
          </h2>
          <p className="text-gray-500 text-sm mt-2">
            आपका account block कर दिया गया है।
          </p>
          <button
            type="button"
            onClick={() => {
              setMyRiderId(null);
              reload();
            }}
            className="mt-4 text-gray-400 text-sm underline"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  // --- Approved Rider Dashboard ---
  const lowBalance = rider.walletBalance <= 10;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto">
      {/* Top Bar */}
      <div className="bg-blue-700 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🛵</span>
          <div>
            <p className="font-bold text-sm leading-none">{rider.name}</p>
            <p className="text-blue-200 text-xs">{rider.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lowBalance && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
              Low Balance!
            </span>
          )}
          <span className="text-sm font-bold">₹{rider.walletBalance}</span>
        </div>
      </div>

      {/* Online Toggle */}
      <div
        className={`px-4 py-3 flex items-center justify-between ${isOnline ? "bg-green-500" : "bg-gray-400"}`}
      >
        <span className="text-white font-semibold text-sm">
          {isOnline
            ? "🟢 Online — Orders मिल रहे हैं"
            : "⚫ Offline — Orders नहीं मिलेंगे"}
        </span>
        <button
          type="button"
          onClick={handleToggleOnline}
          className={`w-14 h-7 rounded-full transition-all duration-300 relative ${isOnline ? "bg-green-700" : "bg-gray-600"}`}
        >
          <span
            className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${isOnline ? "left-8" : "left-1"}`}
          />
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex bg-white border-b border-gray-200 sticky top-0 z-10">
        {(
          [
            ["orders", "📋 Orders"],
            ["active", "⚡ Active"],
            ["wallet", "💰 Wallet"],
            ["idcard", "🪪 ID"],
          ] as [TabType, string][]
        ).map(([key, label]) => (
          <button
            type="button"
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
              tab === key
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-gray-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* --- ORDERS TAB --- */}
        {tab === "orders" && (
          <div className="space-y-3">
            {!isOnline && (
              <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 text-center">
                <p className="text-yellow-700 font-semibold">⚫ आप Offline हैं</p>
                <p className="text-yellow-600 text-sm mt-1">
                  Orders देखने के लिए ऊपर Online करें
                </p>
              </div>
            )}
            {isOnline && availableOrders.length === 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
                <span className="text-4xl">🔍</span>
                <p className="text-blue-700 font-semibold mt-2">
                  कोई Order नहीं मिला
                </p>
                <p className="text-blue-500 text-sm mt-1">
                  आपके {settings.broadcastRadiusKm} KM में अभी कोई order नहीं है
                </p>
              </div>
            )}
            {isOnline &&
              availableOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white rounded-xl shadow border border-blue-100 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-bold text-gray-800 text-sm">
                        {order.id}
                      </p>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-start gap-2">
                          <span className="text-green-500 text-xs mt-0.5">
                            📦
                          </span>
                          <div>
                            <p className="text-xs text-gray-500">Pickup:</p>
                            <p className="text-sm text-gray-700">
                              {order.pickupAddress}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-red-500 text-xs mt-0.5">
                            📍
                          </span>
                          <div>
                            <p className="text-xs text-gray-500">Delivery:</p>
                            <p className="text-sm text-gray-700">
                              {order.deliveryAddress}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-3">
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-semibold">
                          {order.distanceKm.toFixed(1)} KM
                        </span>
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-semibold">
                          Earn: ₹{order.riderEarning}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAccept(order)}
                    className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl transition-colors"
                  >
                    ✅ ACCEPT करें
                  </button>
                </div>
              ))}
          </div>
        )}

        {/* --- ACTIVE TASK TAB --- */}
        {tab === "active" && (
          <div>
            {!activeOrder ? (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
                <span className="text-4xl">😴</span>
                <p className="text-gray-600 font-semibold mt-2">
                  कोई Active Task नहीं
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  Orders tab से कोई order accept करें
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Order Info */}
                <div className="bg-blue-700 text-white rounded-xl p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-blue-200 text-xs">Active Order</p>
                      <p className="font-bold">{activeOrder.id}</p>
                    </div>
                    <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">
                      {activeOrder.status === "accepted"
                        ? "🔵 Pickup Pending"
                        : "🟡 Delivering"}
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="bg-white/10 rounded-lg p-2">
                      <p className="text-blue-200 text-xs">📦 Pickup</p>
                      <p className="text-sm font-medium">
                        {activeOrder.pickupAddress}
                      </p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-2">
                      <p className="text-blue-200 text-xs">📍 Delivery</p>
                      <p className="text-sm font-medium">
                        {activeOrder.deliveryAddress}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-3">
                    <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">
                      {activeOrder.distanceKm.toFixed(1)} KM
                    </span>
                    <span className="bg-green-400/30 text-white text-xs px-2 py-1 rounded-full">
                      Earn ₹{activeOrder.riderEarning}
                    </span>
                  </div>
                </div>

                {/* OTP Section */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  {activeOrder.status === "accepted" ? (
                    <>
                      <h3 className="font-bold text-gray-800 mb-1">
                        Step 1: Pickup OTP
                      </h3>
                      <p className="text-gray-500 text-sm mb-3">
                        दुकानदार (Vendor) से 4-digit OTP लें और यहाँ डालें
                      </p>
                      <input
                        type="number"
                        value={otpInput}
                        onChange={(e) =>
                          setOtpInput(e.target.value.slice(0, 4))
                        }
                        placeholder="जैसे: 4821"
                        className="w-full border border-gray-300 rounded-lg px-3 py-3 text-center text-2xl font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={handlePickupOtp}
                        disabled={otpInput.length !== 4}
                        className="w-full mt-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
                      >
                        🔓 Pickup OTP Verify करें
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                        <p className="text-green-700 font-semibold text-sm">
                          ✅ Pickup OTP Verified! अब सामान customer को दें।
                        </p>
                      </div>
                      <h3 className="font-bold text-gray-800 mb-1">
                        Step 2: Delivery OTP
                      </h3>
                      <p className="text-gray-500 text-sm mb-3">
                        Customer से 4-digit OTP लें
                      </p>
                      <input
                        type="number"
                        value={otpInput}
                        onChange={(e) =>
                          setOtpInput(e.target.value.slice(0, 4))
                        }
                        placeholder="जैसे: 7392"
                        className="w-full border border-gray-300 rounded-lg px-3 py-3 text-center text-2xl font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={handleDeliveryOtp}
                        disabled={otpInput.length !== 4}
                        className="w-full mt-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
                      >
                        🎉 Delivery Complete करें
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- WALLET TAB --- */}
        {tab === "wallet" && (
          <div className="space-y-4">
            {/* Balance Card */}
            <div
              className={`rounded-xl p-5 text-white ${lowBalance ? "bg-gradient-to-br from-red-500 to-red-700" : "bg-gradient-to-br from-blue-600 to-blue-800"}`}
            >
              <p className="text-blue-100 text-sm">Wallet Balance</p>
              <p className="text-4xl font-extrabold mt-1">
                ₹{rider.walletBalance}
              </p>
              {lowBalance && (
                <p className="text-yellow-200 text-sm mt-2 font-semibold animate-pulse">
                  ⚠️ Low Balance! कृपया Recharge करें
                </p>
              )}
            </div>

            {/* Recharge Instructions */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-bold text-gray-800 mb-3">
                💳 Recharge कैसे करें?
              </h3>
              <div className="space-y-3">
                {(() => {
                  const dzSettings = getDeliverySettings();
                  return (
                    <>
                      {dzSettings.upiQrUrl ? (
                        <div className="text-center">
                          <p className="text-sm text-gray-600 mb-2">
                            UPI QR Code Scan करें:
                          </p>
                          <img
                            src={dzSettings.upiQrUrl}
                            alt="UPI QR"
                            className="w-40 h-40 object-contain mx-auto border-2 border-blue-200 rounded-xl"
                          />
                        </div>
                      ) : null}
                      {dzSettings.gpayNumber && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-xs text-blue-500">
                            GPay / PhonePe Number:
                          </p>
                          <p className="font-bold text-blue-800 text-lg">
                            {dzSettings.gpayNumber}
                          </p>
                        </div>
                      )}
                      {!dzSettings.upiQrUrl && !dzSettings.gpayNumber && (
                        <p className="text-gray-500 text-sm">
                          Admin ने अभी UPI details set नहीं की हैं। बाद में try करें।
                        </p>
                      )}
                    </>
                  );
                })()}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-yellow-800 text-sm font-semibold">
                    📸 Payment Screenshot भेजें
                  </p>
                  <p className="text-yellow-700 text-xs mt-1">
                    Payment करने के बाद screenshot WhatsApp पर भेजें। Admin आपका
                    balance update कर देगा।
                  </p>
                </div>
              </div>
            </div>

            {/* Transaction Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-bold text-gray-800 mb-2">
                Commission Structure
              </h3>
              {(() => {
                const s = getDeliverySettings();
                return (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Base Fare (0-2 KM)</span>
                      <span className="font-semibold">₹{s.baseFare}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Extra per KM</span>
                      <span className="font-semibold">₹{s.extraPerKm}/KM</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-red-500">
                        Admin Commission (प्रति delivery)
                      </span>
                      <span className="font-semibold text-red-600">
                        ₹{s.adminCommission}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* --- ID CARD TAB --- */}
        {tab === "idcard" && (
          <div className="flex flex-col items-center">
            {/* Digital ID Card */}
            <div className="w-full max-w-sm bg-gradient-to-br from-blue-700 via-blue-800 to-blue-900 rounded-2xl p-5 shadow-2xl">
              {/* Card Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <img
                    src="/logo.png"
                    alt="Logo"
                    className="w-8 h-8 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <div>
                    <p className="text-white font-bold text-xs leading-none">
                      Digital Zindagi
                    </p>
                    <p className="text-blue-200 text-[10px]">
                      Delivery Network
                    </p>
                  </div>
                </div>
                <div className="bg-green-400 text-green-900 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span>✓</span> VERIFIED
                </div>
              </div>

              {/* Photo + Info */}
              <div className="flex items-center gap-4 mb-4">
                {rider.photoUrl ? (
                  <img
                    src={rider.photoUrl}
                    alt={rider.name}
                    className="w-20 h-20 rounded-xl object-cover border-2 border-white/30"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-white/20 flex items-center justify-center">
                    <span className="text-3xl">👤</span>
                  </div>
                )}
                <div>
                  <p className="text-white font-bold text-lg leading-tight">
                    {rider.name}
                  </p>
                  <p className="text-blue-200 text-sm mt-1">Delivery Partner</p>
                  <p className="text-blue-300 text-xs mt-0.5">{rider.phone}</p>
                </div>
              </div>

              {/* ID Number */}
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-blue-300 text-xs">Unique ID</p>
                <p className="text-white font-mono font-bold text-xl tracking-wider mt-0.5">
                  {rider.id}
                </p>
              </div>

              {/* Footer */}
              <div className="mt-4 flex justify-between items-center">
                <p className="text-blue-300 text-xs">
                  Joined:{" "}
                  {new Date(rider.createdAt).toLocaleDateString("hi-IN")}
                </p>
                <p className="text-blue-200 text-xs">digitalzindagi.in</p>
              </div>
            </div>

            <p className="text-gray-400 text-xs mt-4 text-center">
              यह आपका Official Digital ID Card है।
              <br />
              किसी भी Vendor को दिखाएं।
            </p>

            <button
              type="button"
              onClick={() => {
                setMyRiderId(null);
                reload();
              }}
              className="mt-6 text-red-400 text-sm underline"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
