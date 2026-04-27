# Phase 1 Case Study

*How a non-developer and an AI pair shipped a working pay-per-execution gate on Open Payments in one focused build cycle. Written in the first person.*

— **Rashon A. Massey**, April 2026

---

## Genesis

The question that became this project arrived on an ordinary Thursday. I was updating subscription tiers on a Shopify store and thinking about how clumsy the whole idea of "subscription" is in 2026. Subscriptions are a human workaround — a way to approximate what you'd actually want, which is to pay for exactly what you use, exactly when you use it. Subscriptions exist because card rails can't do that.

I asked myself: *what if payment could become a prerequisite for digital action?*

Not "payment happens eventually and then the service runs." Not "payment is batched and reconciled later." But: **the software cannot proceed until the payment is confirmed.** Payment is not billing. Payment is permission.

That question got me to Open Payments. It got me to the Interledger Foundation. And it got me to the thesis of this project: the current machine economy — AI agents, autonomous systems, sub-cent API calls — is hitting the walls of rails that were never designed for it, and Open Payments is the rail that was.

But a thesis is not a proof. I needed to build it.

---

## The collaboration model

I am not a traditional developer. I am a brand founder, a community herbalist, a board member, and a writer. I have been two-time ILF grantee and one-time ILF program judge. I have fifteen years at the intersection of technology, creative communities, and underserved populations. I have never written a production Node.js application end-to-end.

I wrote this one — with Claude Code.

The collaboration model I used, which became a documented research output of its own, is this:

- **I direct.** Every architectural decision, every scope call, every judgment about what a working proof needs to prove — those are mine.
- **I narrate.** Every step of the build gets documented in plain language for the community I'm accountable to.
- **Claude Code writes the code.** Under my direction. Debugging in concert with me. Reading SDK source when I ask it to.

This is not different from how a CTO works with a senior engineer. A CTO sets the target, scopes the problem, reviews the approach, makes the ship-or-debug call, owns the outcome. That is exactly what I did. The engineer happened to be AI.

I want to be precise about one thing: this framing is not a rhetorical cover for "AI did it and I took credit." I did the work, and the evidence is below — three bugs that required me to make specific, non-obvious calls before the system shipped. If you read the bugs and disagree that those were directorial judgments, you are welcome to say so. The project is public on purpose.

The Interledger Foundation's [AI Policy](https://interledger.org) explicitly permits this kind of collaboration when it is transparent, accountable, and in service of original thinking. This project meets all three conditions.

---

## What I was trying to prove

One claim, structured for falsifiability:

> On real Open Payments infrastructure, a server can accept a request, require payment in real time, refuse to execute until payment is confirmed on the Interledger network, and then execute — with every step observable to anyone who runs the code.

Four testable sub-claims:

1. An incoming payment can be **created programmatically** using the official SDK.
2. A payment from a separate wallet can be **received and detected** on the test network.
3. Execution can be **gated** — meaning the code path that runs the task is unreachable without a confirmed payment.
4. Every step can be **logged** to a public metrics endpoint that serves as an external record.

If any one of those four fails, the thesis fails. If all four work, the substrate for Phases 2 through 5 exists.

All four work. The receipts are in this document.

---

## The three bugs that shaped the build

The honest part of any technical case study is the bugs. These are the three that took real work to solve — bugs where the documentation and the runtime disagreed, and where I had to make the call about what to do.

### Bug 1 — "Invalid URL" on payment creation

**Symptom:** The first attempt to call `client.incomingPayment.create(...)` threw an `Invalid URL` error immediately, before any network call was made.

**Initial hypothesis:** My wallet address was malformed.

**What was actually wrong:** The SDK's `create` method signature expects the first argument to be `{ url: <resourceServer> }` — the *resource server URL*, not the wallet address URL. I had been passing `{ walletAddress: <walletAddressUrl> }`, which matched the SDK's documentation but not its runtime schema.

**How I found it:** I asked Claude to stop reading the docs and read the SDK source directly. I had watched enough debug sessions fail when docs and runtime disagreed to know that when a one-line call blows up with a structural error, the source is the truth and the docs are the hypothesis.

