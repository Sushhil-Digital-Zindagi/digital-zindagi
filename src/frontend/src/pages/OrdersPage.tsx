import {
  Camera,
  Mic,
  MicOff,
  Package,
  Send,
  ShoppingBag,
  Square,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import Footer from "../components/Footer";
import Header from "../components/Header";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";

interface LocalOrder {
  id: string;
  providerId: string;
  providerName: string;
  type: "text" | "voice" | "photo";
  content: string;
  timestamp: string;
  status: "pending" | "accepted" | "completed";
}

function getOrders(): LocalOrder[] {
  try {
    return JSON.parse(localStorage.getItem("dz_orders") ?? "[]");
  } catch {
    return [];
  }
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  accepted: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
};

const TYPE_LABELS: Record<string, string> = {
  text: "Text Order",
  voice: "Voice Order",
  photo: "Photo Order",
};

export default function OrdersPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [orders, setOrders] = useState<LocalOrder[]>(() => getOrders());

  // Refresh orders from localStorage
  useEffect(() => {
    const refresh = () => setOrders(getOrders());
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);

  const isProvider = user?.role === "provider";

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="bg-emerald-header text-white px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-heading font-bold text-3xl">
            {t("ordersTitle")}
          </h1>
          <p className="text-white/70 text-sm mt-2">
            Apne saare orders ek jagah
          </p>
        </div>
      </div>

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        {orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center py-16"
            data-ocid="orders.empty_state"
          >
            <div className="w-24 h-24 rounded-full bg-accent flex items-center justify-center mx-auto mb-6">
              <ShoppingBag size={40} className="text-primary" />
            </div>
            <h2 className="font-heading font-bold text-2xl text-foreground mb-3">
              {t("ordersTitle")}
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {isProvider
                ? "Customers ke orders yahan dikhenge"
                : "Aapne abhi koi order nahi diya"}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {orders.map((order, i) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                data-ocid={`orders.item.${i + 1}`}
                className="bg-white rounded-2xl border border-border shadow-sm p-5"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold text-foreground">
                      {order.providerName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.timestamp).toLocaleString("hi-IN")}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        STATUS_COLORS[order.status]
                      }`}
                    >
                      {order.status.charAt(0).toUpperCase() +
                        order.status.slice(1)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {TYPE_LABELS[order.type]}
                    </span>
                  </div>
                </div>

                {order.type === "text" && (
                  <p className="text-sm text-foreground bg-muted rounded-xl px-4 py-3">
                    {order.content}
                  </p>
                )}
                {order.type === "voice" && (
                  <div className="flex items-center gap-2 bg-muted rounded-xl px-4 py-3">
                    <Mic size={16} className="text-primary" />
                    <span className="text-sm text-muted-foreground">
                      Voice Order Recorded
                    </span>
                  </div>
                )}
                {order.type === "photo" &&
                  order.content.startsWith("data:") && (
                    <img
                      src={order.content}
                      alt="Order attachment"
                      className="w-full max-h-48 object-cover rounded-xl"
                    />
                  )}
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

// ---- Order Modal Component (exported for use in CategoryPage) ----
export interface OrderModalProps {
  open: boolean;
  onClose: () => void;
  providerId: string;
  providerName: string;
}

export function OrderModal({
  open,
  onClose,
  providerId,
  providerName,
}: OrderModalProps) {
  const [tab, setTab] = useState<"text" | "voice" | "photo">("text");
  const [textOrder, setTextOrder] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceSaved, setVoiceSaved] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveOrder = (type: "text" | "voice" | "photo", content: string) => {
    const orders: LocalOrder[] = (() => {
      try {
        return JSON.parse(localStorage.getItem("dz_orders") ?? "[]");
      } catch {
        return [];
      }
    })();
    const newOrder: LocalOrder = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      providerId,
      providerName,
      type,
      content,
      timestamp: new Date().toISOString(),
      status: "pending",
    };
    orders.unshift(newOrder);
    localStorage.setItem("dz_orders", JSON.stringify(orders));
    window.dispatchEvent(new Event("storage"));
  };

  const handleTextSubmit = () => {
    if (!textOrder.trim()) {
      toast.error("Order description likhein");
      return;
    }
    saveOrder("text", textOrder.trim());
    toast.success("Order send ho gaya!");
    setTextOrder("");
    onClose();
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        for (const track of stream.getTracks()) {
          track.stop();
        }
        setVoiceSaved(true);
        saveOrder("voice", "voice_recorded");
        toast.success("Voice order save ho gaya!");
        onClose();
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
    } catch {
      toast.error("Microphone access denied");
    }
  };

  const handleStopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setPhotoPreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoSubmit = () => {
    if (!photoPreview) {
      toast.error("Pehle photo select karein");
      return;
    }
    saveOrder("photo", photoPreview);
    toast.success("Photo order send ho gaya!");
    setPhotoPreview(null);
    onClose();
  };

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed inset-x-4 bottom-0 z-50 bg-white rounded-t-3xl shadow-2xl pb-safe md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md md:rounded-3xl"
            data-ocid="orders.modal"
          >
            <div className="bg-emerald-header px-6 py-5 rounded-t-3xl md:rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-bold text-white text-lg">
                    Order Bhejo
                  </h3>
                  <p className="text-white/70 text-sm">{providerName}</p>
                </div>
                <button
                  type="button"
                  data-ocid="orders.close_button"
                  onClick={onClose}
                  className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10"
                >
                  <Square size={18} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mt-4 bg-white/10 rounded-xl p-1">
                {(["text", "voice", "photo"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    data-ocid="orders.tab"
                    onClick={() => setTab(t)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      tab === t
                        ? "bg-white text-emerald-800"
                        : "text-white/80 hover:text-white"
                    }`}
                  >
                    {t === "text" ? "Text" : t === "voice" ? "Voice" : "Photo"}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-6 py-5">
              {tab === "text" && (
                <div className="space-y-3">
                  <textarea
                    data-ocid="orders.textarea"
                    value={textOrder}
                    onChange={(e) => setTextOrder(e.target.value)}
                    rows={4}
                    placeholder="Apna order describe karein..."
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                  <button
                    type="button"
                    data-ocid="orders.submit_button"
                    onClick={handleTextSubmit}
                    className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90"
                  >
                    <Send size={16} /> Order Send Karein
                  </button>
                </div>
              )}

              {tab === "voice" && (
                <div className="space-y-4 text-center py-4">
                  {!isRecording ? (
                    <button
                      type="button"
                      data-ocid="orders.primary_button"
                      onClick={handleStartRecording}
                      className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto hover:opacity-90 shadow-lg"
                    >
                      <Mic size={32} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      data-ocid="orders.secondary_button"
                      onClick={handleStopRecording}
                      className="w-20 h-20 rounded-full bg-red-500 text-white flex items-center justify-center mx-auto shadow-lg"
                    >
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{
                          repeat: Number.POSITIVE_INFINITY,
                          duration: 0.8,
                        }}
                      >
                        <MicOff size={32} />
                      </motion.div>
                    </button>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {isRecording ? (
                      <span className="text-red-500 font-semibold">
                        Recording...
                      </span>
                    ) : voiceSaved ? (
                      "Voice order save ho gaya!"
                    ) : (
                      "Button dabao aur bolo apna order"
                    )}
                  </p>
                </div>
              )}

              {tab === "photo" && (
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhoto}
                  />
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Order preview"
                      className="w-full max-h-48 object-cover rounded-xl border border-border"
                    />
                  ) : (
                    <button
                      type="button"
                      data-ocid="orders.upload_button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full border-2 border-dashed border-border rounded-xl py-8 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                    >
                      <Camera size={32} />
                      <span className="text-sm font-medium">
                        Photo Select / Camera
                      </span>
                    </button>
                  )}
                  {photoPreview && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoPreview(null);
                          if (fileInputRef.current)
                            fileInputRef.current.value = "";
                        }}
                        className="flex-1 border border-border rounded-xl py-2 text-sm text-muted-foreground hover:bg-muted"
                      >
                        Badlo
                      </button>
                      <button
                        type="button"
                        data-ocid="orders.submit_button"
                        onClick={handlePhotoSubmit}
                        className="flex-1 bg-primary text-primary-foreground font-bold py-2 rounded-xl text-sm flex items-center justify-center gap-1.5 hover:opacity-90"
                      >
                        <Package size={14} /> Send
                      </button>
                    </div>
                  )}
                  {!photoPreview && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl text-sm hover:opacity-90"
                    >
                      Photo Chunein
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
