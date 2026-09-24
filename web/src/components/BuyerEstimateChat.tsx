"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, MessageCircle, Send, X } from "lucide-react";

type Message = { role: "user" | "model"; text: string };
type ListingContext = { name: string; category: string; description: string; price_inr?: number; making_cost_inr?: number | null; hours_to_make?: number | null; craft_experience_years?: number | null; lead_time?: string | null };

export default function BuyerEstimateChat() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [listing, setListing] = useState<ListingContext | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: "model", text: "Hello! I can estimate a handmade product’s likely cost and making time. Tell me its materials, size and details, plus what the seller says. I can help you compare, but I can’t verify a seller’s honesty." },
  ]);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const selectProduct = (event: Event) => {
      const product = (event as CustomEvent<ListingContext>).detail;
      if (!product?.name || !product.category) return;
      setListing(product);
      setOpen(true);
      setMessages((previous) => [...previous, { role: "model", text: `I’ve loaded “${product.name}” and the seller’s listing details. Ask me for an indicative making-time or cost range, or tell me which seller claim you want to compare.` }]);
    };
    window.addEventListener("kaari:estimate-product", selectProduct);
    return () => window.removeEventListener("kaari:estimate-product", selectProduct);
  }, []);

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
        body: JSON.stringify({ message: text, history: messages.slice(-8), listing }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "The guide could not respond.");
      setMessages([...conversation, { role: "model", text: data.reply }]);
    } catch (error) {
      setMessages([...conversation, { role: "model", text: error instanceof Error ? error.message : "The guide could not respond. Please try again." }]);
    } finally {
      setBusy(false);
      window.setTimeout(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  return <div className="buyer-chat">
    {open && <section className="buyer-chat-panel" aria-label="Kaari buyer estimate guide">
      <header className="buyer-chat-head"><span className="buyer-chat-mark"><Bot size={19}/></span><div><strong>Kaari Buyer Guide</strong><small>Craft cost &amp; making time estimates</small></div><button type="button" className="buyer-chat-close" onClick={() => setOpen(false)} aria-label="Close buyer guide"><X size={18}/></button></header>
      {listing&&<div className="buyer-chat-selected">Checking: <strong>{listing.name}</strong><button type="button" onClick={()=>setListing(null)}>Clear</button></div>}
      <div className="buyer-chat-messages" aria-live="polite">{messages.map((message, index) => <div key={index} className={`buyer-chat-message ${message.role === "user" ? "from-user" : "from-guide"}`}>{message.text}</div>)}{busy&&<div className="buyer-chat-message from-guide">Thinking through the details…</div>}<div ref={bottom}/></div>
      <div className="buyer-chat-disclaimer">Indicative AI guidance only. Differences are not proof of seller dishonesty.</div>
      <form className="buyer-chat-compose" onSubmit={send}><textarea aria-label="Ask about product cost or making time" rows={2} value={draft} onChange={(event)=>setDraft(event.target.value)} placeholder="Describe the craft and seller’s claim…" maxLength={1200}/><button type="submit" aria-label="Send message" disabled={busy||!draft.trim()}><Send size={17}/></button></form>
    </section>}
    <button type="button" className="buyer-chat-launch" aria-expanded={open} onClick={()=>setOpen((value)=>!value)}>{open?<X size={20}/>:<MessageCircle size={20}/>}<span>{open?"Close guide":"Ask about cost & time"}</span></button>
  </div>;
}