**Fix:** Change `{ walletAddress }` to `{ url: wa.resourceServer }`. One line. Five minutes once the right question was asked.

**The directorial call:** "Read the SDK source, not the docs." That's a judgment. A less experienced debugger would have spent two days in the docs.

### Bug 2 — 401 Unauthorized on every test-network call

**Symptom:** Authenticated client initialized without error. The first incoming-payment call returned `401 Unauthorized`.

**Initial hypothesis:** My private key was bad, or my key ID was wrong.

**What was actually wrong:** Authentication for writes to the Interledger test network requires **both** an HTTP-signature-based client auth (which the SDK handles automatically) **and** a GNAP access token scoped to the specific resource (`incoming-payment` with actions `create, read, complete`). I had the first and was missing the second.

**How I found it:** Read the Open Payments specification carefully, then cross-referenced against the SDK's `grant.request` API. The docs don't make it obvious that the test network's resource server rejects unauthenticated writes even when the HTTP signature checks out — the test-network behavior is more strict than the spec suggests.

**Fix:** Implement the full non-interactive GNAP flow — request a grant with the correct access scope, cache the returned token with an expiry buffer, and pass it as `accessToken` on every subsequent write. `getAccessToken()` in `payments.js` is the result.

**The directorial call:** "Don't paper over this with a hack. Do the full GNAP flow properly, because Phases 2 through 5 will need it." That's scoping judgment. The temptation in a solo debug session is to do just enough to move on. The call here was to spend an extra hour and build the thing properly the first time.

### Bug 3 — Schema validation error on every response

**Symptom:** With authentication working, incoming-payment creation returned `200 OK` from the server but the SDK threw a validation error before returning control to my code.

**Initial hypothesis:** Something was wrong with my payload.

**What was actually wrong:** The Interledger test network's response omits the `updatedAt` timestamp field that the SDK's OpenAPI specification marks as required. The server is returning valid Open Payments resources; the SDK's client-side schema validation is stricter than the server.

**How I found it:** Matched the error message against the SDK's compiled OpenAPI validator output. It named the specific field. I checked the actual HTTP response body (via network inspector) and confirmed the field was simply absent.

**Fix:** Pass `validateResponses: false` when constructing the authenticated client. For Phase 1 on the test network, this is a defensible trade-off — we trust the server's responses and skip the client-side schema check. For production, this would be re-enabled; the resolution path there is either an SDK update or a server update to include the missing field.

**The directorial call:** "Ship the disable flag and document it as a known test-net asymmetry. Do not file a bug against the SDK until you've verified the test-network server's behavior is the anomaly, not the spec's." That call is a spending call — it prioritized shipping Phase 1 over a two-week ecosystem side quest.

Each of these three bugs was a place where the right call, made quickly, saved days. That is what directorial judgment does. The code Claude wrote was excellent. The decisions about what to build, when to escalate, and where to compromise were mine.

---

## The minimum payment amount — and why it matters

A fourth sub-story that didn't become a bug but taught me something.

My first working payment request was for `value: '2'` with `assetScale: 3` — that is, €0.002, or two-tenths of a cent. I chose the amount because the project's thesis is about sub-cent payments. Surely the smallest possible amount would be the most convincing demo.

It didn't work. Payments to the incoming-payment URL were being rejected by the test wallet with a minimum-amount error that wasn't exposed to my server code.

The test wallet's minimum payment threshold, it turned out, is higher than €0.002 in the current test network configuration. After testing several values, I landed at **€0.05** — `value: '5'` with `assetScale: 2` — which clears the minimum comfortably and completes the full payment cycle.

What I learned: the sub-cent claim is a Phase 2 claim, not a Phase 1 claim. Phase 1's job is to prove the gate works at *any* price. The economics of sub-cent settlement — which truly is one of Open Payments' structural advantages over card rails — gets demonstrated in Phase 2 when agent flows start hitting many small payments in sequence.

I do not hide this in the code. The constant `'5'` is in `payments.js` and commented as €0.05. The day we can demo €0.002 end-to-end, we will. That day will be Phase 2.

