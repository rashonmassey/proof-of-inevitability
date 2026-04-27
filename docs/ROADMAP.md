# Roadmap

The twelve-month research plan. Five phases. Public progress notes posted monthly.

Phase 1 is complete and documented in [`PHASE_1_CASE_STUDY.md`](./PHASE_1_CASE_STUDY.md).

This document covers Phases 2 through 5 at a high level. Specific success thresholds and detailed scope evolve with each phase as the research informs them; we will publish them when each phase opens, not before.

---

## Status summary

| Phase | Topic | Status | Target window |
|---|---|---|---|
| **Phase 1** | Pay-per-execution gateway | ✅ Complete (April 2026) | Months 1–3 |
| **Phase 2** | Multi-step agent flows | 🟡 Design | Months 4–5 |
| **Phase 3** | Competing services + dynamic routing | ⚪ Planned | Months 6–7 |
| **Phase 4** | Creator micro-settlement | ⚪ Planned | Months 8–9 |
| **Phase 5** | Open-source documentation + demo video | ⚪ Planned | Months 10–12 |

---

## Phase 2 — Multi-step agent flows with per-step payment

**Research question:** Can an autonomous agent execute a multi-step task where every step is independently gated by a real Open Payments settlement, with total payment latency low enough to be operationally viable?

**Scope:** Extend the Phase 1 gate into a sequence. An agent performs task A, pays, performs task B, pays, performs task C, pays. Each step is a separate incoming payment on the test network. The agent holds state across steps. If any payment fails, the chain halts gracefully.

**Why this matters:** Phase 1 proved a single payment can gate a single execution. Phase 2 proves the same gate can sit inside a longer-running, agentic workflow without breaking the pace of the work — the moment payment becomes invisible inside an agent's loop.

**Deliverables:** Running service on the test network. Publicly inspectable metrics. Plain-language write-up.

---

## Phase 3 — Competing services and dynamic routing

**Research question:** Given two or more Open Payments-enabled service providers, can an agent programmatically route each purchase to the provider that best matches a cost or speed constraint supplied at request time?

**Scope:** Two or more API services, each with their own Open Payments wallet, each advertising a price and median latency. An agent ingests a request, queries available providers, selects based on constraint, pays the selected provider, receives the service.

**Why this matters:** Phase 2 proved an agent can pay. Phase 3 proves an agent can choose. Choice is where market dynamics enter the machine economy. Until agents are routing based on real-time constraints across real payment rails, there is no marketplace — only a set of bilateral arrangements.

**Deliverables:** Two provider services with published prices and wallets. An agent harness running routed transactions. Case study on what competition looks like when the buyer is a machine.

---

## Phase 4 — Creator micro-settlement (the access phase)

**Research question:** Can a real creator-brand audience operating outside the developer world receive live micro-settlements via Open Payments at consumer-grade speed?

**Scope:** Connect the pipeline built in Phases 2 and 3 to a real creator. The initial named creator is **[MICOPEIA](https://micopeia.com)** — my botanical wellness brand with a six-figure social audience. MICOPEIA becomes the first creator merchant on the stack.

**Why MICOPEIA specifically:** Because the thesis says this infrastructure has to reach beyond the developer world, and the proof is an actual creator-brand running on it. If MICOPEIA can operate on Open Payments, the playbook travels to any creator with any audience.

**Stretch:** A second creator outside my own businesses — ideally a creator in the African diaspora or an emerging market where card rails fail.

**Deliverables:** Live merchant integration on MICOPEIA's storefront. Public receipts. Case study from the creator's perspective.

---

## Phase 5 — Documentation, demo video, open-source package

**Purpose:** Land the twelve months of work as a public, accessible, reusable artifact that a developer can pick up and run, and a non-developer can understand without translation.

**Deliverables:**

- A short demo video showing Phases 1 through 4 live, with the through-line: payment is the permission, and the permission is now available
- An expanded open-source repository with code, architecture documentation, and reference use cases
- A findings report written for the Interledger community and published under CC-BY-4.0
- A plain-language educational resource for non-developer audiences, syndicated to MICOPEIA's social channels
- A community presentation with Q&A

---

## Commercial application

A separate commercial application called **Aiyo** is being developed in parallel on the same Open Payments primitives. Aiyo is a closed-source product; its progress is reported here only in summary form when it becomes relevant to the research output. The architectural primitives explored in this repository — the payment gate, the GNAP flow, the metrics pattern — remain open under MIT and CC-BY-4.0 for the ecosystem's benefit.

---

## Cadence

Public progress is published monthly via:

1. A progress post on [micopeia.substack.com](https://micopeia.substack.com) — long-form, plain language
2. An engineering note in this repository (`/progress/`) with commits, metrics, and technical detail
3. A short video on Instagram and TikTok showing one concrete piece of progress

---

## How to follow along

- **Substack:** [micopeia.substack.com](https://micopeia.substack.com)
- **Instagram / TikTok:** [@micopeia](https://instagram.com/micopeia)
- **This repo:** watch / star for releases
- **Personal site:** [rashonmassey.com](https://rashonmassey.com)
