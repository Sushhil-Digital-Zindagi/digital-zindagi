/**
 * ShortcutKeyboard — @shortcut popup triggered when user types @ in chat.
 * Shows global shortcuts (greet, business, formula) + personal shortcuts.
 * Admin can add shortcuts; users can save their own.
 */

import { BookOpen, Briefcase, MessageSquare, Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { useChatShortcuts } from "../../hooks/useChatQueries";
import type { ChatShortcut } from "../../types/chatTypes";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface ShortcutKeyboardProps {
  query?: string; // text after @ to filter
  onSelect: (content: string) => void;
  onClose: () => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  greet: <MessageSquare size={14} />,
  business: <Briefcase size={14} />,
  formula: <BookOpen size={14} />,
  custom: <Plus size={14} />,
};

const CATEGORY_LABELS: Record<string, string> = {
  greet: "Greeting",
  business: "Business",
  formula: "Formula",
  custom: "Personal",
};

const DEFAULT_SHORTCUTS: ChatShortcut[] = [
  {
    id: "g1",
    trigger: "@greet",
    category: "greet",
    title: "नमस्ते",
    content: "नमस्ते! कैसे हैं आप? 🙏",
    isGlobal: true,
    createdBy: "admin",
    createdAt: 0,
  },
  {
    id: "g2",
    trigger: "@greet",
    category: "greet",
    title: "Good Morning",
    content: "Good Morning! आपका दिन शुभ हो ☀️",
    isGlobal: true,
    createdBy: "admin",
    createdAt: 0,
  },
  {
    id: "g3",
    trigger: "@greet",
    category: "greet",
    title: "Good Night",
    content: "Good Night! शुभ रात्रि 🌙",
    isGlobal: true,
    createdBy: "admin",
    createdAt: 0,
  },
  {
    id: "b1",
    trigger: "@business",
    category: "business",
    title: "Price Confirm",
    content: "जी, price confirm हो गई है। Payment details भेजें।",
    isGlobal: true,
    createdBy: "admin",
    createdAt: 0,
  },
  {
    id: "b2",
    trigger: "@business",
    category: "business",
    title: "Order Received",
    content: "आपका order receive हो गया है। जल्द ही process होगा। ✅",
    isGlobal: true,
    createdBy: "admin",
    createdAt: 0,
  },
  {
    id: "b3",
    trigger: "@business",
    category: "business",
    title: "Out of Stock",
    content: "Sorry, यह item अभी available नहीं है। बाद में try करें।",
    isGlobal: true,
    createdBy: "admin",
    createdAt: 0,
  },
  {
    id: "f1",
    trigger: "@formula",
    category: "formula",
    title: "Percentage",
    content: "(Part / Whole) × 100 = Percentage",
    isGlobal: true,
    createdBy: "admin",
    createdAt: 0,
  },
  {
    id: "f2",
    trigger: "@formula",
    category: "formula",
    title: "Simple Interest",
    content: "SI = (P × R × T) / 100",
    isGlobal: true,
    createdBy: "admin",
    createdAt: 0,
  },
  {
    id: "f3",
    trigger: "@formula",
    category: "formula",
    title: "Speed Formula",
    content: "Speed = Distance / Time",
    isGlobal: true,
    createdBy: "admin",
    createdAt: 0,
  },
];

export default function ShortcutKeyboard({
  query = "",
  onSelect,
  onClose: _onClose,
}: ShortcutKeyboardProps) {
  const { data: backendShortcuts = [] } = useChatShortcuts();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  // Merge defaults with backend shortcuts
  const allShortcuts = useMemo(() => {
    const merged = [...DEFAULT_SHORTCUTS];
    for (const bs of backendShortcuts) {
      if (!merged.find((s) => s.id === bs.id)) merged.push(bs);
    }
    return merged;
  }, [backendShortcuts]);

  // Load personal shortcuts from localStorage
  const [personalShortcuts, setPersonalShortcuts] = useState<ChatShortcut[]>(
    () => {
      try {
        const raw = localStorage.getItem("dz_chat_personal_shortcuts");
        return raw ? (JSON.parse(raw) as ChatShortcut[]) : [];
      } catch {
        return [];
      }
    },
  );

  const filtered = useMemo(() => {
    const combined = [...allShortcuts, ...personalShortcuts];
    return combined.filter((s) => {
      const catMatch =
        activeCategory === "all" || s.category === activeCategory;
      const qMatch =
        !query ||
        s.title.toLowerCase().includes(query.toLowerCase()) ||
        s.content.toLowerCase().includes(query.toLowerCase());
      return catMatch && qMatch;
    });
  }, [allShortcuts, personalShortcuts, activeCategory, query]);

  const categories = ["all", "greet", "business", "formula", "custom"];

  const addPersonal = () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    const s: ChatShortcut = {
      id: `personal_${Date.now()}`,
      trigger: "@custom",
      category: "custom",
      title: newTitle.trim(),
      content: newContent.trim(),
      isGlobal: false,
      createdBy: "me",
      createdAt: Date.now(),
    };
    const updated = [...personalShortcuts, s];
    setPersonalShortcuts(updated);
    localStorage.setItem("dz_chat_personal_shortcuts", JSON.stringify(updated));
    setNewTitle("");
    setNewContent("");
    setShowAdd(false);
  };

  const deletePersonal = (id: string) => {
    const updated = personalShortcuts.filter((s) => s.id !== id);
    setPersonalShortcuts(updated);
    localStorage.setItem("dz_chat_personal_shortcuts", JSON.stringify(updated));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="absolute bottom-full mb-1 left-0 right-0 bg-card border border-border rounded-2xl shadow-xl overflow-hidden max-h-72 z-40 flex flex-col"
      data-ocid="shortcut_keyboard.popup"
    >
      {/* Category tabs */}
      <div className="flex gap-1 p-2 border-b border-border overflow-x-auto scrollbar-hide">
        {categories.map((cat) => (
          <button
            type="button"
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
            data-ocid={`shortcut_keyboard.tab.${cat}`}
          >
            {cat !== "all" && CATEGORY_ICONS[cat]}
            {cat === "all" ? "सभी" : (CATEGORY_LABELS[cat] ?? cat)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 ml-auto whitespace-nowrap"
          data-ocid="shortcut_keyboard.add_button"
        >
          <Plus size={12} /> Add
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden border-b border-border"
          >
            <div className="p-3 space-y-2">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Title (e.g. My Greeting)"
                className="h-7 text-xs"
                data-ocid="shortcut_keyboard.new_title_input"
              />
              <Input
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Message content..."
                className="h-7 text-xs"
                data-ocid="shortcut_keyboard.new_content_input"
              />
              <Button
                size="sm"
                onClick={addPersonal}
                className="h-6 text-xs px-3"
                data-ocid="shortcut_keyboard.save_button"
              >
                Save
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shortcuts list */}
      <div className="overflow-y-auto flex-1">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            कोई shortcut नहीं मिला
          </p>
        ) : (
          filtered.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer group"
              data-ocid="shortcut_keyboard.item"
            >
              <button
                type="button"
                className="flex-1 text-left min-w-0"
                onClick={() => onSelect(s.content)}
              >
                <p className="text-xs font-semibold text-foreground truncate">
                  {s.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {s.content}
                </p>
              </button>
              {!s.isGlobal && (
                <button
                  type="button"
                  onClick={() => deletePersonal(s.id)}
                  className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  data-ocid="shortcut_keyboard.delete_button"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
