'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { TextStreamChatTransport } from 'ai';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { generateId } from '@/lib/utils';
import { PageHero } from '../components/PageHero';
import { PageShell } from '../components/PageShell';
import { ChatMessages } from '../components/chat/ChatMessages';
import { ChatContextPanel } from '../components/chat/ChatContextPanel';

// Starter questions answerable from the paleo corpus — clicking one prefills the
// message box so users can see RAG retrieval fire on a known-good query.
const SUGGESTED_QUESTIONS = [
  'What did the new Spinosaurus discovery find?',
  'Is Nanotyrannus its own species?',
  'Why did the dinosaurs go extinct?',
];

export default function ChatPage() {
  // Stable id for the chat session so the n8n agent can keep memory across turns.
  const [sessionId] = useState(() => generateId());
  const [input, setInput] = useState('');
  // Bumped after each completed turn so the memory panel refetches — Zep updates
  // the user's long-term summary once recordChatTurn writes the turn.
  const [contextRefresh, setContextRefresh] = useState(0);
  // Re-create the transport whenever the session changes so /api/chat receives
  // the current sessionId in its body.
  const transport = useMemo(
    () =>
      new TextStreamChatTransport({ api: '/api/chat', body: { sessionId } }),
    [sessionId]
  );
  const { messages, sendMessage, status, error } = useChat({
    transport,
  });

  const isBusy = status === 'submitted' || status === 'streaming';
  // The most recent user message drives the panel's query-relevant graph search.
  const latestQuestion = useMemo(() => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return '';
    return lastUser.parts
      .map((p) => (p.type === 'text' ? p.text : ''))
      .join(' ')
      .trim();
  }, [messages]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isBusy) return;
    sendMessage({ text });
    setInput('');
  }

  // Refresh the memory panel on the falling edge of `isBusy` (a turn just
  // finished streaming), since that is when the user's Zep memory may change.
  const wasBusyRef = useRef(false);
  useEffect(() => {
    if (wasBusyRef.current && !isBusy) {
      setContextRefresh((n) => n + 1);
    }
    wasBusyRef.current = isBusy;
  }, [isBusy]);

  return (
    <PageShell>
      <PageHero
        eyebrow="AI Chat"
        title={
          <>
            Paleo
            <span className="font-serif font-normal italic text-primary">
              Desk
            </span>
          </>
        }
        subtitle={
          <>
            Ask a paleontology question. Your{' '}
            <code className="rounded bg-muted px-1">/api/chat</code> route
            proxies an <code className="rounded bg-muted px-1">n8n</code> RAG
            agent, runs its guardrails on the full reply, then types the
            validated, cited answer back here.
          </>
        }
      />
      <div className="flex gap-4">
        <Card className="flex h-[70vh] flex-1 flex-col border-2 border-foreground rounded-2xl shadow-hard">
          <CardContent className="flex-1 overflow-y-auto space-y-4 pt-6">
            <ChatMessages messages={messages} status={status} error={error} />
          </CardContent>

          <div className="border-t p-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {SUGGESTED_QUESTIONS.map((question) => (
                <Button
                  key={question}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => setInput(question)}
                  disabled={isBusy}
                >
                  {question}
                </Button>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message…"
                disabled={isBusy}
                aria-label="Message"
              />
              <Button type="submit" disabled={isBusy || !input.trim()}>
                <Send />
                Send
              </Button>
            </form>
          </div>
        </Card>
        <ChatContextPanel
          refreshSignal={contextRefresh}
          question={latestQuestion}
        />
      </div>
    </PageShell>
  );
}
