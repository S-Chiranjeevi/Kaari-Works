"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, MessageCircle, Send, X } from "lucide-react";
import { useLang } from "@/lib/i18n";

type Message = { role: "user" | "model"; text: string };
type ListingContext = {
  name: string; category: string; description: string;
  price_inr?: number; making_cost_inr?: number | null;
  hours_to_make?: number | null; craft_experience_years?: number | null; lead_time?: string | null;
};

export default function BuyerEstimateChat() {
  const { t, lang } = useLang();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [listing, setListing] = useState<ListingContext | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: "model", text: t("chatWelcome") },
  ]);
  const bottom = useRef<HTMLDivElement>(null);

  // Update welcome message when language changes
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].role === "model") {
        return [{ role: "model", text: t("chatWelcome") }];
      }
      return prev;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => {
    const selectProduct = (event: Event) => {
      const product = (event as CustomEvent<ListingContext>).detail;
      if (!product?.name || !product.category) return;
      setListing(product);
      setOpen(true);
      setMessages((previous) => [
        ...previous,
        { role: "model", text: t("chatProductLoaded", { name: product.name }) },
      ]);
    };
    window.addEventListener("kaari:estimate-product", selectProduct);
    return () => window.removeEventListener("kaari:estimate-product", selectProduct);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
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
      setMessages([...conversation, { role: "model", text: data.reply }]);
    } catch (error) {
      setMessages([...conversation, { role: "model", text: error instanceof Error ? error.message : t("chatError") }]);
    } finally {
      setBusy(false);
      window.setTimeout(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  return <div className="buyer-chat">
    {open && <section className="buyer-chat-panel" aria-label={t("chatTitle")}>
      <header className="buyer-chat-head">
        <span className="buyer-chat-mark"><Bot size={19}/></span>
        <div><strong>{t("chatTitle")}</strong><small>{t("chatSubtitle")}</small></div>
        <button type="button" className="buyer-chat-close" onClick={() => setOpen(false)} aria-label={t("chatClose")}><X size={18}/></button>
      </header>
      {listing && <div className="buyer-chat-selected">
        {t("chatChecking")} <strong>{listing.name}</strong>
        <button type="button" onClick={() => setListing(null)}>{t("chatClear")}</button>
      </div>}
      <div className="buyer-chat-messages" aria-live="polite">
        {messages.map((message, index) => (
          <div key={index} className={`buyer-chat-message ${message.role === "user" ? "from-user" : "from-guide"}`}>
            {message.text}
          </div>
        ))}
        {busy && <div className="buyer-chat-message from-guide">{t("chatThinking")}</div>}
        <div ref={bottom}/>
      </div>
      <div className="buyer-chat-disclaimer">{t("chatDisclaimer")}</div>
      <form className="buyer-chat-compose" onSubmit={send}>
        <textarea
          aria-label={t("chatPlaceholder")}
          rows={2}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t("chatPlaceholder")}
          maxLength={1200}
        />
        <button type="submit" aria-label={t("chatSend")} disabled={busy || !draft.trim()}><Send size={17}/></button>
      </form>
    </section>}
    <button type="button" className="buyer-chat-launch" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
      {open ? <X size={20}/> : <MessageCircle size={20}/>}
      <span>{open ? t("chatCloseBtn") : t("chatLaunch")}</span>
    </button>
  </div>;
}
