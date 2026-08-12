"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePostHog } from "posthog-js/react";

interface AgentMessage {
  id: string;
  role: "seller" | "analyst";
  text: string;
  ts: number;
}

interface SurveyResponse {
  messageId: string;
  helpful: boolean;
  willImplement: boolean;
  ts: number;
}

interface Conversation {
  sellerId: string;
  sellerName: string;
  messages: AgentMessage[];
  surveys: SurveyResponse[];
}

const GREETING =
  "Witam, jestem partnerskim agentem wspierającym sprzedawców. Zadaj mi pytanie dotyczące sprzedaży.";
const ACK = "Dziękuję, wrócę z odpowiedzią.";
const POLL_MS = 4000;

export function AgentChat({
  sellerId,
  sellerName,
}: {
  sellerId: string;
  sellerName: string;
}) {
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const posthog = usePostHog();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/agent/messages?seller=${encodeURIComponent(sellerId)}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = (await res.json()) as { conversation: Conversation | null };
      setConversation(data.conversation);
    } catch {
      // network hiccup — next poll will retry
    }
  }, [sellerId]);

  // Poll while the chat is open.
  useEffect(() => {
    if (!open) return;
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [open, refresh]);

  // Keep the thread scrolled to the newest message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [conversation, open]);

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft("");
    try {
      await fetch("/api/agent/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerId, sellerName, role: "seller", text }),
      });
      posthog?.capture("agent_question_sent", { sellerId });
      await refresh();
    } catch {
      setDraft(text); // restore on failure
    } finally {
      setSending(false);
    }
  }

  async function submitSurvey(
    messageId: string,
    helpful: boolean,
    willImplement: boolean,
  ) {
    try {
      await fetch("/api/agent/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerId, messageId, helpful, willImplement }),
      });
      // Core OST metric: willImplement=true → seller intends to act on the advice.
      posthog?.capture("agent_survey_submitted", {
        sellerId,
        messageId,
        helpful,
        willImplement,
      });
      await refresh();
    } catch {
      // ignore; user can retry
    }
  }

  const messages = conversation?.messages ?? [];
  const surveys = conversation?.surveys ?? [];
  const hasSurvey = (messageId: string) =>
    surveys.some((s) => s.messageId === messageId);

  function openChat() {
    // Tie all events + session replay to this specific seller (n=10 analysis).
    posthog?.identify(sellerId, { sellerName });
    posthog?.capture("agent_chat_opened", { sellerId, sellerName });
    setOpen(true);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={openChat}
        className="btn-cta"
      >
        Chat z agentem partnerem
      </button>
    );
  }

  return (
    <div className="flex w-full max-w-md flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      {/* header */}
      <div className="flex items-center justify-between border-b border-border bg-charcoal px-4 py-3">
        <div>
          <p className="text-sm font-medium text-white">Agent partner</p>
          <p className="text-[11px] uppercase tracking-[1px] text-white/60">
            FashionHero
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-white/70 transition-colors hover:text-white"
          aria-label="Zamknij czat"
        >
          ✕
        </button>
      </div>

      {/* thread */}
      <div
        ref={scrollRef}
        className="flex max-h-96 min-h-64 flex-col gap-3 overflow-y-auto bg-background px-4 py-4"
      >
        <Bubble role="analyst" text={GREETING} />

        {messages.map((m, i) => {
          const nextIsAnalyst = messages[i + 1]?.role === "analyst";
          return (
            <div key={m.id} className="flex flex-col gap-3">
              <Bubble role={m.role} text={m.text} />

              {/* hardcoded ack right after a seller question with no reply yet */}
              {m.role === "seller" && !nextIsAnalyst && (
                <Bubble role="analyst" text={ACK} muted />
              )}

              {/* survey under each analyst reply */}
              {m.role === "analyst" &&
                (hasSurvey(m.id) ? (
                  <p className="ml-2 text-[11px] uppercase tracking-[1px] text-warm-gray">
                    Dziękujemy za ocenę
                  </p>
                ) : (
                  <SurveyCard
                    onSubmit={(helpful, willImplement) =>
                      submitSurvey(m.id, helpful, willImplement)
                    }
                  />
                ))}
            </div>
          );
        })}
      </div>

      {/* composer */}
      <div className="flex items-end gap-2 border-t border-border bg-card px-3 py-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder="Zadaj pytanie o sprzedaż…"
          className="max-h-32 min-h-9 flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
        />
        <button
          type="button"
          onClick={send}
          disabled={sending || !draft.trim()}
          className="btn-cta shrink-0 disabled:opacity-40"
        >
          Wyślij
        </button>
      </div>
    </div>
  );
}

function Bubble({
  role,
  text,
  muted = false,
}: {
  role: "seller" | "analyst";
  text: string;
  muted?: boolean;
}) {
  const isSeller = role === "seller";
  return (
    <div className={isSeller ? "flex justify-end" : "flex justify-start"}>
      <div
        className={[
          "max-w-[80%] rounded-lg px-3 py-2 text-sm",
          isSeller
            ? "bg-charcoal text-white"
            : muted
              ? "border border-border bg-secondary text-warm-gray italic"
              : "border border-border bg-card text-foreground",
        ].join(" ")}
      >
        {text}
      </div>
    </div>
  );
}

function SurveyCard({
  onSubmit,
}: {
  onSubmit: (helpful: boolean, willImplement: boolean) => void;
}) {
  const [helpful, setHelpful] = useState<boolean | null>(null);
  const [willImplement, setWillImplement] = useState<boolean | null>(null);
  const ready = helpful !== null && willImplement !== null;

  return (
    <div className="ml-2 flex flex-col gap-2 rounded-md border border-border bg-secondary px-3 py-3">
      <p className="text-[11px] font-medium uppercase tracking-[1px] text-warm-gray">
        Krótka ankieta
      </p>
      <YesNo
        label="Czy odpowiedź była pomocna?"
        value={helpful}
        onChange={setHelpful}
      />
      <YesNo
        label="Czy zaimplementujesz tę radę?"
        value={willImplement}
        onChange={setWillImplement}
      />
      <button
        type="button"
        disabled={!ready}
        onClick={() => ready && onSubmit(helpful, willImplement)}
        className="btn-cta-outline mt-1 self-start disabled:opacity-40"
      >
        Wyślij ocenę
      </button>
    </div>
  );
}

function YesNo({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex shrink-0 gap-1">
        {[
          { label: "Tak", v: true },
          { label: "Nie", v: false },
        ].map((opt) => (
          <button
            key={opt.label}
            type="button"
            onClick={() => onChange(opt.v)}
            className={[
              "rounded-md border px-3 py-1 text-xs transition-colors",
              value === opt.v
                ? "border-charcoal bg-charcoal text-white"
                : "border-border bg-card text-foreground hover:bg-muted",
            ].join(" ")}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
