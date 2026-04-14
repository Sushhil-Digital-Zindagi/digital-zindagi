import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  CheckCircle,
  Clock,
  Loader2,
  Package,
  Plus,
  QrCode,
  Save,
  Trash2,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ExternalBlob } from "../backend";
import Header from "../components/Header";
import { useAuth } from "../contexts/AuthContext";
import { useActor } from "../hooks/useActor";
import { useProviderOrders, useProviderProfile } from "../hooks/useQueries";
import { Link } from "../lib/router";
import { ApprovalStatus } from "../types/appTypes";
import type { Order, ServiceRate } from "../types/appTypes";

const CATEGORIES = [
  "Scrap",
  "Doctor",
  "Market",
  "Labor",
  "Electronics",
  "Plumber",
  "Carpenter",
  "Tutor",
  "Electrician",
  "Painter",
  "Tailor",
  "Salon",
];

type TabKey = "profile" | "photos" | "services" | "orders" | "subscription";

function statusBadgeStyle(status: string) {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "accepted":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "completed":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "cancelled":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function OrderCard({
  order,
  onUpdateStatus,
  index,
}: {
  order: Order;
  onUpdateStatus: (orderId: bigint, status: string) => Promise<void>;
  index: number;
}) {
  const [updating, setUpdating] = useState(false);

  const handleStatus = async (status: string) => {
    setUpdating(true);
    try {
      await onUpdateStatus(order.id, status);
    } finally {
      setUpdating(false);
    }
  };

  const createdDate = new Date(
    Number(order.createdAt) / 1_000_000,
  ).toLocaleDateString("hi-IN");

  return (
    <div
      data-ocid={`dashboard.item.${index}`}
      className="bg-white rounded-2xl border border-border shadow-xs p-4 space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-sm text-foreground">
            {order.customerName}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{createdDate}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant="outline" className="text-xs capitalize">
            {order.orderType}
          </Badge>
          <Badge
            variant="outline"
            className={`text-xs capitalize ${statusBadgeStyle(order.status)}`}
          >
            {order.status}
          </Badge>
        </div>
      </div>

      <p className="text-sm text-foreground line-clamp-3">
        {order.description}
      </p>

      {order.imageUrl && (
        <img
          src={order.imageUrl}
          alt="Order se judi tasveer"
          className="w-full max-h-40 object-cover rounded-xl"
        />
      )}

      {/* Action buttons based on status */}
      {order.status === "pending" && (
        <div className="flex gap-2">
          <button
            type="button"
            data-ocid={`dashboard.confirm_button.${index}`}
            onClick={() => handleStatus("accepted")}
            disabled={updating}
            className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold py-2 rounded-xl hover:opacity-90 disabled:opacity-60"
          >
            {updating ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <CheckCircle size={12} />
            )}
            Accept
          </button>
          <button
            type="button"
            data-ocid={`dashboard.delete_button.${index}`}
            onClick={() => handleStatus("cancelled")}
            disabled={updating}
            className="flex-1 flex items-center justify-center gap-1.5 bg-destructive/10 text-destructive text-xs font-semibold py-2 rounded-xl hover:bg-destructive/20 disabled:opacity-60"
          >
            <XCircle size={12} />
            Cancel
          </button>
        </div>
      )}
      {order.status === "accepted" && (
        <button
          type="button"
          data-ocid={`dashboard.confirm_button.${index}`}
          onClick={() => handleStatus("completed")}
          disabled={updating}
          className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 text-white text-xs font-semibold py-2 rounded-xl hover:opacity-90 disabled:opacity-60"
        >
          {updating ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <CheckCircle size={12} />
          )}
          Mark Complete
        </button>
      )}
    </div>
  );
}

