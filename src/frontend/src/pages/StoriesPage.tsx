/**
 * StoriesPage — Full WhatsApp/Instagram-style stories implementation.
 * Story rings row, composer, full-screen viewer with auto-advance.
 */

import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Eye,
  Plus,
  Send,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { ChatProvider } from "../contexts/ChatContext";
import { useActiveStories, usePostStory } from "../hooks/useChatQueries";
import type { PostStoryPayload, Story, StoryGroup } from "../types/chatTypes";
import { StoryType } from "../types/chatTypes";

// ---------- Helpers ----------

function groupStories(stories: Story[], currentUserId: string): StoryGroup[] {
  const map = new Map<string, StoryGroup>();
  const now = Date.now();
  for (const s of stories) {
    if (s.expiresAt < now) continue;
    if (!map.has(s.authorId)) {
      map.set(s.authorId, {
        userId: s.authorId,
        userName: s.authorName,
        userPhotoUrl: s.authorPhotoUrl,
        stories: [],
        hasUnviewed: false,
      });
    }
    const g = map.get(s.authorId)!;
    g.stories.push(s);
    if (!s.viewers.includes(currentUserId)) g.hasUnviewed = true;
  }
  return Array.from(map.values()).sort(
    (a, b) => (b.hasUnviewed ? 1 : 0) - (a.hasUnviewed ? 1 : 0),
  );
}

// ---------- Story Ring ----------

