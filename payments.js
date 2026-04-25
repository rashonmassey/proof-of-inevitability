import { createAuthenticatedClient, isPendingGrant } from '@interledger/open-payments';
import { readFileSync } from 'fs';
import { sleep } from './utils/sleep.js';
import dotenv from 'dotenv';
dotenv.config();

let client;
let walletAddressCache = null;
let cachedToken = null;
let tokenExpiresAt = 0;

async function getClient() {
  if (!client) {
    client = await createAuthenticatedClient({
      walletAddressUrl: process.env.WALLET_ADDRESS,
      privateKey: readFileSync(process.env.PRIVATE_KEY_PATH).toString(),
      keyId: process.env.KEY_ID,
      validateResponses: false  // test network omits 'updatedAt', skip schema validation
    });
  }
  return client;
}

async function getWalletAddress() {
  if (!walletAddressCache) {
    const c = await getClient();
    walletAddressCache = await c.walletAddress.get({ url: process.env.WALLET_ADDRESS });
    console.log('[payments] Resource server:', walletAddressCache.resourceServer);
    console.log('[payments] Auth server:    ', walletAddressCache.authServer);
  }
  return walletAddressCache;
}

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt) {
    return cachedToken;
  }

  const c = await getClient();
  const wa = await getWalletAddress();

  console.log('[payments] Requesting non-interactive grant from auth server...');
  const grant = await c.grant.request(
    { url: wa.authServer },
    {
      access_token: {
        access: [
          {
            type: 'incoming-payment',
            actions: ['create', 'read', 'complete']
          }
        ]
      }
    }
  );

  if (isPendingGrant(grant)) {
    throw new Error(
      'Received an interactive grant response — expected non-interactive. ' +
      'The auth server requires user approval, which is not supported in this flow.'
    );
  }

  cachedToken = grant.access_token.value;
  const expiresIn = grant.access_token.expires_in ?? 600;
  tokenExpiresAt = now + (expiresIn - 30) * 1000;
  console.log(`[payments] Access token granted (expires in ${expiresIn}s)`);
  return cachedToken;
}

// Create a new incoming payment request
export async function createIncomingPayment() {
  const c = await getClient();
  const wa = await getWalletAddress();
  const accessToken = await getAccessToken();

  const payment = await c.incomingPayment.create(
    { url: wa.resourceServer, accessToken },
    {
      walletAddress: process.env.WALLET_ADDRESS,
      incomingAmount: {
        value: '5',        // = €0.05 (assetScale 2)
        assetCode: wa.assetCode,
        assetScale: wa.assetScale
      },
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    }
  );

  console.log(`💳 Payment request created: ${payment.id}`);
  return payment;
}

// Poll until payment is received
export async function waitForPayment(paymentId) {
  const c = await getClient();
  const accessToken = await getAccessToken();
  let attempts = 0;
  const maxAttempts = 150; // 5 minutes max

  console.log('⏳ Waiting for payment...');

  while (attempts < maxAttempts) {
    const payment = await c.incomingPayment.get({ url: paymentId, accessToken });

    const received = parseInt(payment.receivedAmount?.value || '0');
    const required = parseInt(payment.incomingAmount?.value || '2');

    console.log(`   Received: ${received} / ${required}`);

    if (received >= required) {
      console.log('✅ Payment confirmed!');
      return true;
    }

    await sleep(2000);
    attempts++;
  }

  throw new Error('Payment timeout — no payment received within 5 minutes');
}
