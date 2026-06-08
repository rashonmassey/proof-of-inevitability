# Proof of Inevitability

**Phase 1 of an Interledger Protocol research project (2026–2027).**
**Built by [Rashon A. Massey](https://rashonmassey.com) in directed collaboration with Claude Code.**

> Software cannot execute until it pays.
> No subscription. No batch billing. No credit-card middleman.
> **Payment is the permission.**

---

## What this repo is

A working server that demonstrates the simplest possible version of a pay-per-execution gate built on [Open Payments](https://openpayments.dev) and the [Interledger Protocol](https://interledger.org).

The flow is three steps:

1. A client sends a prompt to the server.
2. The server creates a real Open Payments incoming payment request and returns the address. **The AI does not run.** The server waits.
3. The client sends a real micropayment (€0.05) to the address from a separate Interledger test wallet. The server detects the payment within ~2 seconds, runs the OpenAI call, and returns the answer.

There is no path through the code that bypasses the payment. The execution line lives strictly after `recordPayment()` resolves. Read [`server.js`](./server.js) and follow it yourself — the gate is 93 lines.

---

## Why this exists

Credit-card rails were designed in 1958, for humans, for one transaction at a time, with chargebacks that reverse up to sixty days later. They are beautiful for their time — and structurally wrong for the next decade of software, which will be:

- AI agents making thousands of API calls on a user's behalf
- Devices and machines transacting with other devices and machines
- Creators in regions where Stripe/PayPal don't operate, waiting 30–60 days for platforms to release money they earned yesterday

Open Payments is the protocol for moving value the way the internet moves data — instantly, directly, wallet-to-wallet, across any ledger or currency, with final settlement and no card-network middleman. **Phase 1 of this project is a public, indisputable proof that this rail works, today, on real test infrastructure, gating a real piece of software a credit card cannot unlock.**

The full five-phase plan lives in [docs/ROADMAP.md](./docs/ROADMAP.md).

---

## The five pressure zones

Phase 1 demonstrates the simplest case. The interesting future cases — the ones where Open Payments is structurally the only rail that works — fall into five pressure zones:

1. **AI per-request billing** — pay-per-prompt, pay-per-token, pay-per-tool-call
2. **API economy pay-per-call** — micro-priced API access without a subscription contract
3. **Data monetization** — pay-as-you-read for datasets, research, and proprietary content
4. **Machine-to-machine / IoT settlement** — devices paying other devices on the second
5. **Creator micro-settlement** — sub-second, sub-dollar, cross-border payouts to creators worldwide

Each subsequent phase of this research tightens the grip on a different zone. See [ROADMAP](./docs/ROADMAP.md) for direction.

---

## Quick start

### 1. Install
```bash
npm install
```

### 2. Configure
Copy the template and fill in your values:
```bash
cp .env.example .env
```

You will need:
- An [Interledger test wallet](https://wallet.interledger-test.dev) (free, no KYC)
- The wallet's Key ID and a private key file at `./private.key`
- An [OpenAI API key](https://platform.openai.com)

### 3. Run
```bash
npm start
```
Open [http://localhost:3000](http://localhost:3000).

---

## Running your first paid execution

1. Open [http://localhost:3000](http://localhost:3000) in one browser window.
2. Open a second Interledger test wallet at [wallet.interledger-test.dev](https://wallet.interledger-test.dev) in another window.
3. Type any prompt into the demo and click **Pay & Execute**.
4. The UI will display an Open Payments incoming-payment URL.
5. From your second wallet, send €0.05 to that URL.
6. Within ~2 seconds, the server detects the settlement, OpenAI runs, and the answer appears.
7. Visit [http://localhost:3000/metrics](http://localhost:3000/metrics) to see the running totals — confirmations, executions, average latency, full log.

If you don't pay, nothing runs. That is the entire claim.

---

## Project structure

```
proof-of-inevitability/
├── server.js                  — Express server + payment gate (93 lines)
├── payments.js                — Open Payments / GNAP integration (123 lines)
├── metrics.js                 — In-memory proof log (42 lines)
├── package.json               — Dependencies
├── .env.example               — Environment template (real .env is gitignored)
├── public/
│   └── index.html             — Vanilla-JS demo UI
├── utils/
│   └── sleep.js               — Utility
└── docs/
    ├── ARCHITECTURE.md        — Technical deep-dive
    ├── PHASE_1_CASE_STUDY.md  — How Phase 1 got built (collaboration model + bug stories)
    ├── PHASE_2_CASE_STUDY.md  — Phase 2 complete: two-layer measurement + multi-step agent chain
    └── ROADMAP.md             — Phases 2–5 with thresholds
```

---

## Dependencies

- [`@interledger/open-payments`](https://www.npmjs.com/package/@interledger/open-payments) `^6.0.0` — official SDK
- [`express`](https://www.npmjs.com/package/express) `^4.18.2`
- [`openai`](https://www.npmjs.com/package/openai) `^4.0.0`
- [`dotenv`](https://www.npmjs.com/package/dotenv) `^16.4.5`

Node.js 18 or higher. ES modules (`type: "module"`).

---

## Research context

This repository is Phase 1 of a five-phase research project running 2026–2027. The full body of work tightens from this single-step proof to multi-step agent flows (Phase 2), demonstrable price/latency routing across competing services (Phase 3), live creator micro-settlement using my own brand [MICOPEIA](https://micopeia.com) as the named pilot (Phase 4), and an open-source documentation package (Phase 5).

A separate commercial application called **Aiyo** is being developed in parallel on the same Open Payments primitives. The architectural primitives explored in this research repository remain open-source for the ecosystem's benefit; the commercial product is a separate effort.

*Note on the brand: the commercial product evolved through working titles (AgentPay, Spool) before locking on **Aiyo** in April 2026. The repository reflects the current brand. The research thesis and architecture are unchanged.*

---

## AI policy disclosure

This project was built in directed collaboration with Anthropic's Claude Code. The architectural decisions, the product framing, the directorial calls during debugging, and the writing in these docs are mine. The line-level code was generated by Claude under that direction. The collaboration model is itself a research output — see [PHASE_1_CASE_STUDY.md](./docs/PHASE_1_CASE_STUDY.md) for the full account, including the three bugs that required real human judgment.

I make this disclosure because the research is about advancing open infrastructure for everyone — including non-traditional builders who have the judgment and vision but haven't spent a decade in a code editor. Documenting this collaboration honestly is part of the work.

---

## Contributing

Issues and pull requests are welcome — especially corrections to anything inaccurate in the docs. See [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## Contact

- Author: [Rashon A. Massey](https://rashonmassey.com) — [rashon@micopeia.com](mailto:rashon@micopeia.com)
- Brand: [MICOPEIA](https://micopeia.com)
- Newsletter: [micopeia.substack.com](https://micopeia.substack.com)
- Two-time [Interledger Foundation](https://interledger.org) grantee. Building on the Interledger Protocol and Open Payments.

---

## Case studies

Each phase produces a public case study documenting the work, the methodology, and the honest findings. New case studies are appended here as they complete.

| Phase | Status | Document |
|-------|--------|----------|
| Phase 1 — pay-per-execution gate (single step) | ✅ Complete (Apr 2026) | [PHASE_1_CASE_STUDY.md](./docs/PHASE_1_CASE_STUDY.md) |
| Phase 2 — two-layer measurement + multi-step agent chain | ✅ Complete (May 2026) | [PHASE_2_CASE_STUDY.md](./docs/PHASE_2_CASE_STUDY.md) |
| Phase 3 — competing services + dynamic routing | 🛠 Infrastructure-ready, gated on second hosted Open Payments wallet | *coming* |
| Phase 4 — creator micro-settlement (MICOPEIA live) | ⏳ Built end-to-end; gated on hosted production wallet availability | *coming* |
| Phase 5 — open-source documentation package | ⏳ Continuous | *in progress* |

The case studies are append-only research records, not marketing material. Each documents what was tried, what worked, what didn't, and what was decided by whom.

---

## License

Code is released under the [MIT License](./LICENSE). Documentation in `/docs` is released under [CC BY 4.0](./LICENSE-CC-BY-4.0) ([summary](https://creativecommons.org/licenses/by/4.0/)).

---

*Phase 1 shipped: April 2026. Phase 2 shipped: May 2026. Updates posted at [micopeia.substack.com](https://micopeia.substack.com).*
