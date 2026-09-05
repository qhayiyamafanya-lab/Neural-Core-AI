const express = require('express');
const path = require('path');

const app = express();
app.use(express.json({ limit: '12mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-sonnet-5';

const ANALYSIS_SYSTEM = `You are the core analysis engine inside NEURALCORE AI, a chart-scanning trading assistant.
You analyze ONLY the uploaded chart screenshot. You must NEVER guess, invent price levels, or use information not visibly present in the image. If the image is unclear, cropped, missing price axis, or otherwise insufficient to complete an item, set "sufficient_info": false and explain why in "insufficient_reason".

Apply the HYBRID SMART MONEY + PRICE ACTION MODEL:
1. Market structure: HH/HL/LH/LL, Break of Structure (BOS), Change of Character (CHoCH), trend direction, or range/consolidation.
2. Liquidity: equal highs/lows, previous highs/lows, liquidity pools and sweeps.
3. Supply & demand zones.
4. Order blocks (bullish/bearish).
5. Fair value gaps (bullish/bearish).
6. Price action confirmation: rejection candles, engulfing candles, displacement candles, breakout / failed breakout. Absence of confirmation means the signal must be WAIT or NO TRADE.

A BUY signal requires: bullish structure + liquidity confirmation + demand/order-block/FVG location + price action confirmation + valid risk-reward.
A SELL signal requires the mirrored bearish conditions.
If any pillar is missing or unclear, the signal must be WAIT or NO TRADE — never fabricate a signal.

Score confidence out of these maximums and sum them: market_structure(20), liquidity(20), supply_demand(15), order_block(15), fvg(15), price_action(15). Total 0-100.

Respond with ONLY a single valid JSON object (no markdown fences, no commentary) matching exactly this schema:
{
 "sufficient_info": boolean,
 "insufficient_reason": string|null,
 "symbol": string|null,
 "timeframe": string|null,
 "signal": "BUY"|"SELL"|"WAIT"|"NO TRADE",
 "confidence": number,
 "confidence_breakdown": {"market_structure":number,"liquidity":number,"supply_demand":number,"order_block":number,"fvg":number,"price_action":number},
 "entry": number|null,
 "stop_loss": number|null,
 "trend": "bullish"|"bearish"|"ranging"|null,
 "structure_notes": string,
 "structure_annotations": [{"type":"HH"|"HL"|"LH"|"LL"|"BOS"|"CHoCH"|"RANGE","x":number,"y":number,"label":string}],
 "liquidity_notes": string,
 "liquidity_lines": [{"y":number,"x1":number,"x2":number,"type":"buy_side"|"sell_side","label":string}],
 "supply_demand_zones": [{"type":"demand"|"supply","x1":number,"y1":number,"x2":number,"y2":number,"label":string}],
 "order_blocks": [{"type":"bullish"|"bearish","x1":number,"y1":number,"x2":number,"y2":number,"label":string}],
 "fvg_zones": [{"type":"bullish"|"bearish","x1":number,"y1":number,"x2":number,"y2":number,"label":string}],
 "price_action_confirmed": boolean,
 "price_action_notes": string,
 "trade_plan": string
}
All x/x1/x2 values are horizontal position as a FRACTION of image width (0 = left edge, 1 = right edge). All y/y1/y2 values are vertical position as a FRACTION of image height (0 = top edge, 1 = bottom edge). "entry" and "stop_loss" are real prices read directly off the visible price axis — never invent a number that is not derivable from the chart. If price axis is not legible, set them to null and sufficient_info to false. Do not include a take_profit field — it is calculated separately at a fixed 3.2:1 risk-reward ratio by the application.`;

const CHAT_SYSTEM_PREFIX = `You are NEURAL ASSISTANT inside NEURALCORE AI. Answer questions about the trader's most recent chart analysis, provided below as JSON. Only use facts from this JSON — never invent price levels or chart details that aren't in it. Keep answers concise, professional, and educational. If there is no analysis yet, explain that a chart scan is needed first.\n\nANALYSIS JSON:\n`;

async function callAnthropic(body) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(body)
  });
  const data = await resp.json();
  if (!resp.ok) {
    const msg = (data && data.error && data.error.message) || `Anthropic API error (${resp.status})`;
    throw new Error(msg);
  }
  return (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
}

app.post('/api/analyze', async (req, res) => {
  try {
    if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'Server is missing the ANTHROPIC_API_KEY environment variable.' });
    const { mediaType, base64 } = req.body;
    if (!mediaType || !base64) return res.status(400).json({ error: 'Missing image data.' });
    const text = await callAnthropic({
      model: MODEL,
      max_tokens: 1500,
      system: ANALYSIS_SYSTEM,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
          { type: 'text', text: 'Analyze this trading chart screenshot per your system instructions. Respond with the JSON object only.' }
        ]
      }]
    });
    res.json({ text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'Server is missing the ANTHROPIC_API_KEY environment variable.' });
    const { context, messages } = req.body;
    if (!Array.isArray(messages)) return res.status(400).json({ error: 'Missing messages.' });
    const text = await callAnthropic({
      model: MODEL,
      max_tokens: 800,
      system: CHAT_SYSTEM_PREFIX + (context || 'No chart has been analyzed yet.'),
      messages
    });
    res.json({ text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Fallback to the SPA for any other route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`NeuralCore AI running on port ${PORT}`));