---

## First successful payment — the receipts

Server console output from the first end-to-end run (timestamps edited to times of day for readability):

```
🚀 Proof of Inevitability running on http://localhost:3000
💳 Wallet: https://ilp.interledger-test.dev/ac652f73
📊 Metrics: http://localhost:3000/metrics

10:14:22  [payments] Resource server: https://ilp.interledger-test.dev
10:14:22  [payments] Auth server:     https://auth.interledger-test.dev
10:14:22  [payments] Requesting non-interactive grant from auth server...
10:14:23  [payments] Access token granted (expires in 600s)
10:14:23  💳 Payment request created: https://ilp.interledger-test.dev/incoming-payments/...
10:14:23  ⏳ Waiting for payment...
10:14:25     Received: 0 / 5
10:14:27     Received: 0 / 5
10:14:29     Received: 0 / 5
          [← user sends €0.05 from test wallet here ↓]
10:14:31     Received: 5 / 5
10:14:31  ✅ Payment confirmed!
```

Between the `Payment request created` line and the `✅ Payment confirmed` line, **nothing in my code could have executed GPT-3.5**. The `await waitForPayment(payment.id)` was blocking the async handler. The OpenAI call comes on the line *after* `recordPayment()`.

The metrics endpoint at that moment:

```json
{
  "totalRequests": 1,
  "totalPaymentsConfirmed": 1,
  "totalExecutions": 1,
  "averageLatencyMs": 9438,
  "summary": "1 real-time payments gated 1 executions",
  "log": [
    { "timestamp": "...", "type": "payment_confirmed" },
    { "timestamp": "...", "type": "execution", "latencyMs": 9438 }
  ]
}
```

One payment, confirmed. One execution, gated. `totalPaymentsConfirmed === totalExecutions`. The gate held.

This was the moment Phase 1 stopped being a hypothesis and started being evidence.

---

## What Phase 1 proves

Against the four sub-claims:

1. **Create payments programmatically:** ✅ Confirmed — `createIncomingPayment()` in `payments.js`, called once per request, returns a real test-network resource.
2. **Receive and detect payments:** ✅ Confirmed — `waitForPayment()` polls every 2 seconds, detects the amount within ~4 seconds of actual payment arrival.
3. **Gate execution:** ✅ Confirmed — OpenAI call sits behind the `await`, structurally unreachable until the poll resolves.
4. **Log every step:** ✅ Confirmed — `/metrics` endpoint exposes counters and timestamped event log to anyone who can hit the URL.

The core claim is proven.

---

## What this tells us about Phases 2–5

Phase 1 proved the substrate. Phases 2 through 5 extend it along three axes:

- **Volume:** 100+ transactions in Phase 2, moving from single-call proof to multi-step agent flows.
- **Choice:** Phase 3 introduces two or more Open Payments-enabled merchants and demonstrates agent-side routing based on price/speed.
- **Access:** Phase 4 extends the system to a real creator (MICOPEIA) receiving live micro-settlements — closing the loop between machine economy and human financial access.

See [`ROADMAP.md`](./ROADMAP.md) for the full phase plan with success thresholds.

---

## What this tells us about AI-directed infrastructure work

One note for the Interledger community. The collaboration model used to build this project — human direction, AI execution, continuous documentation — produced working infrastructure in a tight build cycle. It did so while exposing every decision publicly, with an audit trail anyone can review at any time.

I believe more projects like this, led by non-traditional builders, can ship in the Open Payments ecosystem if the collaboration model is documented and respected. I am not claiming AI replaces engineering leadership. I am claiming that engineering leadership — the calls about what to build, when to compromise, and what to hold the line on — is a skill that exists independent of typing code, and that people who bring it to this mission shouldn't need to apprentice as developers first.

The evidence for that claim is in the three bug stories above. The decisions were mine. The code was generated under my direction. The outcome is shippable. If that's a methodology the community wants more of, I'm committed to documenting it over the next twelve months.

---

*Questions, critiques, and corrections are welcome. Open an issue or email me directly.*
