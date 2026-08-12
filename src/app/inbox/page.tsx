"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Analyst inbox for the Wizard of Oz test. The human "agent" opens /inbox,
// sees seller questions coming in, and types replies that flow back to the
// seller's chat. No email, no SMTP — this page IS the mailbox.

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

const POLL_MS = 4000;

function formatTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
}

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/agent/messages", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { conversations: Conversation[] };
      setConversations(data.conversations);
      // Auto-select the first thread once data arrives.
      if (!selectedIdRef.current && data.conversations[0]) {
        setSelectedId(data.conversations[0].sellerId);
      }
    } catch {
      // next poll retries
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const selected =
    conversations.find((c) => c.sellerId === selectedId) ?? null;

  async function reply() {
    const text = draft.trim();
    if (!text || !selected || sending) return;
    setSending(true);
    setDraft("");
    try {
      await fetch("/api/agent/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerId: selected.sellerId,
          sellerName: selected.sellerName,
          role: "analyst",
          text,
        }),
      });
      await refresh();
    } catch {
      setDraft(text);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border bg-charcoal px-6 py-3">
        <div>
          <p className="text-sm font-medium text-white">
            Skrzynka analityka — Agent partner
          </p>
          <p className="text-[11px] uppercase tracking-[1px] text-white/60">
            Wizard of Oz · FashionHero
          </p>
        </div>
        <span className="text-[11px] uppercase tracking-[1px] text-white/60">
          {conversations.length}{" "}
          {conversations.length === 1 ? "rozmowa" : "rozmów"}
        </span>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* thread list */}
        <aside className="w-72 shrink-0 overflow-y-auto border-r border-border bg-card">
          {conversations.length === 0 ? (
            <p className="px-4 py-6 text-sm text-warm-gray">
              Brak pytań. Czekam na wiadomości od sprzedawców…
            </p>
          ) : (
            <ul>
              {conversations.map((c) => {
                const last = c.messages.at(-1);
                const unanswered = last?.role === "seller";
                return (
                  <li key={c.sellerId}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(c.sellerId)}
                      className={[
                        "flex w-full flex-col gap-0.5 border-b border-border px-4 py-3 text-left transition-colors",
                        c.sellerId === selectedId
                          ? "bg-muted"
                          : "hover:bg-secondary",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate text-sm font-medium text-charcoal">
                          {c.sellerName}
                        </span>
                        {unanswered && (
                          <span className="ml-2 shrink-0 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-medium text-white">
                            nowe
                          </span>
                        )}
                      </div>
                      <span className="truncate text-[13px] text-warm-gray">
                        {last?.text ?? "—"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* conversation */}
        <section className="flex min-h-0 flex-1 flex-col">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center text-sm text-warm-gray">
              Wybierz rozmowę z listy po lewej.
            </div>
          ) : (
            <>
              <div className="border-b border-border px-6 py-3">
                <p className="text-sm font-medium text-charcoal">
                  {selected.sellerName}
                </p>
                <p className="text-[11px] uppercase tracking-[1px] text-warm-gray">
                  seller id: {selected.sellerId}
                </p>
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
                {selected.messages.map((m) => {
                  const isAnalyst = m.role === "analyst";
                  const survey = selected.surveys.find(
                    (s) => s.messageId === m.id,
                  );
                  return (
                    <div
                      key={m.id}
                      className={
                        isAnalyst ? "flex justify-end" : "flex justify-start"
                      }
                    >
                      <div className="max-w-[70%]">
                        <div
                          className={[
                            "rounded-lg px-3 py-2 text-sm",
                            isAnalyst
                              ? "bg-charcoal text-white"
                              : "border border-border bg-card text-foreground",
                          ].join(" ")}
                        >
                          {m.text}
                        </div>
                        <p
                          className={[
                            "mt-1 text-[10px] uppercase tracking-[1px] text-warm-gray",
                            isAnalyst ? "text-right" : "text-left",
                          ].join(" ")}
                        >
                          {isAnalyst ? "Ty" : selected.sellerName} ·{" "}
                          {formatTime(m.ts)}
                        </p>
                        {survey && (
                          <p className="mt-1 text-right text-[10px] uppercase tracking-[1px] text-warm-gray">
                            ocena: pomocne {survey.helpful ? "tak" : "nie"} ·
                            wdroży {survey.willImplement ? "tak" : "nie"}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-end gap-2 border-t border-border bg-card px-4 py-3">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      reply();
                    }
                  }}
                  rows={2}
                  placeholder="Napisz odpowiedź do sprzedawcy…"
                  className="max-h-40 min-h-10 flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-ring"
                />
                <button
                  type="button"
                  onClick={reply}
                  disabled={sending || !draft.trim()}
                  className="btn-cta shrink-0 disabled:opacity-40"
                >
                  Wyślij
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
