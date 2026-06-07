# Paleo Agent RAG Corpus — Manifest

This folder is the knowledge base for the paleontology agent's RAG layer. It contains 20 clean, self-contained documents written for LLM ingestion (clear titles, headings, defined terms, short summaries, metadata headers — per Module 4 guidance). Each file has a YAML front-matter block with `title`, `category`, `source`, `source_url`, and `published`/age fields you can store as vector metadata.

Two categories:

- **discoveries/** — 15 recent major paleontology news stories (late 2025 – June 2026)
- **faq/** — 5 articles answering the most common paleontology questions

## Ingestion notes

- Chunk by character count (~1000 chars, ~100 overlap) per the course's simple pipeline.
- Embed with OpenAI `text-embedding-3-small`.
- Store chunk text + the front-matter fields (title, source_url, published) as metadata so the agent can cite sources and dates.
- Each file is already small and single-topic, which improves retrieval precision.

## discoveries/ (15)

1. `01-spinosaurus-mirabilis-sahara.md` — sabre-crested "hell heron" Spinosaurus, Niger (Science, Feb 2026)
2. `02-edmontosaurus-collagen-organic-molecules.md` — collagen in a 66M-yr dino bone, South Dakota (May 2026)
3. `03-nagatitan-thailand-largest-sauropod.md` — largest SE Asian dinosaur, Thailand (May 2026)
4. `04-nanotyrannus-distinct-species.md` — Nanotyrannus is its own species, not young T. rex (Nature, Nov 2025)
5. `05-tylosaurus-rex-mosasaur-texas.md` — giant new mosasaur "T. rex of the sea," Texas (May 2026)
6. `06-haolong-dongi-skin-spikes.md` — dinosaur with never-before-seen skin spikes, China (Feb 2026)
7. `07-microraptorine-glider-china.md` — 120M-yr gliding predator that hunted birds, NW China (Jun 2026)
8. `08-alnashetri-tiny-dinosaur-patagonia.md` — tiny bird-like dinosaur, Argentina (Feb 2026)
9. `09-brazil-giant-titanosaur.md` — new giant sauropod with Spanish ties, Brazil (Mar 2026)
10. `10-argentina-long-neck-evolution.md` — early sauropodomorph and neck evolution, Argentina (Feb 2026)
11. `11-istiorachis-sail-backed-isle-of-wight.md` — sail-backed dinosaur, Isle of Wight, UK (Aug 2025)
12. `12-labrujasuchus-witch-croc-new-mexico.md` — Triassic "witch croc," New Mexico (May 2026)
13. `13-prognathodon-cipactli-mosasaur-mexico.md` — powerful-jawed mosasaur, Mexico (Mar 2026)
14. `14-nanaimoteuthis-giant-vampyropod.md` — ~19 m octopus relative, Cretaceous Pacific (Apr 2026)
15. `15-morocco-hominin-homo-sapiens-root.md` — 773,000-yr hominin near root of H. sapiens, Morocco (Nature, Jan 2026)

## faq/ (5)

1. `01-why-did-dinosaurs-go-extinct.md`
2. `02-how-do-we-know-what-dinosaurs-looked-like.md`
3. `03-how-are-fossils-formed.md`
4. `04-how-do-scientists-date-fossils.md`
5. `05-are-birds-dinosaurs.md`

## Source quality note

Discovery files 1, 2, 4, 5, 6, 12, and 15 were written from full primary articles (university press offices, museums, ScienceDaily, peer-reviewed journals named in each file). Files 3, 7, 8, 9, 10, 11, 13, and 14 were written from reputable news summaries (BBC, CNN, NPR, Reuters, NBC, NHM, El País); details limited to what those sources reported. FAQ files reflect well-established consensus science (AMNH, UC Berkeley UCMP, NHM, USGS). Verify specifics against the linked `source_url` before relying on any single figure.