export default function ProviderDashboardPage() {
  const [tab, setTab] = useState<TabKey>("profile");
  const { user } = useAuth();
  const { actor } = useActor();
  const qc = useQueryClient();
  const { data: profile, isLoading } = useProviderProfile(user?.userId ?? null);
  const { data: orders, isLoading: ordersLoading } = useProviderOrders(
    user?.userId ?? null,
  );

  // Approval status polling — every 3 seconds when page is visible
  const [polledApprovalStatus, setPolledApprovalStatus] =
    useState<ApprovalStatus | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!actor || !user?.userId) return;

    const poll = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const p = await actor.getProviderProfile(user.userId);
        if (p?.approvalStatus) {
          setPolledApprovalStatus(p.approvalStatus as ApprovalStatus);
          // Invalidate React Query cache so profile re-renders if status changed
          qc.invalidateQueries({ queryKey: ["providerProfile"] });
        }
      } catch {
        // Silently ignore polling failures
      }
    };

    poll();
    pollRef.current = setInterval(poll, 3000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") poll();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [actor, user?.userId, qc]);

  const [shopName, setShopName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [category, setCategory] = useState("");
  const [upiId, setUpiId] = useState("");
  const [qrCodeBlobId, setQrCodeBlobId] = useState<string | null>(null);
  const [uploadingQr, setUploadingQr] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceDesc, setNewServiceDesc] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("");
  const [addingService, setAddingService] = useState(false);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  // Use polled status (real-time) if available, otherwise fall back to React Query profile
  const effectiveApprovalStatus =
    polledApprovalStatus ?? profile?.approvalStatus;
  const approved = effectiveApprovalStatus === ApprovalStatus.approved;
  const rejected = effectiveApprovalStatus === ApprovalStatus.rejected;

  if (rejected) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div
          className="max-w-md mx-auto px-4 py-20 text-center"
          data-ocid="dashboard.card"
        >
          <div className="text-5xl mb-4">❌</div>
          <h2 className="font-heading font-bold text-2xl text-foreground mb-2">
            Registration Rejected
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            Aapki provider registration reject ho gayi hai. Admin se contact
            karein ya dubara register karein.
          </p>
          <Link
            to="/signup"
            data-ocid="dashboard.primary_button"
            className="inline-block bg-primary text-primary-foreground font-bold px-8 py-3 rounded-full hover:opacity-90"
          >
            Dubara Register Karein
          </Link>
        </div>
      </div>
    );
  }

  if (!approved) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div
          className="max-w-md mx-auto px-4 py-20 text-center"
          data-ocid="dashboard.card"
        >
          {/* Approval pending banner */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 flex flex-col items-center gap-3"
            data-ocid="dashboard.approval_banner"
          >
            <Clock size={36} className="text-amber-500" />
            <div>
              <h2 className="font-heading font-bold text-xl text-amber-800 mb-1">
                🕐 Admin Approval Pending
              </h2>
              <p className="text-amber-700 text-sm leading-relaxed">
                आपकी profile admin review में है।
                <br />
                Approval के बाद dashboard access मिलेगा।
              </p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Loader2 size={14} className="animate-spin text-amber-500" />
              <span className="text-xs text-amber-600">
                Auto-checking every 3 seconds...
              </span>
            </div>
          </motion.div>
          {!profile && (
            <Link
              to="/provider/subscribe"
              data-ocid="dashboard.primary_button"
              className="inline-block bg-primary text-primary-foreground font-bold px-8 py-3 rounded-full hover:opacity-90"
            >
              Abhi Subscribe Karein
            </Link>
          )}
        </div>
      </div>
    );
  }

  const handleSaveProfile = async () => {
    if (!actor) return;
    setSavingProfile(true);
    try {
      await actor.updateProviderProfileFull(
        user.userId,
        shopName || profile?.shopName || "",
        description || profile?.description || "",
        address || profile?.address || "",
        category || profile?.category || "Plumber",
        upiId || profile?.upiId || "",
        qrCodeBlobId ?? profile?.qrCodeBlobId ?? null,
      );
      toast.success("Profile save ho gayi!");
      qc.invalidateQueries({ queryKey: ["providerProfile"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Save nahi ho saka");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleQrUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error(
        "Sirf JPG/PNG image hi upload kar sakte hain. PDF allowed nahi hai.",
      );
      return;
    }
    if (!actor) return;
    setUploadingQr(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const blob = ExternalBlob.fromBytes(bytes);
      const url = blob.getDirectURL();
      setQrCodeBlobId(url);
      toast.success("QR Code upload ho gaya! Save zaroor karein.");
    } catch (err: any) {
      toast.error(err?.message ?? "QR upload fail ho gaya");
    } finally {
      setUploadingQr(false);
    }
  };

  const handleAddService = async () => {
    if (!newServiceName || !newServicePrice || !actor) return;
    setAddingService(true);
    try {
      const rate: ServiceRate = {
        name: newServiceName,
        description: newServiceDesc,
        price: BigInt(Number.parseInt(newServicePrice) || 0),
      };
      await actor.addServiceRate(user.userId, rate);
      toast.success("Service add ho gayi!");
      setNewServiceName("");
      setNewServiceDesc("");
      setNewServicePrice("");
      qc.invalidateQueries({ queryKey: ["providerProfile"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Add nahi ho saca");
    } finally {
      setAddingService(false);
    }
  };

  const handleDeleteService = async (name: string) => {
    if (!actor) return;
    try {
      await actor.deleteServiceRate(user.userId, name);
      toast.success("Service delete ho gayi");
      qc.invalidateQueries({ queryKey: ["providerProfile"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Delete nahi ho saca");
    }
  };

  const handlePhotoUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error(
        "Sirf JPG/PNG image hi upload kar sakte hain. PDF allowed nahi hai.",
      );
      return;
    }
    if (!actor) return;
    setUploadingPhoto(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const blob = ExternalBlob.fromBytes(bytes);
      const blobId = blob.getDirectURL();
      await actor.addShopPhoto(user.userId, blobId);
      toast.success("Photo upload ho gayi!");
      qc.invalidateQueries({ queryKey: ["providerProfile"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Photo upload fail ho gayi");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async (blobId: string) => {
    if (!actor) return;
    try {
      await actor.removeShopPhoto(user.userId, blobId);
      toast.success("Photo remove ho gayi");
      qc.invalidateQueries({ queryKey: ["providerProfile"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Remove nahi ho saca");
    }
  };

  const handleUpdateOrderStatus = async (orderId: bigint, status: string) => {
    if (!actor) return;
    try {
      await actor.updateOrderStatus(orderId, status);
      toast.success(`Order ${status} ho gaya!`);
      qc.invalidateQueries({ queryKey: ["providerOrders"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Status update nahi ho saka");
    }
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: "profile", label: "Shop Profile" },
    { key: "photos", label: "Photos" },
    { key: "services", label: "Services" },
    { key: "orders", label: "Orders" },
    { key: "subscription", label: "Subscription" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <div className="bg-emerald-header text-white px-4 py-5">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-heading font-bold text-xl">
            Apna Shop Dekhein 🏦
          </h1>
          <p className="text-white/70 text-sm mt-0.5">
            {user.name} &bull; Provider Dashboard
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 w-full flex-1">
        <div className="flex gap-1 bg-muted rounded-xl p-1 mb-6 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              data-ocid="dashboard.tab"
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                tab === t.key
                  ? "bg-white text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {t.key === "orders" && orders && orders.length > 0 && (
                <span className="ml-1.5 bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5">
                  {orders.filter((o) => o.status === "pending").length || ""}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {tab === "profile" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-4">
              <div>
                <label
                  htmlFor="d-shopname"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  Shop Ka Naam
                </label>
                <input
                  id="d-shopname"
                  data-ocid="dashboard.input"
                  type="text"
                  value={shopName !== "" ? shopName : (profile?.shopName ?? "")}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="Apne shop ka naam"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label
                  htmlFor="d-desc"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  Description
                </label>
                <textarea
                  id="d-desc"
                  data-ocid="dashboard.textarea"
                  value={
                    description !== ""
                      ? description
                      : (profile?.description ?? "")
                  }
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Apni services ke baare mein likhein"
                  rows={3}
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
              <div>
                <label
                  htmlFor="d-address"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  Address
                </label>
                <input
                  id="d-address"
                  data-ocid="dashboard.input"
                  type="text"
                  value={address !== "" ? address : (profile?.address ?? "")}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Apna address"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label
                  htmlFor="d-category"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  Category
                </label>
                <select
                  id="d-category"
                  data-ocid="dashboard.select"
                  value={
                    category !== ""
                      ? category
                      : (profile?.category ?? "Plumber")
                  }
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring bg-white"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* UPI ID */}
              <div>
                <label
                  htmlFor="d-upi"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  UPI ID (Optional)
                </label>
                <input
                  id="d-upi"
                  data-ocid="dashboard.input"
                  type="text"
                  value={upiId !== "" ? upiId : (profile?.upiId ?? "")}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="example@upi"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* QR Code */}
              <div>
                <label
                  htmlFor="d-qr"
                  className="block text-sm font-medium text-foreground mb-1.5"
                >
                  QR Code Upload (Optional)
                </label>
                <div className="flex items-center gap-3">
                  {(qrCodeBlobId ?? profile?.qrCodeBlobId) && (
                    <img
                      src={qrCodeBlobId ?? profile?.qrCodeBlobId ?? ""}
                      alt="Payment QR Code"
                      className="w-16 h-16 rounded-xl border border-border object-contain bg-white"
                    />
                  )}
                  <button
                    type="button"
                    data-ocid="dashboard.upload_button"
                    onClick={() => qrInputRef.current?.click()}
                    disabled={uploadingQr}
                    className="flex items-center gap-2 bg-muted text-foreground text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-accent transition-colors disabled:opacity-60 border border-border"
                  >
                    {uploadingQr ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <QrCode size={14} />
                    )}
                    QR Upload Karein
                  </button>
                  <input
                    id="d-qr"
                    ref={qrInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleQrUpload(f);
                    }}
                  />
                </div>
              </div>

              <button
                type="button"
                data-ocid="dashboard.save_button"
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="bg-primary text-primary-foreground font-bold px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-60"
              >
                {savingProfile ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Save size={15} />
                )}
                Save Karein
              </button>
            </div>
          </motion.div>
        )}

        {/* Photos Tab */}
        {tab === "photos" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Shop Photos</h3>
              <button
                type="button"
                data-ocid="dashboard.upload_button"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {uploadingPhoto ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Camera size={14} />
                )}
                Photo Add Karein
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handlePhotoUpload(f);
                }}
              />
            </div>

            {profile?.photos && profile.photos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {profile.photos.map((blobId, i) => (
                  <div
                    // biome-ignore lint/suspicious/noArrayIndexKey: photo index stable
                    key={i}
                    data-ocid={`dashboard.item.${i + 1}`}
                    className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group"
                  >
                    <img
                      src={blobId}
                      alt={`Dukaan tasveer ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        data-ocid={`dashboard.delete_button.${i + 1}`}
                        onClick={() => handleDeletePhoto(blobId)}
                        className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                data-ocid="dashboard.empty_state"
                className="text-center py-16 text-muted-foreground"
              >
                <Camera size={40} className="mx-auto mb-3 opacity-30" />
                <p>Abhi koi photo nahi hai</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Services Tab */}
        {tab === "services" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="bg-white rounded-2xl border border-border shadow-card p-5 space-y-3">
              <h3 className="font-semibold text-foreground text-sm">
                Naya Service Add Karein
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  data-ocid="dashboard.input"
                  type="text"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  placeholder="Service ka naam"
                  className="border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  data-ocid="dashboard.input"
                  type="text"
                  value={newServiceDesc}
                  onChange={(e) => setNewServiceDesc(e.target.value)}
                  placeholder="Description (optional)"
                  className="border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  data-ocid="dashboard.input"
                  type="number"
                  value={newServicePrice}
                  onChange={(e) => setNewServicePrice(e.target.value)}
                  placeholder="Price (INR)"
                  className="border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <button
                type="button"
                data-ocid="dashboard.primary_button"
                onClick={handleAddService}
                disabled={!newServiceName || !newServicePrice || addingService}
                className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90 disabled:opacity-60"
              >
                {addingService ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Plus size={14} />
                )}
                Add Service
              </button>
            </div>

            {profile?.serviceRates && profile.serviceRates.length > 0 ? (
              <div className="space-y-2">
                {profile.serviceRates.map((rate, i) => (
                  <div
                    key={rate.name}
                    data-ocid={`dashboard.item.${i + 1}`}
                    className="bg-white rounded-xl border border-border shadow-xs p-4 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {rate.name}
                      </p>
                      {rate.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {rate.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="font-bold text-primary">
                        ₹{rate.price.toString()}
                      </span>
                      <button
                        type="button"
                        data-ocid={`dashboard.delete_button.${i + 1}`}
                        onClick={() => handleDeleteService(rate.name)}
                        className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                data-ocid="dashboard.empty_state"
                className="text-center py-12 text-muted-foreground"
              >
                <p>Abhi koi service nahi hai</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Orders Tab */}
        {tab === "orders" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-foreground">Mere Orders</h3>
              {orders && orders.length > 0 && (
                <Badge variant="secondary">{orders.length} orders</Badge>
              )}
            </div>

            {ordersLoading ? (
              <div
                data-ocid="dashboard.loading_state"
                className="flex items-center justify-center py-20"
              >
                <Loader2 size={28} className="animate-spin text-primary" />
              </div>
            ) : orders && orders.length > 0 ? (
              orders.map((order, i) => (
                <OrderCard
                  key={order.id.toString()}
                  order={order}
                  onUpdateStatus={handleUpdateOrderStatus}
                  index={i + 1}
                />
              ))
            ) : (
              <div
                data-ocid="dashboard.empty_state"
                className="text-center py-20 text-muted-foreground"
              >
                <Package size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">Abhi koi order nahi hai</p>
                <p className="text-xs mt-1">Orders yahan dikhenge</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Subscription Tab */}
        {tab === "subscription" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-4">
              <h3 className="font-heading font-bold text-lg text-foreground">
                Subscription Status
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-accent rounded-xl p-4">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="font-bold text-foreground capitalize mt-1">
                    {profile?.subscriptionStatus ?? "N/A"}
                  </p>
                </div>
                <div className="bg-accent rounded-xl p-4">
                  <p className="text-xs text-muted-foreground">Plan</p>
                  <p className="font-bold text-foreground capitalize mt-1">
                    {profile?.subscriptionPlan ?? "N/A"}
                  </p>
                </div>
                {profile?.subscriptionExpiry && (
                  <div className="bg-accent rounded-xl p-4 col-span-2">
                    <p className="text-xs text-muted-foreground">Expiry</p>
                    <p className="font-bold text-foreground mt-1">
                      {new Date(
                        Number(profile.subscriptionExpiry) / 1_000_000,
                      ).toLocaleDateString("hi-IN")}
                    </p>
                  </div>
                )}
              </div>
              {profile?.subscriptionStatus !== "active" && (
                <a
                  href="/provider/subscribe"
                  data-ocid="dashboard.primary_button"
                  className="inline-block bg-primary text-primary-foreground font-bold px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity text-sm"
                >
                  Abhi Subscribe Karein
                </a>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
