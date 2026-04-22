/**
 * StudyModePanel — Study Mode toggle, chat mute selection, notes management.
 * Saves notes via useCreateNote. Exports notes as .txt file.
 */

import { BookOpen, Download, FolderOpen, Plus, Star } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useChatContext } from "../../contexts/ChatContext";
import {
  useCreateNote,
  useMyConversations,
  useMyNotes,
} from "../../hooks/useChatQueries";
import type { Note } from "../../types/chatTypes";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";

const SUBJECTS = [
  "General",
  "Math",
  "Science",
  "Hindi",
  "English",
  "GK",
  "SSC",
  "UP Police",
  "Other",
];

// ---- Note Card ----

function NoteCard({ note }: { note: Note }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-3 space-y-1"
      data-ocid="study.note_item"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {note.title}
          </p>
          {note.subject && (
            <span className="inline-block bg-primary/10 text-primary text-[10px] font-medium px-2 py-0.5 rounded-full mt-0.5">
              {note.subject}
            </span>
          )}
        </div>
        {note.isStarred && (
          <Star
            size={14}
            className="text-yellow-500 fill-yellow-500 shrink-0 mt-0.5"
          />
        )}
      </div>
      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
        {note.content}
      </p>
      <p className="text-[10px] text-muted-foreground">
        {new Date(note.createdAt).toLocaleDateString("hi-IN")}
      </p>
    </motion.div>
  );
}

// ---- Add Note Form ----

interface AddNoteFormProps {
  onClose: () => void;
}
function AddNoteForm({ onClose }: AddNoteFormProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [subject, setSubject] = useState("General");
  const createNote = useCreateNote();

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Title और content दोनों भरें");
      return;
    }
    try {
      await createNote.mutateAsync({
        title: title.trim(),
        content: content.trim(),
        subject,
        isStarred: false,
      });
      toast.success("Note save हो गया!");
      onClose();
    } catch {
      toast.error("Note save नहीं हुआ");
    }
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="overflow-hidden"
    >
      <div
        className="bg-card border border-border rounded-2xl p-4 space-y-3"
        data-ocid="study.add_note_form"
      >
        <div className="space-y-1">
          <Label className="text-xs">Title</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note का title लिखें"
            data-ocid="study.note_title_input"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Subject</Label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            data-ocid="study.note_subject_select"
          >
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Content</Label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Notes यहाँ लिखें..."
            rows={4}
            className="resize-none text-sm"
            data-ocid="study.note_content_input"
          />
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={createNote.isPending}
            className="flex-1"
            data-ocid="study.save_note_button"
          >
            {createNote.isPending ? "Save हो रहा है..." : "Save करें"}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            data-ocid="study.cancel_note_button"
          >
            Cancel
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ---- Main Panel ----

export default function StudyModePanel() {
  const { studyMode, setStudyMode, studyModeChats, setStudyModeChats } =
    useChatContext();

  const { data: notes = [], isLoading: notesLoading } = useMyNotes();
  const { data: conversations = [] } = useMyConversations();

  const [activeSubject, setActiveSubject] = useState<string>("All");
  const [showAddNote, setShowAddNote] = useState(false);
  // localNotes reserved for optimistic future use — not used in render yet
  const [_localNotes] = useState<Note[]>([]);

  // Merge backend notes with local ones
  const allNotes = notes;
  const subjects = [
    "All",
    ...Array.from(new Set(allNotes.map((n) => n.subject ?? "General"))),
  ];
  const filteredNotes =
    activeSubject === "All"
      ? allNotes
      : allNotes.filter((n) => (n.subject ?? "General") === activeSubject);

  const toggleChat = (id: string) => {
    if (studyModeChats.includes(id)) {
      setStudyModeChats(studyModeChats.filter((c) => c !== id));
    } else {
      setStudyModeChats([...studyModeChats, id]);
    }
  };

  const exportNotes = () => {
    if (allNotes.length === 0) {
      toast.info("Export करने के लिए कोई note नहीं है");
      return;
    }
    const dateStr = new Date().toISOString().split("T")[0];
    const text = allNotes
      .map((n) => {
        const created = new Date(n.createdAt).toLocaleDateString("hi-IN");
        return `## ${n.title}\nSubject: ${n.subject ?? "General"}\nDate: ${created}\n\n${n.content}\n\n---\n`;
      })
      .join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `likeup-notes-${dateStr}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Notes export हो गए!");
  };

  return (
    <div className="space-y-4" data-ocid="study.panel">
      {/* Study Mode Toggle */}
      <div className="bg-card rounded-2xl border border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <BookOpen size={18} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">
                Study Mode
              </p>
              <p className="text-xs text-muted-foreground">
                {studyMode
                  ? "चालू है — सिर्फ selected chats से notification"
                  : "बंद है"}
              </p>
            </div>
          </div>
          <Switch
            checked={studyMode}
            onCheckedChange={setStudyMode}
            data-ocid="study.mode_toggle"
          />
        </div>
        {studyMode && (
          <div className="mt-3 bg-primary/10 rounded-xl px-3 py-2 text-xs text-primary">
            ✓ Study Mode ON — बाकी सभी chats muted हैं। नीचे select करें कौन से chats
            unmuted रहेंगे।
          </div>
        )}
      </div>

      {/* Chat selection (only when study mode on) */}
      {studyMode && (
        <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Unmuted Chats</p>
          {conversations.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              कोई conversation नहीं है
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {conversations.map((conv) => {
                const name =
                  conv.name ??
                  conv.participants.find((p) => p.userId !== "me")?.name ??
                  "Unknown";
                const checked = studyModeChats.includes(conv.id);
                return (
                  <label
                    key={conv.id}
                    className="flex items-center gap-3 cursor-pointer py-1"
                    data-ocid="study.chat_select_item"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleChat(conv.id)}
                      className="rounded border-input accent-primary w-4 h-4"
                    />
                    <span className="text-sm text-foreground truncate">
                      {name}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Notes section */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <FolderOpen size={16} className="text-primary" />
            <p className="text-sm font-semibold text-foreground">Notes</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportNotes}
              className="text-muted-foreground hover:text-foreground"
              title="Export as .txt"
              data-ocid="study.export_button"
            >
              <Download size={16} />
            </button>
            <button
              type="button"
              onClick={() => setShowAddNote((v) => !v)}
              className="text-primary"
              data-ocid="study.add_note_button"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* Add note form */}
          <AnimatePresence>
            {showAddNote && (
              <AddNoteForm onClose={() => setShowAddNote(false)} />
            )}
          </AnimatePresence>

          {/* Subject filter */}
          {allNotes.length > 0 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {subjects.map((sub) => (
                <button
                  type="button"
                  key={sub}
                  onClick={() => setActiveSubject(sub)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    activeSubject === sub
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                  data-ocid="study.subject_tab"
                >
                  {sub}
                </button>
              ))}
            </div>
          )}

          {/* Notes list */}
          {notesLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-xl bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : filteredNotes.length === 0 ? (
            <div
              className="text-center py-6"
              data-ocid="study.notes_empty_state"
            >
              <BookOpen
                size={24}
                className="mx-auto text-muted-foreground mb-2"
              />
              <p className="text-xs text-muted-foreground">
                {allNotes.length === 0
                  ? "कोई note नहीं। '+' tap करके पहला note add करें।"
                  : `${activeSubject} में कोई note नहीं`}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNotes.map((note) => (
                <NoteCard key={note.id} note={note} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
