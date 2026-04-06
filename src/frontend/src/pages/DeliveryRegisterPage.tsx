import { useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "../lib/router";
import { registerRider, setMyRiderId } from "../utils/deliveryStore";

export default function DeliveryRegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [idProofUrl, setIdProofUrl] = useState("");
  const [loading, setLoading] = useState(false);

  function toBase64(file: File): Promise<string> {
    return new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as string);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Sirf image file select karein");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo 5MB se chhota hona chahiye");
      return;
    }
    setPhotoUrl(await toBase64(file));
    toast.success("Photo upload ho gaya");
  }

  async function handleIdProof(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Sirf image file select karein (JPG/PNG)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("ID Proof 5MB se chhota hona chahiye");
      return;
    }
    setIdProofUrl(await toBase64(file));
    toast.success("ID Proof upload ho gaya");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Apna naam bharen");
      return;
    }
    if (!phone.trim() || phone.length < 10) {
      toast.error("Valid phone number bharen");
      return;
    }
    if (!photoUrl) {
      toast.error("Apni photo upload karein");
      return;
    }
    if (!idProofUrl) {
      toast.error("ID Proof upload karein");
      return;
    }
    setLoading(true);
    try {
      const rider = registerRider({
        name: name.trim(),
        phone: phone.trim(),
        photoUrl,
        idProofUrl,
      });
      setMyRiderId(rider.id);
      toast.success("Registration ho gaya! Admin approval ka wait karein.");
      setTimeout(() => navigate("/delivery-app"), 1500);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Registration fail hua");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
            <span className="text-3xl">🛵</span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            Delivery Boy Registration
          </h1>
          <p className="text-blue-200 text-sm mt-1">
            Digital Zindagi Delivery Network
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-2xl p-6 space-y-4"
        >
          {/* Name */}
          <div>
            <label
              htmlFor="rider-name"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              पूरा नाम *
            </label>
            <input
              id="rider-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="जैसे: Raju Kumar"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Phone */}
          <div>
            <label
              htmlFor="rider-phone"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              मोबाइल नंबर *
            </label>
            <input
              id="rider-phone"
              type="tel"
              value={phone}
              onChange={(e) =>
                setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              placeholder="10 अंक का नंबर"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Photo */}
          <div>
            <span className="block text-sm font-semibold text-gray-700 mb-1">
              अपनी फोटो *
            </span>
            <label className="cursor-pointer block">
              {photoUrl ? (
                <div className="relative">
                  <img
                    src={photoUrl}
                    alt="preview"
                    className="w-full h-32 object-cover rounded-lg border-2 border-green-400"
                  />
                  <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full px-2 py-0.5 text-xs">
                    ✓ Upload
                  </div>
                </div>
              ) : (
                <div className="w-full h-24 border-2 border-dashed border-blue-400 rounded-lg flex flex-col items-center justify-center bg-blue-50 hover:bg-blue-100 transition-colors">
                  <span className="text-2xl">📷</span>
                  <span className="text-blue-600 text-sm font-medium mt-1">
                    फोटो चुनें (JPG/PNG)
                  </span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhoto}
                className="hidden"
              />
            </label>
          </div>

          {/* ID Proof */}
          <div>
            <span className="block text-sm font-semibold text-gray-700 mb-1">
              ID Proof Screenshot * (Aadhar/License)
            </span>
            <label className="cursor-pointer block">
              {idProofUrl ? (
                <div className="relative">
                  <img
                    src={idProofUrl}
                    alt="id preview"
                    className="w-full h-32 object-cover rounded-lg border-2 border-green-400"
                  />
                  <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full px-2 py-0.5 text-xs">
                    ✓ Upload
                  </div>
                </div>
              ) : (
                <div className="w-full h-24 border-2 border-dashed border-orange-400 rounded-lg flex flex-col items-center justify-center bg-orange-50 hover:bg-orange-100 transition-colors">
                  <span className="text-2xl">🪪</span>
                  <span className="text-orange-600 text-sm font-medium mt-1">
                    ID Proof Screenshot चुनें
                  </span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleIdProof}
                className="hidden"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-base transition-colors shadow-lg"
          >
            {loading ? "Submit हो रहा है..." : "🚀 Registration Submit करें"}
          </button>

          <p className="text-center text-xs text-gray-500">
            Admin approval के बाद आप काम शुरू कर सकते हैं
          </p>
        </form>

        <div className="text-center mt-4">
          <button
            type="button"
            onClick={() => navigate("/delivery-app")}
            className="text-blue-200 text-sm underline"
          >
            पहले से registered हैं? Login करें
          </button>
        </div>
      </div>
    </div>
  );
}
