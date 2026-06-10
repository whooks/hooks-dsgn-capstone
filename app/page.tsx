import Link from 'next/link';
import Navigation from './components/Navigation';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navigation />

      <main className="mx-auto flex w-full max-w-content flex-1 flex-col items-start justify-center px-6 py-24 md:px-9">
        <span className="mb-7 inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-background">
          ● Paleontology RAG Assistant
        </span>

        <h1 className="max-w-3xl font-display text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl">
          Ask about recent{' '}
          <span className="font-serif font-normal italic text-primary">
            paleontology
          </span>{' '}
          discoveries.
        </h1>

        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          PaleoDesk answers from a curated corpus of recent fossil discoveries
          and paleontology FAQs. Every reply is grounded in a real source and
          screened by citation and safety guardrails — no made-up citations, no
          off-topic detours.
        </p>

        <Button
          asChild
          size="lg"
          className="mt-9 rounded-full border-2 border-foreground text-base font-bold shadow-hard transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg"
        >
          <Link href="/chat">Start a conversation →</Link>
        </Button>
      </main>

      <footer className="border-t-2 border-foreground bg-card">
        <div className="mx-auto flex w-full max-w-content flex-col gap-2 px-6 py-8 sm:flex-row sm:items-center sm:justify-between md:px-9">
          <p className="text-sm font-semibold text-muted-foreground">
            PaleoDesk
          </p>
          <p className="text-sm text-muted-foreground">
            Next.js 16 · n8n agent · Supabase pgvector RAG
          </p>
        </div>
      </footer>
    </div>
  );
}
