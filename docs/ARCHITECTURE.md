# Architecture

How the payment gate works, end to end. Written so a working developer can read the code with it, and a thoughtful non-developer can follow the logic.

---

## The one-paragraph version

A client sends a prompt to `POST /generate`. The server creates an **incoming payment** on the Interledger test network via Open Payments, returns the payment URL to the client, and begins polling the payment's receive-amount in the background. The server does **not** execute the task yet. When a payment of €0.05 has cleared the URL (sent from a separate test wallet), the poll resolves, the metrics module logs the confirmation, and only then does the server execute the OpenAI call. The response is returned, and the metrics module logs the execution latency. The browser polls `/status/:id` every two seconds to surface each state transition to the user. All of this happens on the real Interledger test network with real GNAP-authorized API calls.

---

## The flow, step by step

```
┌────────┐       ┌────────────┐       ┌─────────────────┐       ┌────────────┐
│ Client │──1──▶ │ Server     │──2──▶ │ Open Payments    │       │ OpenAI     │
│        │       │ (Express)  │       │ (Interledger     │       │ (gpt-3.5)  │
│        │◀─3──  │            │       │  test network)   │       │            │
│        │       │            │       │                  │       │            │
│        │──4──▶ │            │◀─5──  │                  │       │            │
│        │       │            │──────6──(gate opens)────▶│       │            │
│        │       │            │───────────────7─────────────────▶│            │
│        │◀─8──  │            │◀─────────── response ──────────  │            │
└────────┘       └────────────┘       └─────────────────┘       └────────────┘

1. Client POSTs prompt → /generate
2. Server creates incoming payment on Interledger test network
3. Server returns payment URL + requestId to client; client starts polling /status
4. (Separate) User sends €0.05 from their test wallet to the payment URL
5. Server detects receivedAmount ≥ requiredAmount
6. Gate opens — recordPayment()
7. Server calls OpenAI with the original prompt
8. Server stores output, recordCall(latency), client's next poll receives output
```

---

## Key components

### `server.js` — the gate

Minimal Express app with four routes:

| Route | Method | Purpose |
|---|---|---|
| `/health` | GET | Liveness check; returns wallet address |
| `/generate` | POST | The paywall — creates a payment, waits, executes |
| `/status/:id` | GET | Client-poll endpoint for UI state |
| `/metrics` | GET | Public transaction log (the ILF proof artifact) |

The gate logic lives in `/generate`:

1. Receives `{ prompt }` in the body.
2. Assigns a `requestId = Date.now().toString()`.
3. Calls `createIncomingPayment()` → payment object from Open Payments.
4. Immediately returns `{ requestId, paymentId, incomingPaymentUrl, amount: '€0.05', instruction }` to the client. *The client now has everything it needs to pay.*
5. In the same async handler (background, post-response), awaits `waitForPayment(payment.id)`.
6. When that resolves, calls `recordPayment()` and then `openai.chat.completions.create(...)`.
7. Stores the output on the in-memory `results[requestId]` keyed object; `recordCall(latencyMs)` logs timing.

Results are held in memory only. For production, this is the first thing that would move to a database — but the research scope is proving the gate, not scaling persistence.

### `payments.js` — Open Payments integration

This file is the honest part of the demonstration. Every line here is a real call to the Interledger test network.

**Client initialization.** `createAuthenticatedClient()` from `@interledger/open-payments` is called with:
- `walletAddressUrl`: the full test wallet URL
- `privateKey`: read from the local `private.key` file
- `keyId`: the UUID that pairs the signing key to the wallet in Interledger's JWKS lookup
- `validateResponses: false`: **intentional**. The Interledger test network omits the `updatedAt` field that the SDK's OpenAPI spec marks as required. Rather than patch the SDK, we disable response-schema validation for test-net calls. Production would re-enable.

