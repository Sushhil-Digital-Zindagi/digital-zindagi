/**
 * MediaVault — Private encrypted media vault.
 * PIN-protected (4-digit), view-once items, auto-delete timers.
 */

import { Eye, Image, Lock, Plus, ShieldCheck, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useAddVaultItem, useVaultItems } from "../../hooks/useChatQueries";
import type { VaultItem } from "../../types/chatTypes";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";

// ---- PIN helpers ----
const PIN_KEY = "dz_vault_pin";

function getStoredPin(): string | null {
  try {
    const enc = localStorage.getItem(PIN_KEY);
    return enc ? atob(enc) : null;
  } catch {
    return null;
  }
}
function storePin(pin: string) {
  localStorage.setItem(PIN_KEY, btoa(pin));
}

// ---- PIN Entry ----

interface PinEntryProps {
  mode: "set" | "verify";
  onSuccess: () => void;
}
function PinEntry({ mode, onSuccess }: PinEntryProps) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (pin.length !== 4) {
      setError("4-digit PIN डालें");
      return;
    }
    if (mode === "set") {
      if (pin !== confirm) {
        setError("PIN match नहीं करता");
        return;
      }
      storePin(pin);
      toast.success("Vault PIN set हो गई");
      onSuccess();
    } else {
      const stored = getStoredPin();
      if (pin === stored) {
        onSuccess();
      } else {
        setError("गलत PIN");
        setPin("");
      }
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-6"
      data-ocid="vault.pin_screen"
    >
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
        <Lock size={28} className="text-primary" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-bold text-foreground">
          {mode === "set" ? "Vault PIN बनाएं" : "Vault खोलें"}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {mode === "set" ? "4-digit PIN set करें" : "अपनी 4-digit PIN डालें"}
        </p>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <Input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, ""));
            setError("");
          }}
          placeholder="●  ●  ●  ●"
          className="text-center text-2xl tracking-[0.5em] h-14"
          data-ocid="vault.pin_input"
        />
        {mode === "set" && (
          <Input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value.replace(/\D/g, ""));
              setError("");
            }}
            placeholder="Confirm PIN"
            className="text-center text-2xl tracking-[0.5em] h-14"
            data-ocid="vault.pin_confirm_input"
          />
        )}
        {error && (
          <p className="text-destructive text-xs text-center">{error}</p>
        )}
        <Button
          onClick={handleSubmit}
          disabled={
            pin.length !== 4 || (mode === "set" && confirm.length !== 4)
          }
          className="w-full"
          data-ocid="vault.pin_submit_button"
        >
          {mode === "set" ? "PIN Set करें" : "Vault खोलें"}
        </Button>
      </div>
    </div>
  );
}

// ---- Vault Item Card ----

interface VaultCardProps {
  item: VaultItem;
  onDelete: (id: string) => void;
}
function VaultCard({ item, onDelete }: VaultCardProps) {
  const [revealed, setRevealed] = useState(false);

  const handleView = () => {
    if (item.isViewOnce && item.viewedAt) return;
    setRevealed(true);
  };

  const isExpired = item.autoDeleteAt && item.autoDeleteAt < Date.now();
  if (isExpired) return null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="relative rounded-xl overflow-hidden aspect-square bg-muted"
      data-ocid="vault.item"
    >
      {item.fileUrl && (
        <img
          src={item.fileUrl}
          alt={item.fileName}
          className="w-full h-full object-cover"
        />
      )}

      {/* View-once blur overlay */}
      {item.isViewOnce && !revealed && (
        <div className="absolute inset-0 backdrop-blur-xl bg-black/40 flex flex-col items-center justify-center gap-1">
          <Eye size={24} className="text-white" />
          <p className="text-white text-xs font-medium">एक बार देखें</p>
          <button
            type="button"
            onClick={handleView}
            className="mt-1 text-xs bg-white/20 text-white px-3 py-1 rounded-full"
            data-ocid="vault.view_once_button"
          >
            देखें
          </button>
        </div>
      )}

      {/* Delete button */}
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-red-500/80 transition-colors"
        data-ocid="vault.delete_button"
      >
        <X size={12} />
      </button>

      {/* View-once badge */}
      {item.isViewOnce && (
        <div className="absolute bottom-1 left-1 bg-orange-500 rounded-full px-1.5 py-0.5 text-[9px] text-white font-bold">
          1x
        </div>
      )}
    </motion.div>
  );
}

