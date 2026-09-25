"use client";

import { FormEvent, useEffect, useRef, useState, useCallback } from "react";
import { Bot, MessageCircle, Mic, MicOff, Send, Volume2, VolumeX, X } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { LANG_LOCALE } from "@/lib/voiceCommands";

// Extend window type for webkit prefix
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: any;
  }
}

type Message = { role: "user" | "model"; text: string };
type ListingContext = {
  name: string; category: string; description: string;
  price_inr?: number; making_cost_inr?: number | null;
  hours_to_make?: number | null; craft_experience_years?: number | null; lead_time?: string | null;
};

function speak(text: string, locale: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = locale;
  utterance.rate = 0.92;
  utterance.pitch = 1;
  const voices = window.speechSynthesis.getVoices();
  const match =
    voices.find((v) => v.lang === locale) ||
    voices.find((v) => v.lang.startsWith(locale.split("-")[0]));
  if (match) utterance.voice = match;
  window.speechSynthesis.speak(utterance);
}

function stopSpeaking() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

export default function BuyerEstimateChat() {
  const { t, lang } = useLang();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [audioOn, setAudioOn] = useState(true);
  const [micListening, setMicListening] = useState(false);
  const [listing, setListing] = useState<ListingContext | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: "model", text: t("chatWelcome") },
  ]);
  const bottom = useRef<HTMLDivElement>(null);
  const prevLang = useRef(lang);
  const recognitionRef = useRef<unknown>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const locale = LANG_LOCALE[lang] ?? "en-IN";

  const speakIfEnabled = useCallback((text: string) => {
    if (audioOn) speak(text, locale);
  }, [audioOn, locale]);

  // ── Voice input for chatbot ──────────────────────────────────────────────
  function startVoiceInput() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    stopSpeaking();

    const recognition = new SR();
    recognition.lang = locale;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setMicListening(true);

    recognition.onresult = (event: { resultIndex: number; results: { length: number; [key: number]: { isFinal: boolean; [key: number]: { transcript: string } } } }) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += text;
        else interim += text;
      }
      // Show interim in textarea as user speaks
      setDraft(final || interim);
    };

    recognition.onend = () => {
      setMicListening(false);
      recognitionRef.current = null;
      // Auto-submit if we got a final transcript
      setDraft((current) => {
        if (current.trim()) {
          // Trigger submit after state update
          setTimeout(() => formRef.current?.requestSubmit(), 50);
        }
        return current;
      });
    };

    recognition.onerror = (event: { error: string }) => {
      if (event.error !== "aborted" && event.error !== "no-speech") {
        console.error("Voice input error:", event.error);
      }
      setMicListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function stopVoiceInput() {
    (recognitionRef.current as { stop?: () => void })?.stop?.();
    recognitionRef.current = null;
    setMicListening(false);
  }

  function toggleMic() {
    if (micListening) stopVoiceInput();
    else startVoiceInput();
  }

  // Stop voice input when chat closes or language changes
  useEffect(() => { if (!open) stopVoiceInput(); }, [open]);
  useEffect(() => { stopVoiceInput(); }, [lang]);

  // Stop speaking when chat closes or language changes
  useEffect(() => { if (!open) stopSpeaking(); }, [open]);
  useEffect(() => { stopSpeaking(); }, [lang]);

  // Retranslate history on language change
  useEffect(() => {
    if (prevLang.current === lang) return;
    prevLang.current = lang;

    if (messages.length === 1 && messages[0].role === "model") {
      setMessages([{ role: "model", text: t("chatWelcome") }]);
      return;
    }

    const modelMessages = messages.filter((m) => m.role === "model");
    if (modelMessages.length === 0) return;

    setTranslating(true);
    Promise.all(
      modelMessages.map(async (msg) => {
        try {
          const res = await fetch("/api/ai/market-guide", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: `Translate this text to the target language, keeping the same meaning and tone. Return only the translated text, nothing else: "${msg.text}"`,
              history: [], listing: null, lang,
            }),
          });
          const data = await res.json();
          return res.ok ? data.reply : msg.text;
        } catch { return msg.text; }
      })
    ).then((translated) => {
      setMessages((prev) => {
        let idx = 0;
        return prev.map((m) => m.role === "model" ? { ...m, text: translated[idx++] ?? m.text } : m);
      });
      setTranslating(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => {
    const openChat  = () => setOpen(true);
    const closeChat = () => setOpen(false);
    window.addEventListener("kaari:voice-chat-open",  openChat);
    window.addEventListener("kaari:voice-chat-close", closeChat);
    return () => {
      window.removeEventListener("kaari:voice-chat-open",  openChat);
      window.removeEventListener("kaari:voice-chat-close", closeChat);
    };
  }, []);

  useEffect(() => {
    const selectProduct = (event: Event) => {
      const product = (event as CustomEvent<ListingContext>).detail;
      if (!product?.name || !product.category) return;
      setListing(product);
      setOpen(true);
      const msg = t("chatProductLoaded", { name: product.name });
      setMessages((previous) => [...previous, { role: "model", text: msg }]);
      speakIfEnabled(msg);
    };
    window.addEventListener("kaari:estimate-product", selectProduct);
    return () => window.removeEventListener("kaari:estimate-product", selectProduct);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, speakIfEnabled]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    stopSpeaking();
    stopVoiceInput();
    const conversation = [...messages, { role: "user" as const, text }];
    setMessages(conversation);
    setDraft("");
    setBusy(true);
    try {
      const response = await fetch("/api/ai/market-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: messages.slice(-8), listing, lang }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || t("chatError"));
      const reply = data.reply as string;
      setMessages([...conversation, { role: "model", text: reply }]);
      speakIfEnabled(reply);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : t("chatError");
      setMessages([...conversation, { role: "model", text: errMsg }]);
    } finally {
      setBusy(false);
      window.setTimeout(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  function toggleAudio() {
    if (audioOn) stopSpeaking();
    setAudioOn((v) => !v);
  }

  return <div className="buyer-chat">
    {open && <section className="buyer-chat-panel" aria-label={t("chatTitle")}>
      <header className="buyer-chat-head">
        <span className="buyer-chat-mark"><Bot size={19}/></span>
        <div><strong>{t("chatTitle")}</strong><small>{t("chatSubtitle")}</small></div>
        <button type="button" className="buyer-chat-close" onClick={toggleAudio}
          aria-label={audioOn ? "Mute voice" : "Unmute voice"} title={audioOn ? "Mute voice" : "Unmute voice"}
          style={{ marginLeft: "auto" }}>
          {audioOn ? <Volume2 size={17}/> : <VolumeX size={17}/>}
        </button>
        <button type="button" className="buyer-chat-close" onClick={() => setOpen(false)} aria-label={t("chatClose")}><X size={18}/></button>
      </header>
      {listing && <div className="buyer-chat-selected">
        {t("chatChecking")} <strong>{listing.name}</strong>
        <button type="button" onClick={() => setListing(null)}>{t("chatClear")}</button>
      </div>}
      <div className="buyer-chat-messages" aria-live="polite">
        {messages.map((message, index) => (
          <div key={index}
            className={`buyer-chat-message ${message.role === "user" ? "from-user" : "from-guide"}`}
            onClick={() => message.role === "model" && speakIfEnabled(message.text)}
            style={message.role === "model" ? { cursor: "pointer" } : undefined}
            title={message.role === "model" ? "Click to hear again" : undefined}>
            {message.text}
          </div>
        ))}
        {(busy || translating) && <div className="buyer-chat-message from-guide">{t("chatThinking")}</div>}
        <div ref={bottom}/>
      </div>
      <div className="buyer-chat-disclaimer">{t("chatDisclaimer")}</div>
      <form ref={formRef} className="buyer-chat-compose" onSubmit={send}>
        <textarea
          aria-label={t("chatPlaceholder")}
          rows={2}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={micListening ? "🎤 Listening…" : t("chatPlaceholder")}
          maxLength={1200}
          className={micListening ? "chat-textarea--listening" : ""}
        />
        {/* Mic button for voice input */}
        <button type="button"
          className={`buyer-chat-mic ${micListening ? "buyer-chat-mic--active" : ""}`}
          onClick={toggleMic}
          aria-label={micListening ? "Stop voice input" : "Speak your question"}
          title={micListening ? "Stop" : "Ask by voice"}>
          {micListening ? <MicOff size={15}/> : <Mic size={15}/>}
          {micListening && <span className="voice-nav-pulse"/>}
        </button>
        <button type="submit" aria-label={t("chatSend")} disabled={busy || translating || !draft.trim()}><Send size={17}/></button>
      </form>
    </section>}
    <button type="button" className="buyer-chat-launch" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
      {open ? <X size={20}/> : <MessageCircle size={20}/>}
      <span>{open ? t("chatCloseBtn") : t("chatLaunch")}</span>
    </button>
  </div>;
}