**GNAP access-token flow.** Before any incoming-payment call can be made, the server must obtain an access token via the [GNAP](https://datatracker.ietf.org/doc/draft-ietf-gnap-core-protocol/) grant flow. Each token is scoped to `{ type: 'incoming-payment', actions: ['create', 'read', 'complete'] }`. `getAccessToken()`:

1. Returns a cached token if `Date.now()` is before `tokenExpiresAt`.
2. Otherwise, calls `client.grant.request({ url: authServer }, ...)` with the access scope above.
3. Checks `isPendingGrant(grant)`. If the grant came back pending (i.e., the auth server expects interactive user approval), the server throws — this flow is strictly non-interactive. For Phase 1 on the test network, non-interactive grants are granted immediately.
4. Caches `grant.access_token.value` and computes `tokenExpiresAt = now + (expiresIn - 30) * 1000`. The 30-second buffer protects against edge-of-expiry races.

**Creating an incoming payment.** `createIncomingPayment()` constructs:
```js
{
  walletAddress: process.env.WALLET_ADDRESS,
  incomingAmount: {
    value: '5',                 // = €0.05 when assetScale is 2
    assetCode: wa.assetCode,    // resolved from the wallet metadata
    assetScale: wa.assetScale,  // ditto
  },
  expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()  // 10-minute expiry
}
```

The returned `payment.id` is both the unique identifier and the URL that pays must be sent to. This is how Open Payments resource URLs work — they're addressable, dereferenceable, and self-identifying.

**Polling for payment confirmation.** `waitForPayment(paymentId)` loops up to 150 times (5-minute ceiling) at 2-second intervals:

```js
const payment = await c.incomingPayment.get({ url: paymentId, accessToken });
const received = parseInt(payment.receivedAmount?.value || '0');
const required = parseInt(payment.incomingAmount?.value || '2');
if (received >= required) return true;
await sleep(2000);
```

No assumptions about payment path, sender wallet, or routing. Whoever sends the right amount to the right URL triggers the gate. This is the structural property that matters: **payment permission is universal, not bilateral.**

### `metrics.js` — the proof artifact

Fewer than 50 lines. Holds four counters (`totalRequests`, `totalPaymentsConfirmed`, `totalExecutions`, `totalLatencyMs`) and an append-only log of every event with ISO timestamps. Exposed via `/metrics`.

This endpoint is how the research demonstrates truth. It is the external, inspectable record that payments are happening and execution is being gated. If the counters at `/metrics` show `payments_confirmed = executions = N`, the proof is intact. If they diverge, the gate is broken and the project is failing its core claim.

### `public/index.html` — the visible layer

A single-file dark-mode UI (vanilla JS, no framework). Three responsibilities:
1. Collect the prompt and submit to `/generate`.
2. Display the returned payment URL prominently so the user can copy it to their test wallet.
3. Poll `/status/:id` every 2 seconds and surface state transitions: `awaiting_payment` → `paid_executing` → `done`. Refresh live metrics every 10 seconds.

Deliberately minimal visual language. This is a demo of infrastructure, not a product UI.

---

## Why Open Payments and not x402 / AP2 / ACP

A common question for this project: in 2025–2026, several machine-payment protocols emerged (x402 from Coinbase, AP2 / Agent Payments Protocol from Google, ACP / Agent Commerce Protocol from Mastercard). Why is this project building on Open Payments?

**x402, AP2, and ACP are signaling protocols. They tell a server that payment is required. They do not settle value.** x402's own specification explicitly names Interledger STREAM as one of its valid settlement options. AP2 and ACP are coordination standards that ride on underlying rails — cards, stablecoins, or yes, Interledger.

Open Payments is the **settlement execution layer**. It moves value across ledgers, in any currency, with no requirement that both sides share a chain or a card network. It is the rail.

The distinction matters for the Interledger Foundation's mission. x402's default settlement is USDC on Base — crypto-native, dollar-denominated, Ethereum L2 specific. That's a reasonable rail for developer agents in the US. It is the wrong rail for a creator in Ghana with a mobile-money wallet, or for the 1.7 billion adults without a bank account. Open Payments does not presuppose which ledger, which currency, or which country you're on. **That's the access property the Interledger ecosystem prioritizes.**

If x402 wins the US-crypto-agent market, Open Payments still wins the settlement layer beneath it — because x402 already names Open Payments as a supported settlement option. The signaling protocols will converge upward. The rails are decided at the bottom.

This project bets on the rail.

---

## What this architecture is deliberately not

- **Not a production payments platform.** This is a research demonstration. The scope is proving the gate works. Productionization (real merchant flows, refund logic, fraud detection, regulatory scaffolding) happens in a separate commercial product, Aiyo, not in this research repository.
- **Not a wallet.** Users bring their own test wallet. The server holds only the receive-side wallet.
- **Not a payment router.** The server does not concern itself with how the payment finds its way across Interledger. That's the protocol's job.
- **Not yet persistent.** Request state lives in memory. Crash recovery, distributed state, and database-backed logs are Phase 2+ work when multi-step flows make persistence necessary.

---

## For reviewers and contributors

If you want to read the code directly:

1. Start with `server.js`. It's 90 lines and the entire control flow is visible.
2. Then read `payments.js`. This is where the Open Payments integration lives.
3. Skim `metrics.js` and `public/index.html` — both are thin and mostly self-explanatory.

If something is unclear or you spot a correction, [open an issue](https://github.com/rashonmassey/proof-of-inevitability/issues) or a pull request. The project is intentionally small enough to be read end-to-end in one sitting.
