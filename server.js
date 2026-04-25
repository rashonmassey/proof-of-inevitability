import express from 'express';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { createIncomingPayment, waitForPayment } from './payments.js';
import { recordCall, recordPayment, getMetrics } from './metrics.js';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Store in-progress results
const results = {};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Proof of Inevitability is running', wallet: process.env.WALLET_ADDRESS });
});

// MAIN ENDPOINT — pay to generate
app.post('/generate', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt required' });

  const requestId = Date.now().toString();
  results[requestId] = { status: 'pending' };

  try {
    // Create payment request
    const payment = await createIncomingPayment();
    results[requestId] = { status: 'awaiting_payment', paymentId: payment.id };

    // Return payment instructions immediately
    res.json({
      requestId,
      message: 'Payment required before execution',
      paymentId: payment.id,
      incomingPaymentUrl: payment.id,
      walletAddress: process.env.WALLET_ADDRESS,
      amount: '€0.05',
      instruction: 'Send payment to the incoming payment URL, then check /status/' + requestId
    });

    // Wait for payment in background
    const start = Date.now();
    await waitForPayment(payment.id);
    recordPayment();

    // Payment confirmed — now execute
    results[requestId] = { status: 'paid_executing' };

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300
    });

    const output = response.choices[0].message.content;
    recordCall(Date.now() - start);

    results[requestId] = { status: 'done', output };

  } catch (err) {
    console.error('Error:', err.message);
    results[requestId] = { status: 'error', message: err.message };
  }
});

// Status check endpoint
app.get('/status/:id', (req, res) => {
  const result = results[req.params.id];
  if (!result) return res.status(404).json({ status: 'not_found' });
  res.json(result);
});

// Metrics endpoint — this is your ILF proof
app.get('/metrics', (req, res) => {
  res.json(getMetrics());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Proof of Inevitability running on http://localhost:${PORT}`);
  console.log(`💳 Wallet: ${process.env.WALLET_ADDRESS}`);
  console.log(`📊 Metrics: http://localhost:${PORT}/metrics\n`);
});
