const express = require("express");
const cors = require("cors");
const yahooFinance = require("yahoo-finance2").default;
const cron = require("node-cron");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;

app.use(cors());

// 🔹 Full Nifty 50 list
const STOCK_LIST = [
  "RELIANCE.NS", "INFY.NS", "TCS.NS", "HDFCBANK.NS", "ICICIBANK.NS",
  "KOTAKBANK.NS", "SBIN.NS", "AXISBANK.NS", "HINDUNILVR.NS", "ITC.NS",
  "LT.NS", "BAJFINANCE.NS", "ASIANPAINT.NS", "SUNPHARMA.NS", "WIPRO.NS",
  "TECHM.NS", "POWERGRID.NS", "TATAMOTORS.NS", "TATASTEEL.NS", "HCLTECH.NS",
  "ULTRACEMCO.NS", "NTPC.NS", "NESTLEIND.NS", "JSWSTEEL.NS", "BHARTIARTL.NS",
  "MARUTI.NS", "M&M.NS", "GRASIM.NS", "CIPLA.NS", "DRREDDY.NS", "BAJAJFINSV.NS",
  "HDFCLIFE.NS", "SBILIFE.NS", "ADANIENT.NS", "ADANIPORTS.NS", "COALINDIA.NS",
  "HINDALCO.NS", "HEROMOTOCO.NS", "EICHERMOT.NS", "APOLLOHOSP.NS", "TITAN.NS",
  "TRENT.NS", "BEL.NS", "JIOFIN.NS", "ONGC.NS", "DIVISLAB.NS", "INDUSINDBK.NS",
  "ADANIGREEN.NS", "HAVELLS.NS", "TATACONSUM.NS"
];

// 🔹 In-memory store
let STOCK_DATA = [];

// 🔹 Fetch stock data
async function fetchStock(symbol) {
  try {
    const quote = await yahooFinance.quote(symbol);
    return {
      symbol,
      ltp: quote.regularMarketPrice,
      change: quote.regularMarketChange,
      percentChange: quote.regularMarketChangePercent,
      open: quote.regularMarketOpen,
      high: quote.regularMarketDayHigh,
      low: quote.regularMarketDayLow,
      prevClose: quote.regularMarketPreviousClose,
      volume: quote.regularMarketVolume,
      marketCap: quote.marketCap
    };
  } catch (err) {
    console.error(`Error fetching ${symbol}:`, err.message);
    return { symbol, error: "Failed to fetch" };
  }
}

// 🔹 Update all stocks & push to clients
async function updateAllStocks() {
  const newData = await Promise.all(STOCK_LIST.map(fetchStock));

  // Only emit if changed
  if (JSON.stringify(newData) !== JSON.stringify(STOCK_DATA)) {
    STOCK_DATA = newData;
    io.emit("stocks-update", STOCK_DATA);
    console.log("✅ Stock data updated and pushed at", new Date().toLocaleTimeString());
  }
}

// 🔹 Cron job every 30s (or adjust)
cron.schedule("*/30 * * * * *", updateAllStocks);

// Initial load
updateAllStocks();

// 🔹 WebSocket connections
io.on("connection", (socket) => {
  console.log("⚡ Client connected:", socket.id);

  // Send latest data immediately
  socket.emit("stocks-update", STOCK_DATA);

  socket.on("disconnect", () => console.log("Client disconnected:", socket.id));
});

server.listen(PORT, () => {
  console.log(`✅ WebSocket server running at http://localhost:${PORT}`);
});
