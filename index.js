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

let STOCK_DATA = [];

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

async function updateAllStocks() {
  const newData = await Promise.all(STOCK_LIST.map(fetchStock));

  if (JSON.stringify(newData) !== JSON.stringify(STOCK_DATA)) {
    STOCK_DATA = newData;
    io.emit("stocks-update", STOCK_DATA);
    console.log("Stock data updated and pushed at", new Date().toLocaleTimeString());
  }
}

cron.schedule("*/7 * * * * *", updateAllStocks);

updateAllStocks();

io.on("connection", (socket) => {
  socket.emit("stocks-update", STOCK_DATA);
  socket.on("disconnect", () => console.log("Client disconnected:", socket.id));
});

server.listen(PORT, () => {
  console.log(`✅ WebSocket server running at http://localhost:${PORT}`);
});
