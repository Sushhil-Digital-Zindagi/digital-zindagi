import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type DeliveryRider,
  type DeliverySettings,
  getAllOrders,
  getAllRiders,
  getDailyStats,
  getDeliverySettings,
  onDeliveryUpdate,
  saveDeliverySettings,
  updateRiderStatus,
  updateRiderWallet,
} from "../utils/deliveryStore";

export default function DeliveryAdminPanel() {
  const [settings, setSettings] =
    useState<DeliverySettings>(getDeliverySettings);
  const [riders, setRiders] = useState<DeliveryRider[]>([]);
  const [stats, setStats] = useState(getDailyStats);
  const [viewIdRider, setViewIdRider] = useState<DeliveryRider | null>(null);
  const [rechargeAmounts, setRechargeAmounts] = useState<
    Record<string, string>
  >({});
  const [activeSection, setActiveSection] = useState<
    "dashboard" | "riders" | "rates" | "upi"
  >("dashboard");

  const reload = useCallback(() => {
    setRiders(getAllRiders());
    setStats(getDailyStats());
    setSettings(getDeliverySettings());
  }, []);

  useEffect(() => {
    reload();
    const unsub = onDeliveryUpdate(reload);
    return unsub;
  }, [reload]);

  function handleSaveSettings() {
    saveDeliverySettings(settings);
    toast.success("✅ Settings save हो गई!");
  }

  function handleApprove(rid: string) {
    updateRiderStatus(rid, "approved");
    toast.success("Rider Approved ✓");
    reload();
  }
  function handleReject(rid: string) {
    updateRiderStatus(rid, "rejected");
    toast.info("Rider Rejected");
    reload();
  }
  function handleBlock(rid: string) {
    updateRiderStatus(rid, "blocked");
    toast.warning("Rider Blocked");
    reload();
  }

  function handleRecharge(rid: string) {
    const amt = Number.parseFloat(rechargeAmounts[rid] ?? "0");
    if (!amt || amt <= 0) {
      toast.error("सही amount डालें");
      return;
    }
    updateRiderWallet(rid, amt);
    toast.success(`₹${amt} balance add हो गया!`);
    setRechargeAmounts((prev) => ({ ...prev, [rid]: "" }));
    reload();
  }

  const pendingRiders = riders.filter((r) => r.status === "pending");
  const approvedRiders = riders.filter((r) => r.status === "approved");
  const allOrders = getAllOrders();
  const todayStr = new Date().toDateString();
  const todayOrders = allOrders.filter(
    (o) => o.completedAt && new Date(o.completedAt).toDateString() === todayStr,
  );

  return (
    <div className="space-y-4">
      {/* Global Service Toggle */}
      <div
        className={`rounded-xl p-4 flex items-center justify-between shadow ${settings.serviceEnabled ? "bg-gradient-to-r from-green-500 to-green-600" : "bg-gradient-to-r from-gray-500 to-gray-600"}`}
      >
        <div>
          <p className="text-white font-bold text-base">🚚 Delivery Service</p>
          <p className="text-white/70 text-xs">
            {settings.serviceEnabled
              ? "Service ON — Orders आ रहे हैं"
              : "Service OFF — Koi order nahi"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const s = { ...settings, serviceEnabled: !settings.serviceEnabled };
            setSettings(s);
            saveDeliverySettings(s);
          }}
          className={`w-16 h-8 rounded-full transition-all relative ${settings.serviceEnabled ? "bg-green-700" : "bg-gray-700"}`}
        >
          <span
            className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${settings.serviceEnabled ? "left-9" : "left-1"}`}
          />
        </button>
      </div>

      {/* Sub-nav */}
      <div className="grid grid-cols-4 gap-1.5">
        {(
          [
            ["dashboard", "📊 Dashboard"],
            ["riders", "👥 Riders"],
            ["rates", "💰 Rates"],
            ["upi", "📱 UPI"],
          ] as const
        ).map(([key, label]) => (
          <button
            type="button"
            key={key}
            onClick={() => setActiveSection(key)}
            className={`py-2 text-xs font-semibold rounded-lg transition-colors ${activeSection === key ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* DASHBOARD */}
      {activeSection === "dashboard" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-4 text-white">
              <p className="text-blue-100 text-xs">Aaj ki Deliveries</p>
              <p className="text-3xl font-extrabold mt-1">{stats.deliveries}</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-xl p-4 text-white">
              <p className="text-green-100 text-xs">Aaj ka Profit</p>
              <p className="text-3xl font-extrabold mt-1">
                ₹{stats.totalAdminProfit}
              </p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-gray-400 text-xs">Total Riders</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">
                {riders.length}
              </p>
            </div>
            <div className="bg-white border border-orange-200 rounded-xl p-4">
              <p className="text-orange-400 text-xs">Pending Approval</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {pendingRiders.length}
              </p>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-bold text-gray-800 mb-3">
              Aaj ke Completed Orders
            </h3>
            {todayOrders.length === 0 ? (
              <p className="text-gray-400 text-sm">
                Aaj koi completed order nahi
              </p>
            ) : (
              <div className="space-y-2">
                {todayOrders
                  .slice()
                  .reverse()
                  .map((o) => (
                    <div
                      key={o.id}
                      className="flex items-center justify-between bg-gray-50 rounded-lg p-2"
                    >
                      <div>
                        <p className="text-xs font-semibold text-gray-700">
                          {o.id}
                        </p>
                        <p className="text-xs text-gray-400">
                          {o.customerName} • {o.distanceKm} KM
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-green-600">
                          ₹{o.adminCommission}
                        </p>
                        <p className="text-xs text-gray-400">{o.riderName}</p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* RIDERS */}
      {activeSection === "riders" && (
        <div className="space-y-4">
          {/* Pending Approvals */}
          {pendingRiders.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <h3 className="font-bold text-orange-800 mb-3">
                ⏳ Pending Approvals ({pendingRiders.length})
              </h3>
              <div className="space-y-4">
                {pendingRiders.map((r) => (
                  <div
                    key={r.id}
                    className="bg-white rounded-xl border border-orange-100 p-4 shadow-sm"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      {r.photoUrl ? (
                        <img
                          src={r.photoUrl}
                          alt={r.name}
                          className="w-14 h-14 rounded-full object-cover border-2 border-orange-200"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-2xl">👤</span>
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-gray-800">{r.name}</p>
                        <p className="text-gray-500 text-sm">{r.phone}</p>
                        <p className="text-blue-600 text-xs font-mono">
                          {r.id}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setViewIdRider(r)}
                        className="bg-blue-50 border border-blue-300 text-blue-700 font-semibold text-sm py-2 rounded-lg"
                      >
                        🚪 ID Screenshot
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApprove(r.id)}
                        className="bg-green-500 text-white font-bold text-sm py-2 rounded-lg"
                      >
                        ✓ Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(r.id)}
                        className="bg-gray-200 text-gray-700 font-semibold text-sm py-2 rounded-lg"
                      >
                        ✕ Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBlock(r.id)}
                        className="bg-red-500 text-white font-bold text-sm py-2 rounded-lg"
                      >
                        🚫 Block
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approved Riders */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-bold text-gray-800 mb-3">
              ✅ Approved Riders ({approvedRiders.length})
            </h3>
            {approvedRiders.length === 0 ? (
              <p className="text-gray-400 text-sm">
                Koi approved rider nahi hai abhi
              </p>
            ) : (
              <div className="space-y-3">
                {approvedRiders.map((r) => (
                  <div
                    key={r.id}
                    className="border border-gray-100 rounded-xl p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {r.photoUrl ? (
                          <img
                            src={r.photoUrl}
                            alt={r.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <span>👤</span>
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">
                            {r.name}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {r.phone} • {r.id}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-base font-bold ${r.walletBalance <= 10 ? "text-red-500" : "text-green-600"}`}
                        >
                          ₹{r.walletBalance}
                        </p>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded-full ${r.isOnline ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                        >
                          {r.isOnline ? "🟢 Online" : "⚫ Offline"}
                        </span>
                      </div>
                    </div>
                    {/* Recharge */}
                    <div className="flex gap-2 mt-3">
                      <input
                        type="number"
                        value={rechargeAmounts[r.id] ?? ""}
                        onChange={(e) =>
                          setRechargeAmounts((prev) => ({
                            ...prev,
                            [r.id]: e.target.value,
                          }))
                        }
                        placeholder="₹ Amount"
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <button
                        type="button"
                        onClick={() => handleRecharge(r.id)}
                        className="bg-green-500 text-white font-bold px-3 py-2 rounded-lg text-sm"
                      >
                        +Recharge
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBlock(r.id)}
                        className="bg-red-100 text-red-600 font-semibold px-2 py-2 rounded-lg text-xs"
                      >
                        Block
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* RATES */}
      {activeSection === "rates" && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="font-bold text-gray-800 text-base">
            💰 Rate Card Settings
          </h3>
          <div>
            <label
              htmlFor="base-fare"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Base Fare (0-2 KM) ₹
            </label>
            <input
              id="base-fare"
              type="number"
              value={settings.baseFare}
              onChange={(e) =>
                setSettings((s) => ({ ...s, baseFare: Number(e.target.value) }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-gray-400 text-xs mt-1">
              Pehle 2 KM ke liye fixed charge
            </p>
          </div>
          <div>
            <label
              htmlFor="extra-per-km"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Extra Charge per KM ₹
            </label>
            <input
              id="extra-per-km"
              type="number"
              value={settings.extraPerKm}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  extraPerKm: Number(e.target.value),
                }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-gray-400 text-xs mt-1">
              2 KM ke baad har KM ka charge
            </p>
          </div>
          <div>
            <label
              htmlFor="admin-commission"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Admin Commission per Delivery ₹
            </label>
            <input
              id="admin-commission"
              type="number"
              value={settings.adminCommission}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  adminCommission: Number(e.target.value),
                }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-gray-400 text-xs mt-1">
              Yeh amount rider ke wallet se delivery complete hone par kataega
            </p>
          </div>
          <div>
            <label
              htmlFor="broadcast-radius"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Broadcast Radius (KM)
            </label>
            <input
              id="broadcast-radius"
              type="number"
              value={settings.broadcastRadiusKm}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  broadcastRadiusKm: Number(e.target.value),
                }))
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-gray-400 text-xs mt-1">
              Itne KM ke riders ko orders dikhenge (default: 5)
            </p>
          </div>

          {/* Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-blue-700 font-semibold text-sm mb-2">
              Rate Preview (3 KM ka order)
            </p>
            {(() => {
              const preview = {
                customerFare:
                  settings.baseFare + Math.max(0, 3 - 2) * settings.extraPerKm,
                riderEarning:
                  settings.baseFare +
                  Math.max(0, 3 - 2) * settings.extraPerKm -
                  settings.adminCommission,
                adminCommission: settings.adminCommission,
              };
              return (
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Customer Fare</span>
                    <span className="font-bold">₹{preview.customerFare}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Rider Earning</span>
                    <span className="font-bold text-green-600">
                      ₹{Math.max(0, preview.riderEarning)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Admin Commission</span>
                    <span className="font-bold text-blue-700">
                      ₹{preview.adminCommission}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>

          <button
            type="button"
            onClick={handleSaveSettings}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors"
          >
            ✅ Save Rate Card
          </button>
        </div>
      )}

      {/* UPI SETTINGS */}
      {activeSection === "upi" && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="font-bold text-gray-800 text-base">
            📱 UPI / Payment Settings
          </h3>
          <div>
            <label
              htmlFor="gpay-number"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              GPay / UPI Number
            </label>
            <input
              id="gpay-number"
              type="tel"
              value={settings.gpayNumber}
              onChange={(e) =>
                setSettings((s) => ({ ...s, gpayNumber: e.target.value }))
              }
              placeholder="+91 98765 43210"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="upi-qr-url"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              UPI QR Code Image URL
            </label>
            <input
              id="upi-qr-url"
              type="url"
              value={settings.upiQrUrl}
              onChange={(e) =>
                setSettings((s) => ({ ...s, upiQrUrl: e.target.value }))
              }
              placeholder="https://... (QR code ka image link)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {settings.upiQrUrl && (
              <div className="mt-2 text-center">
                <img
                  src={settings.upiQrUrl}
                  alt="QR Preview"
                  className="w-32 h-32 object-contain mx-auto border-2 border-blue-200 rounded-xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <p className="text-xs text-gray-400 mt-1">Preview</p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleSaveSettings}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors"
          >
            ✅ Save UPI Settings
          </button>
        </div>
      )}

      {/* ID Screenshot Modal */}
      {viewIdRider && (
        // biome-ignore lint/a11y/useKeyWithClickEvents: modal backdrop dismiss
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setViewIdRider(null)}
        >
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: stop propagation only */}
          <div
            className="bg-white rounded-2xl p-4 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-800">
                ID Proof — {viewIdRider.name}
              </h3>
              <button
                type="button"
                onClick={() => setViewIdRider(null)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>
            <img
              src={viewIdRider.idProofUrl}
              alt="ID Proof"
              className="w-full rounded-xl"
            />
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  handleApprove(viewIdRider.id);
                  setViewIdRider(null);
                }}
                className="flex-1 bg-green-500 text-white font-bold py-2.5 rounded-xl"
              >
                ✓ Approve
              </button>
              <button
                type="button"
                onClick={() => {
                  handleReject(viewIdRider.id);
                  setViewIdRider(null);
                }}
                className="flex-1 bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl"
              >
                ✕ Reject
              </button>
              <button
                type="button"
                onClick={() => {
                  handleBlock(viewIdRider.id);
                  setViewIdRider(null);
                }}
                className="flex-1 bg-red-500 text-white font-bold py-2.5 rounded-xl"
              >
                🚫 Block
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
