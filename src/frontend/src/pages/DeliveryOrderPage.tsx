import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "../lib/router";
import {
  calcFare,
  createOrder,
  getDeliverySettings,
} from "../utils/deliveryStore";

export default function DeliveryOrderPage() {
  const navigate = useNavigate();
  const settings = getDeliverySettings();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [distanceKm, setDistanceKm] = useState(2);
  const [submitted, setSubmitted] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<ReturnType<
    typeof createOrder
  > | null>(null);

  if (!settings.serviceEnabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-6 text-center max-w-sm">
          <span className="text-5xl">🔴</span>
          <h2 className="text-xl font-bold text-gray-800 mt-3">
            Delivery Service बंद है
          </h2>
          <p className="text-gray-500 text-sm mt-2">
            Admin ने अभी delivery service बंद की हुई है।
            <br />
            कुछ देर बाद try करें।
          </p>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="mt-4 bg-blue-600 text-white font-bold py-2.5 px-6 rounded-xl"
          >
            Home जाएं
          </button>
        </div>
      </div>
    );
  }

  const fare = calcFare(distanceKm, settings);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customerName.trim()) {
      toast.error("Customer का नाम भरें");
      return;
    }
    if (!customerPhone.trim() || customerPhone.length < 10) {
      toast.error("Valid phone number भरें");
      return;
    }
    if (!pickupAddress.trim()) {
      toast.error("Pickup address भरें");
      return;
    }
    if (!deliveryAddress.trim()) {
      toast.error("Delivery address भरें");
      return;
    }
    const order = createOrder({
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      pickupAddress: pickupAddress.trim(),
      deliveryAddress: deliveryAddress.trim(),
      distanceKm,
    });
    setCreatedOrder(order);
    setSubmitted(true);
    toast.success("Order Place हो गया!");
  }

  if (submitted && createdOrder) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
          <div className="text-center mb-4">
            <span className="text-5xl">✅</span>
            <h2 className="text-xl font-bold text-gray-800 mt-2">
              Order Place हो गया!
            </h2>
            <p className="text-gray-500 text-sm mt-1">
              Delivery Boy को notify किया जा रहा है।
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Order ID</span>
              <span className="font-bold text-blue-700">{createdOrder.id}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Distance</span>
              <span className="font-semibold">
                {createdOrder.distanceKm} KM
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Fare</span>
              <span className="font-bold text-green-600 text-base">
                ₹{createdOrder.customerFare}
              </span>
            </div>
            <div className="border-t pt-3">
              <p className="text-xs text-gray-500 mb-2">
                🔐 OTP Codes (Vendor को दें):
              </p>
              <div className="flex gap-2">
                <div className="flex-1 bg-orange-50 border border-orange-200 rounded-lg p-2 text-center">
                  <p className="text-orange-500 text-xs">Pickup OTP</p>
                  <p className="text-2xl font-mono font-bold text-orange-700">
                    {createdOrder.pickupOtp}
                  </p>
                </div>
                <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-2 text-center">
                  <p className="text-green-500 text-xs">Delivery OTP</p>
                  <p className="text-2xl font-mono font-bold text-green-700">
                    {createdOrder.deliveryOtp}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              setCustomerName("");
              setCustomerPhone("");
              setPickupAddress("");
              setDeliveryAddress("");
              setDistanceKm(2);
              setCreatedOrder(null);
            }}
            className="w-full mt-4 bg-blue-600 text-white font-bold py-2.5 rounded-xl"
          >
            नया Order Place करें
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="w-full mt-2 border border-gray-300 text-gray-600 font-semibold py-2.5 rounded-xl"
          >
            Home जाएं
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 p-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-5">
          <h1 className="text-2xl font-bold text-white">🛵 Delivery Book करें</h1>
          <p className="text-blue-200 text-sm mt-1">
            Digital Zindagi Fast Delivery
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-2xl p-5 space-y-4"
        >
          <div>
            <label
              htmlFor="customer-name"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Customer का नाम *
            </label>
            <input
              id="customer-name"
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="पूरा नाम"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="customer-phone"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Phone Number *
            </label>
            <input
              id="customer-phone"
              type="tel"
              value={customerPhone}
              onChange={(e) =>
                setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              placeholder="10 अंक"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label
              htmlFor="pickup-address"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              📦 Pickup Address *
            </label>
            <textarea
              id="pickup-address"
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              placeholder="सामान कहाँ से उठाना है?"
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div>
            <label
              htmlFor="delivery-address"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              📍 Delivery Address *
            </label>
            <textarea
              id="delivery-address"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="सामान कहाँ पहुंचाना है?"
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div>
            <label
              htmlFor="distance-km"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              दूरी (KM):{" "}
              <span className="text-blue-600 font-bold">{distanceKm} KM</span>
            </label>
            <input
              id="distance-km"
              type="range"
              min={0.5}
              max={30}
              step={0.5}
              value={distanceKm}
              onChange={(e) => setDistanceKm(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0.5 KM</span>
              <span>30 KM</span>
            </div>
          </div>

          {/* Fare Preview */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
            <h3 className="font-bold text-blue-800 text-sm mb-2">
              💰 Fare Calculate
            </h3>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Base Fare (0-2 KM)</span>
                <span>₹{settings.baseFare}</span>
              </div>
              {distanceKm > 2 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Extra {(distanceKm - 2).toFixed(1)} KM × ₹
                    {settings.extraPerKm}
                  </span>
                  <span>
                    ₹{Math.round((distanceKm - 2) * settings.extraPerKm)}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-bold border-t pt-1.5">
                <span className="text-green-700">Total Customer Fare</span>
                <span className="text-green-700 text-base">
                  ₹{fare.customerFare}
                </span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-base shadow-lg transition-colors"
          >
            🚀 Order Place करें
          </button>
        </form>
      </div>
    </div>
  );
}
