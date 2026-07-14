"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, MessageCircle, Send, Sparkles } from "lucide-react";
import styles from "./ChatWidget.module.css";
import DemoModal from "./DemoModal";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const QUICK_ACTIONS = [
  { emoji: "💜", label: "Book a free demo", kind: "demo" as const },
  { emoji: "💬", label: "Answer product questions", kind: "chat" as const },
  { emoji: "🚀", label: "Help switch from your current software", kind: "switch" as const },
];

const SUGGESTED_PROMPTS = [
  "What features does Salon Central have?",
  "Do you have WhatsApp reminders?",
  "How do I book a demo?",
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState<"menu" | "chat">("menu");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [demoOpen, setDemoOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, screen]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Something went wrong. Please try again.");
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      }
    } catch {
      setError("Couldn't reach the assistant. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleQuickAction(kind: "demo" | "chat" | "switch") {
    if (kind === "demo") {
      setDemoOpen(true);
      return;
    }
    setScreen("chat");
    if (kind === "switch") {
      void send("I want to switch from my current software to Salon Central. What should I know?");
    }
  }

  return (
    <>
      {!open && (
        <button type="button" className={styles.launcher} onClick={() => setOpen(true)} aria-label="Open chat">
          <MessageCircle size={24} />
        </button>
      )}

      {open && (
        <div className={styles.window} role="dialog" aria-label="Salon Central chat">
          <div className={styles.header}>
            <div className={styles.headerTopRow}>
              {screen === "chat" ? (
                <button type="button" className={styles.headerBack} onClick={() => setScreen("menu")} aria-label="Back to menu">
                  <ArrowLeft size={15} />
                </button>
              ) : <span />}
              <button type="button" className={styles.headerClose} onClick={() => setOpen(false)} aria-label="Close chat">
                <ChevronDown size={16} />
              </button>
            </div>
            <div className={styles.avatarRow}>
              <div className={styles.avatar}>SC</div>
              <div className={styles.bubbleCol}>
                <div className={styles.introBubble}>Welcome to Salon Central 👋</div>
                <div className={styles.introBubble}>How can we help you?</div>
              </div>
            </div>
            <div className={styles.statusRow}>
              <span className={styles.statusDot} />
              Typically replies instantly
            </div>
          </div>

          <div className={styles.body} ref={bodyRef}>
            {screen === "menu" ? (
              <div className={styles.quickActions}>
                {QUICK_ACTIONS.map((a) => (
                  <button key={a.label} type="button" className={styles.quickBtn} onClick={() => handleQuickAction(a.kind)}>
                    <span className={styles.quickEmoji}>{a.emoji}</span> {a.label}
                  </button>
                ))}
              </div>
            ) : messages.length === 0 && !loading ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}><Sparkles size={20} /></div>
                <div className={styles.emptyTitle}>Ask me anything</div>
                <div className={styles.emptyBody}>I can answer questions about Salon Central&apos;s features, pricing, and setup.</div>
                <div className={styles.suggestions}>
                  {SUGGESTED_PROMPTS.map((p) => (
                    <button key={p} type="button" className={styles.suggestionChip} onClick={() => void send(p)}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((m, i) => (
                  <div key={i} className={`${styles.msgRow} ${m.role === "user" ? styles.msgRowUser : ""}`}>
                    {m.role === "assistant" && <div className={styles.msgAvatar}>SC</div>}
                    <div className={`${styles.msgBubble} ${m.role === "user" ? styles.msgBubbleUser : styles.msgBubbleAssistant}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className={styles.msgRow}>
                    <div className={styles.msgAvatar}>SC</div>
                    <div className={`${styles.msgBubble} ${styles.msgBubbleAssistant}`}>
                      <div className={styles.typing}><span /><span /><span /></div>
                    </div>
                  </div>
                )}
                {error && <div className={styles.errorMsg}>{error}</div>}
              </>
            )}
          </div>

          {screen === "chat" && (
            <form
              className={styles.footer}
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
            >
              <input
                className={styles.input}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message…"
                maxLength={2000}
              />
              <button type="submit" className={styles.sendBtn} disabled={loading || !input.trim()} aria-label="Send">
                <Send size={16} />
              </button>
            </form>
          )}

          <div className={styles.brandFooter}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/salon-central-logo.png" alt="" />
            Salon Central
          </div>
        </div>
      )}

      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </>
  );
}