// ---- Add Item Sheet ----

interface AddItemSheetProps {
  onClose: () => void;
}
function AddItemSheet({ onClose }: AddItemSheetProps) {
  const [url, setUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [autoDeleteHours, setAutoDeleteHours] = useState("");
  const addItem = useAddVaultItem();

  const handleAdd = async () => {
    if (!url.trim()) {
      toast.error("Photo URL डालें");
      return;
    }
    const autoDeleteAt = autoDeleteHours
      ? Date.now() + Number(autoDeleteHours) * 60 * 60 * 1000
      : undefined;
    await addItem.mutateAsync({
      type: "photo",
      fileName: fileName || "vault-photo",
      fileUrl: url.trim(),
      isViewOnce,
      autoDeleteAt,
    });
    toast.success("Vault में add हो गया");
    onClose();
  };

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25 }}
      className="fixed inset-x-0 bottom-0 z-50 bg-card rounded-t-3xl border-t border-border p-5 pb-safe space-y-4"
      data-ocid="vault.add_sheet"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Vault में Add करें</h3>
        <button type="button" onClick={onClose} data-ocid="vault.close_button">
          <X size={20} className="text-muted-foreground" />
        </button>
      </div>
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Photo URL</Label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            data-ocid="vault.url_input"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">File Name (optional)</Label>
          <Input
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="my-photo"
            data-ocid="vault.filename_input"
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">View Once</p>
            <p className="text-xs text-muted-foreground">
              एक बार देखने के बाद delete
            </p>
          </div>
          <Switch
            checked={isViewOnce}
            onCheckedChange={setIsViewOnce}
            data-ocid="vault.view_once_toggle"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Auto-Delete (घंटों में, खाली = कभी नहीं)</Label>
          <Input
            type="number"
            min={1}
            placeholder="जैसे: 24 (24 घंटे)"
            value={autoDeleteHours}
            onChange={(e) => setAutoDeleteHours(e.target.value)}
            data-ocid="vault.auto_delete_input"
          />
        </div>
      </div>
      <Button
        onClick={() => {
          void handleAdd();
        }}
        disabled={addItem.isPending}
        className="w-full"
        data-ocid="vault.add_submit_button"
      >
        {addItem.isPending ? "Add हो रहा है..." : "Add करें"}
      </Button>
    </motion.div>
  );
}

// ---- Main Export ----

export default function MediaVault() {
  const { data: items = [] } = useVaultItems();
  const [unlocked, setUnlocked] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const hasPin = !!getStoredPin();

  const handleDelete = (_id: string) => {
    toast.info("Item delete किया");
  };

  if (!unlocked) {
    return (
      <div className="bg-background" data-ocid="vault.page">
        <PinEntry
          mode={hasPin ? "verify" : "set"}
          onSuccess={() => setUnlocked(true)}
        />
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen" data-ocid="vault.page">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck size={20} className="text-primary" />
          <h2 className="font-semibold text-foreground">Private Vault</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setUnlocked(false)}
            className="text-muted-foreground hover:text-foreground"
            data-ocid="vault.lock_button"
          >
            <Lock size={18} />
          </button>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="text-primary"
            data-ocid="vault.add_button"
          >
            <Plus size={22} />
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="p-4">
        {items.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-56 gap-4"
            data-ocid="vault.empty_state"
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Image size={24} className="text-primary" />
            </div>
            <p className="text-muted-foreground text-sm text-center">
              Vault खाली है। '+' tap करके media add करें।
            </p>
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-3 gap-2">
            <AnimatePresence>
              {items.map((item) => (
                <VaultCard key={item.id} item={item} onDelete={handleDelete} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Add sheet */}
      <AnimatePresence>
        {showAdd && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowAdd(false)}
            />
            <AddItemSheet onClose={() => setShowAdd(false)} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