interface StoryRingProps {
  group: StoryGroup;
  isMe?: boolean;
  onClick: () => void;
}
function StoryRing({ group, isMe, onClick }: StoryRingProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1 min-w-[64px]"
      data-ocid="stories.item"
    >
      <div
        className={`p-[2px] rounded-full ${
          group.hasUnviewed
            ? "bg-gradient-to-tr from-primary to-emerald-400"
            : "bg-muted"
        }`}
      >
        <div className="bg-background rounded-full p-[2px]">
          {group.userPhotoUrl ? (
            <img
              src={group.userPhotoUrl}
              alt={group.userName}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
              {group.userName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
      <span className="text-[10px] text-foreground truncate max-w-[60px]">
        {isMe ? "आपकी" : group.userName.split(" ")[0]}
      </span>
    </button>
  );
}

// ---------- Story Composer ----------

interface StoryComposerProps {
  onClose: () => void;
}
function StoryComposer({ onClose }: StoryComposerProps) {
  const [textContent, setTextContent] = useState("");
  const [bgColor, setBgColor] = useState("#064420");
  const [textColor] = useState("#ffffff");
  const postStory = usePostStory();

  const bgOptions = [
    "#064420",
    "#1a1a2e",
    "#16213e",
    "#0f3460",
    "#533483",
    "#e94560",
  ];

  const handlePost = async () => {
    if (!textContent.trim()) return;
    const payload: PostStoryPayload = {
      type: StoryType.text,
      content: textContent.trim(),
      backgroundColor: bgColor,
      textColor,
    };
    await postStory.mutateAsync(payload);
    onClose();
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.ctrlKey) {
      void handlePost();
    }
  };

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: bgColor }}
      data-ocid="stories.composer"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-safe">
        <button
          type="button"
          onClick={onClose}
          className="text-white/80 hover:text-white"
        >
          <X size={24} />
        </button>
        <span className="text-white font-semibold">नई Story</span>
        <button
          type="button"
          onClick={() => {
            void handlePost();
          }}
          disabled={!textContent.trim() || postStory.isPending}
          className="text-white/80 hover:text-white disabled:opacity-40 font-medium"
          data-ocid="stories.post_button"
        >
          {postStory.isPending ? "पोस्ट हो रही है..." : "Share करें"}
        </button>
      </div>

      {/* Text area */}
      <div className="flex-1 flex items-center justify-center p-6">
        <textarea
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
          onKeyDown={handleKey}
          maxLength={300}
          placeholder="कुछ लिखें..."
          className="w-full bg-transparent text-center text-2xl font-bold outline-none resize-none placeholder-white/40"
          style={{ color: textColor, maxHeight: "60vh" }}
          rows={4}
          data-ocid="stories.text_input"
        />
      </div>

      {/* Background color picker */}
      <div className="p-4 pb-safe">
        <p className="text-white/60 text-xs mb-2 text-center">Background चुनें</p>
        <div className="flex gap-3 justify-center">
          {bgOptions.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setBgColor(c)}
              className={`w-8 h-8 rounded-full border-2 ${
                bgColor === c ? "border-white scale-110" : "border-transparent"
              } transition-transform`}
              style={{ background: c }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ---------- Story Viewer ----------

interface StoryViewerProps {
  groups: StoryGroup[];
  startGroupIndex: number;
  currentUserId: string;
  onClose: () => void;
  onReply: (story: Story, text: string) => void;
}

const STORY_DURATION = 5000;

function StoryViewer({
  groups,
  startGroupIndex,
  currentUserId,
  onClose,
  onReply,
}: StoryViewerProps) {
  const [groupIdx, setGroupIdx] = useState(startGroupIndex);
  const [storyIdx, setStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState("");
  const [showViewers, setShowViewers] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const group = groups[groupIdx];
  const story = group?.stories[storyIdx];

  const goNext = useCallback(() => {
    if (!group) return;
    if (storyIdx < group.stories.length - 1) {
      setStoryIdx((i) => i + 1);
      setProgress(0);
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx((g) => g + 1);
      setStoryIdx(0);
      setProgress(0);
    } else {
      onClose();
    }
  }, [group, storyIdx, groupIdx, groups.length, onClose]);

  const goPrev = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx((i) => i - 1);
      setProgress(0);
    } else if (groupIdx > 0) {
      setGroupIdx((g) => g - 1);
      setStoryIdx(0);
      setProgress(0);
    }
  }, [storyIdx, groupIdx]);

  useEffect(() => {
    setProgress(0);
    if (timerRef.current) clearInterval(timerRef.current);
    const step = 100 / (STORY_DURATION / 100);
    timerRef.current = setInterval(() => {
      setProgress((p) => {
        if (p + step >= 100) {
          clearInterval(timerRef.current!);
          goNext();
          return 100;
        }
        return p + step;
      });
    }, 100);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [goNext]);

  if (!story) return null;

  const handleReply = () => {
    if (!replyText.trim()) return;
    onReply(story, replyText.trim());
    setReplyText("");
  };

  const isMyStory = story.authorId === currentUserId;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        background: story.backgroundColor ?? "#064420",
        color: story.textColor ?? "#ffffff",
      }}
      data-ocid="stories.viewer"
    >
      {/* Progress bars */}
      <div className="flex gap-1 p-3 pt-safe">
        {group.stories.map((s, i) => (
          <div
            key={s.id}
            className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-white rounded-full transition-none"
              style={{
                width:
                  i < storyIdx
                    ? "100%"
                    : i === storyIdx
                      ? `${progress}%`
                      : "0%",
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2">
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold overflow-hidden">
          {story.authorPhotoUrl ? (
            <img
              src={story.authorPhotoUrl}
              alt={story.authorName}
              className="w-full h-full object-cover"
            />
          ) : (
            story.authorName.charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">
            {story.authorName}
          </p>
          <p className="text-white/60 text-xs">
            {new Date(story.createdAt).toLocaleTimeString("hi-IN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        {isMyStory && (
          <button
            type="button"
            onClick={() => setShowViewers((v) => !v)}
            className="text-white/80 hover:text-white"
            data-ocid="stories.viewers_button"
          >
            <Eye size={20} />
            <span className="text-xs ml-1">{story.viewers.length}</span>
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="text-white/80 hover:text-white ml-2"
          data-ocid="stories.close_button"
        >
          <X size={22} />
        </button>
      </div>

      {/* Story content */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {/* Tap zones */}
        <button
          type="button"
          className="absolute left-0 top-0 w-1/3 h-full"
          onClick={goPrev}
          aria-label="Previous"
        />
        <button
          type="button"
          className="absolute right-0 top-0 w-1/3 h-full"
          onClick={goNext}
          aria-label="Next"
        />

        {story.mediaUrl ? (
          <img
            src={story.mediaUrl}
            alt="story"
            className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl"
          />
        ) : (
          <p
            className="text-2xl md:text-4xl font-bold text-center leading-snug"
            style={{ color: story.textColor ?? "#ffffff" }}
          >
            {story.content}
          </p>
        )}
      </div>

      {/* Viewers list */}
      {showViewers && isMyStory && (
        <div className="bg-black/60 backdrop-blur-sm px-4 py-3 max-h-40 overflow-y-auto">
          <p className="text-white/80 text-xs font-semibold mb-2">
            👁 Viewers ({story.viewers.length})
          </p>
          {story.viewerNames.length === 0 ? (
            <p className="text-white/50 text-xs">अभी कोई viewer नहीं</p>
          ) : (
            story.viewerNames.map((n) => (
              <p key={n} className="text-white text-sm py-0.5">
                {n}
              </p>
            ))
          )}
        </div>
      )}

      {/* Reply bar */}
      {!isMyStory && (
        <div className="px-4 pb-4 pb-safe flex gap-2">
          <Input
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleReply()}
            placeholder={`${story.authorName} को reply करें...`}
            className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/40"
            data-ocid="stories.reply_input"
          />
          <Button
            size="icon"
            onClick={handleReply}
            disabled={!replyText.trim()}
            className="bg-white/20 hover:bg-white/30 text-white"
            data-ocid="stories.reply_button"
          >
            <Send size={16} />
          </Button>
        </div>
      )}

      {/* Nav arrows */}
      {groupIdx > 0 && (
        <button
          type="button"
          onClick={() => {
            setGroupIdx((g) => g - 1);
            setStoryIdx(0);
            setProgress(0);
          }}
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 rounded-full p-1 text-white"
        >
          <ChevronLeft size={20} />
        </button>
      )}
      {groupIdx < groups.length - 1 && (
        <button
          type="button"
          onClick={() => {
            setGroupIdx((g) => g + 1);
            setStoryIdx(0);
            setProgress(0);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 rounded-full p-1 text-white"
        >
          <ChevronRight size={20} />
        </button>
      )}
    </motion.div>
  );
}

// ---------- Main Page ----------

function StoriesPageInner() {
  const { data: rawStories = [], isLoading } = useActiveStories();
  const [composerOpen, setComposerOpen] = useState(false);
  const [viewerGroupIndex, setViewerGroupIndex] = useState<number | null>(null);

  const currentUserId = "me"; // Placeholder — replace with real identity in full auth flow
  const now = Date.now();
  const activeStories = rawStories.filter((s) => s.expiresAt > now);
  const groups = groupStories(activeStories, currentUserId);

  const myGroup: StoryGroup = {
    userId: currentUserId,
    userName: "आप",
    userPhotoUrl: undefined,
    stories: groups.find((g) => g.userId === currentUserId)?.stories ?? [],
    hasUnviewed: false,
  };

  const otherGroups = groups.filter((g) => g.userId !== currentUserId);
  const displayGroups = [myGroup, ...otherGroups];

  const openViewer = (groupIndex: number) => {
    if (groupIndex === 0 && myGroup.stories.length === 0) {
      setComposerOpen(true);
    } else {
      setViewerGroupIndex(groupIndex);
    }
  };

  const handleReply = (_story: Story, _text: string) => {
    // In a real implementation, this would send a 1-to-1 message via useSendMessage
  };

  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      data-ocid="stories.page"
    >
      {/* Stories ring row */}
      <div className="bg-card border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground mb-3">Stories</h2>
        <div
          className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide"
          data-ocid="stories.list"
        >
          {/* My Story */}
          <div className="flex flex-col items-center gap-1 min-w-[64px]">
            <button
              type="button"
              onClick={() => setComposerOpen(true)}
              className="relative"
              data-ocid="stories.add_button"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 border-2 border-dashed border-primary/40 flex items-center justify-center">
                <Camera className="text-primary" size={20} />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                <Plus size={12} className="text-primary-foreground" />
              </div>
            </button>
            <span className="text-[10px] text-foreground">आपकी Story</span>
          </div>

          {/* Other stories */}
          {isLoading
            ? (["a", "b", "c", "d"] as const).map((k) => (
                <div
                  key={`ring-sk-${k}`}
                  className="flex flex-col items-center gap-1 min-w-[64px]"
                >
                  <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
                  <div className="w-10 h-2 bg-muted rounded animate-pulse" />
                </div>
              ))
            : otherGroups.map((group, i) => (
                <StoryRing
                  key={group.userId}
                  group={group}
                  onClick={() => openViewer(i + 1)}
                />
              ))}
        </div>
      </div>

      {/* Story grid / feed */}
      <div className="flex-1 p-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {(["a", "b", "c", "d"] as const).map((k) => (
              <div
                key={`grid-sk-${k}`}
                className="aspect-[9/16] rounded-xl bg-muted animate-pulse"
              />
            ))}
          </div>
        ) : otherGroups.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center h-64 gap-4"
            data-ocid="stories.empty_state"
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="text-primary" size={32} />
            </div>
            <p className="text-muted-foreground text-sm text-center max-w-xs">
              कोई story नहीं है। ऊपर '+' tap करके पहली story add करें।
            </p>
            <Button
              onClick={() => setComposerOpen(true)}
              data-ocid="stories.create_first_button"
            >
              <Plus size={16} className="mr-2" />
              Story बनाएं
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {otherGroups.map((group, i) => {
              const latest = group.stories[group.stories.length - 1];
              return (
                <button
                  type="button"
                  key={group.userId}
                  onClick={() => openViewer(i + 1)}
                  className="aspect-[9/16] rounded-xl overflow-hidden relative"
                  data-ocid={`stories.grid_item.${i + 1}`}
                >
                  {latest?.mediaUrl ? (
                    <img
                      src={latest.mediaUrl}
                      alt={group.userName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center p-3"
                      style={{
                        background: latest?.backgroundColor ?? "#064420",
                      }}
                    >
                      <p
                        className="text-sm font-bold text-center line-clamp-4"
                        style={{ color: latest?.textColor ?? "#ffffff" }}
                      >
                        {latest?.content}
                      </p>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                    <p className="text-white text-xs font-medium truncate">
                      {group.userName}
                    </p>
                    {group.hasUnviewed && (
                      <div className="w-2 h-2 rounded-full bg-primary absolute top-2 right-2" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Composer overlay */}
      <AnimatePresence>
        {composerOpen && (
          <StoryComposer onClose={() => setComposerOpen(false)} />
        )}
      </AnimatePresence>

      {/* Viewer overlay */}
      <AnimatePresence>
        {viewerGroupIndex !== null && (
          <StoryViewer
            groups={displayGroups.filter((g) => g.stories.length > 0)}
            startGroupIndex={Math.max(
              0,
              viewerGroupIndex - (myGroup.stories.length === 0 ? 1 : 0),
            )}
            currentUserId={currentUserId}
            onClose={() => setViewerGroupIndex(null)}
            onReply={handleReply}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function StoriesPage() {
  return (
    <ChatProvider>
      <StoriesPageInner />
    </ChatProvider>
  );
}
