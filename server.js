const express = require("express");
const axios = require("axios");
const cron = require("node-cron");
const dotenv = require("dotenv");
const twilio = require("twilio");

dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;

const client = twilio(process.env.ACCOUNT_SID, process.env.AUTH_TOKEN);

let lastPrice = null;

// Fetch Solana price
async function fetchSOLPrice() {
  try {
    const res = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
    );
    return res.data.solana.usd;
  } catch (err) {
    console.error("Error fetching price:", err.message);
    return null;
  }
}

// Send WhatsApp message
async function sendWhatsAppMessage(msg) {
  try {
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP,
      to: process.env.MY_WHATSAPP,
      body: msg,
    });
    const time = new Date().toLocaleTimeString();
    console.log(`Message sent at ${time}`);
    } catch (error) {
    console.error("Error sending WhatsApp:", error.message);
  }
}

// Check Solana price periodically
async function checkPrice() {
  const currentPrice = await fetchSOLPrice();
  if (!currentPrice) return;

  if (lastPrice === null) {
    lastPrice = currentPrice;
    console.log(`Initial SOL price set: $${currentPrice}`);
    return;
  }

  const diffPercent = ((currentPrice - lastPrice) / lastPrice) * 100;
  const direction = diffPercent >= 0 ? "📈 RISE" : "📉 DROP";

  const msg = `Solana Hourly Update (${direction})
💰 Current Price: *$${currentPrice.toFixed(2)}*
📊 Change: *${diffPercent.toFixed(2)}%* since last hour`;

  await sendWhatsAppMessage(msg);
  lastPrice = currentPrice;
}

// Send message on server start
async function sendStartupMessage() {
  const price = await fetchSOLPrice();
  if (!price) {
    console.warn("Startup message skipped (could not fetch price)");
    return;
  }
  const msg = `Server Started Successfully
💰 Current Solana Price: *$${price.toFixed(2)}*`;
  await sendWhatsAppMessage(msg);
  lastPrice = price;
  console.log("Startup message sent");
}

// Schedule job
cron.schedule("0 * * * *", checkPrice);

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Cron job scheduled: Every minute (for testing)");
  await sendStartupMessage();
});
