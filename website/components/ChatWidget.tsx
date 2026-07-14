"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ChevronDown, MessageCircle, Send, Sparkles } from "lucide-react";
import styles from "./ChatWidget.module.css";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

type DemoStep = "name" | "phone" | "email" | null;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BULLET_RE = /^[-*•]\s+/;

/** Renders plain text with markdown-lite bullet lists ("- item" lines) as real <ul> lists; everything else as paragraphs. */
function renderContent(content: string) {
  const lines = content.split("\n");
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={blocks.length} className={styles.msgList}>
        {listItems.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    );
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) { flushList(); continue; }
    if (BULLET_RE.test(line)) {
      listItems.push(line.replace(BULLET_RE, ""));
    } else {
      flushList();
      blocks.push(<p key={blocks.length} className={styles.msgPara}>{line}</p>);
    }
  }
  flushList();
  return blocks;
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
  const [demoStep, setDemoStep] = useState<DemoStep>(null);
  const demoDataRef = useRef({ name: "", phone: "", email: "" });
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
    setScreen("chat");
    if (kind === "demo") {
      demoDataRef.current = { name: "", phone: "", email: "" };
      setDemoStep("name");
      setMessages((prev) => [...prev, { role: "assistant", content: "Great! Let's get you booked in for a free demo. What's your name?" }]);
      return;
    }
    if (kind === "switch") {
      void send("I want to switch from my current software to Salon Central. What should I know?");
    }
  }

  async function handleDemoAnswer(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");

    if (demoStep === "name") {
      demoDataRef.current.name = trimmed;
      setDemoStep("phone");
      setMessages((prev) => [...prev, { role: "assistant", content: `Thanks, ${trimmed}! What's the best phone number to reach you on?` }]);
      return;
    }

    if (demoStep === "phone") {
      if (trimmed.replace(/\D/g, "").length < 7) {
        setMessages((prev) => [...prev, { role: "assistant", content: "That doesn't look like a valid phone number — mind trying again?" }]);
        return;
      }
      demoDataRef.current.phone = trimmed;
      setDemoStep("email");
      setMessages((prev) => [...prev, { role: "assistant", content: "Perfect. And what's your email address?" }]);
      return;
    }

    if (demoStep === "email") {
      if (!EMAIL_RE.test(trimmed)) {
        setMessages((prev) => [...prev, { role: "assistant", content: "That doesn't look like a valid email — mind trying again?" }]);
        return;
      }
      demoDataRef.current.email = trimmed;
      setLoading(true);
      try {
        const res = await fetch("/api/demo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(demoDataRef.current),
        });
        const data = await res.json();
        if (!res.ok) {
          setMessages((prev) => [...prev, { role: "assistant", content: data.error || "Something went wrong submitting that — mind trying your email again?" }]);
          return;
        }
        setDemoStep(null);
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: `🎉 Thanks, ${demoDataRef.current.name}! We've got your details and will reach out within 24 hours to schedule your demo.`,
        }]);
      } catch {
        setMessages((prev) => [...prev, { role: "assistant", content: "Couldn't submit that — mind trying your email again?" }]);
      } finally {
        setLoading(false);
      }
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
                      {m.role === "assistant" ? renderContent(m.content) : m.content}
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
                if (demoStep) void handleDemoAnswer(input);
                else void send(input);
              }}
            >
              <input
                className={styles.input}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  demoStep === "name" ? "Your name…"
                  : demoStep === "phone" ? "Your phone number…"
                  : demoStep === "email" ? "Your email…"
                  : "Type a message…"
                }
                type={demoStep === "email" ? "email" : demoStep === "phone" ? "tel" : "text"}
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
    </>
  );
}
