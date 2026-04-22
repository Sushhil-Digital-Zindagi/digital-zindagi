import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Search, Users, X } from "lucide-react";
/**
 * GroupCreateModal — Create a new group chat with member search.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useActor } from "../../hooks/useActor";
import { useCreateGroup } from "../../hooks/useChatQueries";
import type { Conversation } from "../../types/chatTypes";

interface SearchUser {
  userId: string;
  name: string;
  username?: string;
  photoUrl?: string;
}

interface Props {
  onClose: () => void;
  onCreated: (conv: Conversation) => void;
}

const AVATAR_COLORS = [
  "bg-emerald-700",
  "bg-blue-600",
  "bg-purple-600",
  "bg-orange-500",
  "bg-pink-600",
  "bg-teal-600",
  "bg-rose-600",
  "bg-indigo-600",
];
function avatarBg(name: string) {
  let s = 0;
  for (let i = 0; i < name.length; i++) s += name.charCodeAt(i);
  return AVATAR_COLORS[s % AVATAR_COLORS.length];
}

export default function GroupCreateModal({ onClose, onCreated }: Props) {
  const [groupName, setGroupName] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUser[]>([]);
  const [selected, setSelected] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const { actor } = useActor();
  const createGroup = useCreateGroup();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(
    async (q: string) => {
      if (!q.trim() || !actor) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const res = await (
          actor as unknown as {
            searchChatUsers: (q: string) => Promise<SearchUser[]>;
          }
        ).searchChatUsers(q);
        setResults(
          (res || []).filter(
            (u) => !selected.some((s) => s.userId === u.userId),
          ),
        );
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    },
    [actor, selected],
  );

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(query), 350);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, doSearch]);

  function addMember(u: SearchUser) {
    if (selected.some((s) => s.userId === u.userId)) return;
    setSelected((prev) => [...prev, u]);
    setResults((prev) => prev.filter((r) => r.userId !== u.userId));
    setQuery("");
  }

  function removeMember(userId: string) {
    setSelected((prev) => prev.filter((s) => s.userId !== userId));
  }

  async function handleCreate() {
    if (!groupName.trim()) {
      toast.error("Group का नाम दें");
      return;
    }
    if (selected.length === 0) {
      toast.error("कम से कम एक member जोड़ें");
      return;
    }
    try {
      const conv = await createGroup.mutateAsync({
        name: groupName.trim(),
        photoUrl: photoUrl.trim() || undefined,
        memberIds: selected.map((s) => s.userId),
      });
      toast.success("Group बन गया! 🎉");
      onCreated(conv);
    } catch {
      toast.error("Group नहीं बना, दोबारा try करें");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      data-ocid="chat_group.dialog"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-primary" />
            <h2 className="font-bold text-foreground">नया Group बनाएं</h2>
          </div>
          <button
            type="button"
            data-ocid="chat_group.close_button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Group name */}
          <div className="space-y-1.5">
            <label
              htmlFor="group-name"
              className="block text-sm font-medium text-foreground"
            >
              Group का नाम *
            </label>
            <Input
              id="group-name"
              data-ocid="chat_group.input"
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
              placeholder="जैसे: Family, Office Team..."
              maxLength={50}
            />
          </div>

          {/* Photo URL (optional) */}
          <div className="space-y-1.5">
            <label
              htmlFor="group-photo"
              className="block text-sm font-medium text-muted-foreground text-xs"
            >
              Group Photo URL (optional)
            </label>
            <Input
              id="group-photo"
              type="url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://..."
              data-ocid="chat_group.photo_input"
            />
          </div>

          {/* Selected members chips */}
          {selected.length > 0 && (
            <div
              className="flex flex-wrap gap-2"
              data-ocid="chat_group.selected_members"
            >
              {selected.map((u) => (
                <span
                  key={u.userId}
                  className="flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 rounded-full text-xs font-medium"
                >
                  {u.name}
                  <button
                    type="button"
                    onClick={() => removeMember(u.userId)}
                    aria-label={`Remove ${u.name}`}
                    data-ocid="chat_group.remove_member_button"
                    className="hover:opacity-70 leading-none"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Member search */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              Members Add करें
            </p>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                placeholder="नाम से खोजें..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9"
                data-ocid="chat_group.member_search_input"
              />
            </div>

            {(searching ||
              (query && results.length === 0) ||
              results.length > 0) && (
              <div className="border border-border rounded-xl overflow-hidden max-h-44 overflow-y-auto">
                {searching && (
                  <div
                    className="px-4 py-3"
                    data-ocid="chat_group.search_loading_state"
                  >
                    <Skeleton className="h-4 w-28" />
                  </div>
                )}
                {!searching && query && results.length === 0 && (
                  <p
                    className="text-center text-xs text-muted-foreground py-4"
                    data-ocid="chat_group.search_empty_state"
                  >
                    कोई user नहीं मिला
                  </p>
                )}
                {results.map((u) => (
                  <button
                    key={u.userId}
                    type="button"
                    onClick={() => addMember(u)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors text-left"
                    data-ocid="chat_group.member_result_item"
                  >
                    {u.photoUrl ? (
                      <img
                        src={u.photoUrl}
                        alt={u.name}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div
                        className={`w-8 h-8 rounded-full ${avatarBg(u.name)} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
                      >
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">
                        {u.name}
                      </p>
                      {u.username && (
                        <p className="text-xs text-muted-foreground">
                          @{u.username}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              data-ocid="chat_group.cancel_button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <Button
              type="button"
              data-ocid="chat_group.confirm_button"
              onClick={handleCreate}
              disabled={
                !groupName.trim() ||
                selected.length === 0 ||
                createGroup.isPending
              }
              className="flex-1"
            >
              {createGroup.isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-1" /> बन रहा
                  है...
                </>
              ) : (
                `Group बनाएं${selected.length > 0 ? ` (${selected.length})` : ""}`
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
