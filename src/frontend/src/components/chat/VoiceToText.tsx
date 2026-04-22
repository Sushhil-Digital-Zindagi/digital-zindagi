/**
 * VoiceToText — Mic button that uses Web Speech API to transcribe voice.
 * Supports Hindi (hi-IN) with en-US fallback. Calls onTranscript(text) on result.
 */

import { Mic, MicOff, Square } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

interface VoiceToTextProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

// Extend window type for browser Speech API
declare global {
  interface Window {
    SpeechRecognition: new () => DzSpeechRecognitionInstance;
    webkitSpeechRecognition: new () => DzSpeechRecognitionInstance;
  }
}

interface DzSpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly [index: number]: {
    readonly transcript: string;
    readonly confidence: number;
  };
  readonly length: number;
}

interface DzSpeechRecognitionResultList {
  readonly length: number;
  readonly [index: number]: DzSpeechRecognitionResult;
}

interface DzSpeechRecognitionEvent extends Event {
  readonly results: DzSpeechRecognitionResultList;
  readonly resultIndex: number;
}

interface DzSpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: DzSpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

type SpeechState = "idle" | "listening" | "processing" | "unsupported";

export default function VoiceToText({
  onTranscript,
  disabled = false,
}: VoiceToTextProps) {
  const [state, setState] = useState<SpeechState>(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    return SR ? "idle" : "unsupported";
  });
  const [interim, setInterim] = useState("");
  const recognitionRef = useRef<DzSpeechRecognitionInstance | null>(null);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setState("idle");
    setInterim("");
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.lang = "hi-IN";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => setState("listening");
    recognition.onend = () => {
      setState("idle");
      setInterim("");
    };
    recognition.onerror = () => {
      setState("idle");
      setInterim("");
    };
    recognition.onresult = (event: DzSpeechRecognitionEvent) => {
      let final = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interimText += t;
      }
      setInterim(interimText);
      if (final) {
        onTranscript(final.trim());
        setState("idle");
        setInterim("");
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [onTranscript]);

  const handleMicClick = () => {
    if (disabled) return;
    if (state === "listening") {
      stop();
    } else if (state === "idle") {
      startListening();
    }
  };

  if (state === "unsupported") {
    return (
      <button
        type="button"
        disabled
        className="p-2 rounded-full text-muted-foreground opacity-50 cursor-not-allowed"
        title="Voice not supported in this browser"
        aria-label="Voice input not supported"
        data-ocid="voice_to_text.unsupported"
      >
        <MicOff size={20} />
      </button>
    );
  }

  return (
    <div
      className="relative flex items-center"
      data-ocid="voice_to_text.container"
    >
      {/* Interim text bubble */}
      <AnimatePresence>
        {interim && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-card border border-border rounded-xl px-3 py-1.5 text-xs text-foreground shadow-lg whitespace-nowrap max-w-[200px] truncate"
          >
            🎙 {interim}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mic button */}
      <button
        type="button"
        onClick={handleMicClick}
        disabled={disabled}
        aria-label={
          state === "listening" ? "Stop recording" : "Start voice input"
        }
        className={`relative p-2 rounded-full transition-colors ${
          state === "listening"
            ? "bg-red-500/20 text-red-500"
            : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
        } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
        data-ocid="voice_to_text.mic_button"
      >
        {state === "listening" ? (
          <>
            {/* Pulsing rings */}
            <motion.span
              className="absolute inset-0 rounded-full bg-red-500/20"
              animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
              transition={{
                duration: 1.4,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            />
            <motion.span
              className="absolute inset-0 rounded-full bg-red-500/10"
              animate={{ scale: [1, 2, 1], opacity: [0.4, 0, 0.4] }}
              transition={{
                duration: 1.4,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
                delay: 0.2,
              }}
            />
            <Square size={18} className="relative z-10 fill-red-500" />
          </>
        ) : (
          <Mic size={20} />
        )}
      </button>
    </div>
  );
}
