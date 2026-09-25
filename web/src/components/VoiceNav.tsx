"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Mic, MicOff } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { matchCommand, VOICE_FEEDBACK, VoiceAction, LANG_LOCALE } from "@/lib/voiceCommands";

// Extend window type for webkit prefix
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: any;
  }
}

type Props = {
  onAction: (action: VoiceAction) => void;
};

type Status = "idle" | "listening" | "processing" | "unsupported";

export default function VoiceNav({ onAction }: Props) {
  const { lang } = useLang();
  const [status, setStatus] = useState<Status>("idle");
  const [transcript, setTranscript] = useState("");
  const [toast, setToast] = useState("");
  const recognitionRef = useRef<unknown>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check browser support
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) setStatus("unsupported");
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3000);
  }, []);

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = LANG_LOCALE[lang] ?? "en-IN";
    utt.rate = 1;
    const voices = window.speechSynthesis.getVoices();
    const locale = LANG_LOCALE[lang] ?? "en-IN";
    const match = voices.find((v) => v.lang === locale) || voices.find((v) => v.lang.startsWith(locale.split("-")[0]));
    if (match) utt.voice = match;
    window.speechSynthesis.speak(utt);
  }, [lang]);

  const stopListening = useCallback(() => {
    (recognitionRef.current as { stop?: () => void })?.stop?.();
    recognitionRef.current = null;
    setStatus("idle");
    setTranscript("");
  }, []);

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.lang = LANG_LOCALE[lang] ?? "en-IN";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => setStatus("listening");

    recognition.onresult = (event: { resultIndex: number; results: { length: number; [key: number]: { length: number; isFinal: boolean; [key: number]: { transcript: string } } } }) => {
      setStatus("processing");
      // Collect all alternatives from all results
      const allTranscripts: string[] = [];
      for (let i = 0; i < event.results.length; i++) {
        for (let j = 0; j < event.results[i].length; j++) {
          allTranscripts.push(event.results[i][j].transcript);
        }
      }
      const best = allTranscripts[0] ?? "";
      setTranscript(best);

      // Try matching each alternative
      let action: VoiceAction | null = null;
      for (const t of allTranscripts) {
        action = matchCommand(t, lang);
        if (action) break;
      }

      if (action) {
        const feedback = VOICE_FEEDBACK[action][lang] ?? VOICE_FEEDBACK[action]["en"];
        showToast(feedback);
        speak(feedback);
        onAction(action);
      } else {
        const noMatch = { en: `Didn't catch "${best}". Try saying: Discover, Artisans, Search, or Help.`, hi: `"${best}" समझ नहीं आया। कहें: खोजें, कारीगर, खोज, या मदद।`, ta: `"${best}" புரியவில்லை. சொல்லுங்கள்: கண்டறி, கலைஞர், தேடு, உதவி.`, te: `"${best}" అర్థం కాలేదు. చెప్పండి: కనుగొను, కళాకారుడు, వెతుకు, సహాయం.` };
        showToast(noMatch[lang as keyof typeof noMatch] ?? noMatch.en);
      }
    };

    recognition.onerror = (event: { error: string }) => {
      if (event.error === "no-speech") {
        showToast({ en: "No speech detected. Try again.", hi: "कोई आवाज़ नहीं आई। फिर से कोशिश करें।", ta: "பேச்சு கேட்கவில்லை. மீண்டும் முயற்சிக்கவும்.", te: "మాట వినబడలేదు. మళ్ళీ ప్రయత్నించండి." }[lang as "en"|"hi"|"ta"|"te"] ?? "No speech detected.");
      } else if (event.error !== "aborted") {
        showToast("Mic error: " + event.error);
      }
      setStatus("idle");
    };

    recognition.onend = () => {
      setStatus((s) => s === "listening" || s === "processing" ? "idle" : s);
      setTranscript("");
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [lang, onAction, showToast, speak]);

  function toggle() {
    if (status === "listening" || status === "processing") {
      stopListening();
    } else {
      startListening();
    }
  }

  // Restart recognition when language changes while listening
  useEffect(() => {
    if (status === "listening") {
      stopListening();
      setTimeout(startListening, 300);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // Cleanup on unmount
  useEffect(() => () => { stopListening(); if (toastTimer.current) clearTimeout(toastTimer.current); }, [stopListening]);

  if (status === "unsupported") return null;

  const isActive = status === "listening" || status === "processing";

  return (
    <div className="voice-nav-wrapper">
      <button
        type="button"
        className={`voice-nav-btn ${isActive ? "voice-nav-btn--active" : ""}`}
        onClick={toggle}
        aria-label={isActive ? "Stop voice command" : "Start voice command"}
        title={isActive ? "Stop listening" : "Speak a command"}
      >
        {isActive ? <MicOff size={17}/> : <Mic size={17}/>}
        {isActive && <span className="voice-nav-pulse"/>}
      </button>

      {/* Live transcript bubble */}
      {transcript && (
        <div className="voice-nav-transcript">"{transcript}"</div>
      )}

      {/* Result toast */}
      {toast && (
        <div className="voice-nav-toast">{toast}</div>
      )}
    </div>
  );
}
