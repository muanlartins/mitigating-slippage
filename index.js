const bitstamp = new WebSocket("wss://ws.bitstamp.net/");

bitstamp.onopen = () => {
  const data = {
    event: "bts:subscribe",
    data: {
      channel: "order_book_btcusd",
    },
  };

  bitstamp.send(JSON.stringify(data));
};

const body = document.querySelector("body");
const dateElement = document.querySelector("#date");
const bidsElement = document.querySelector("#bids");
const asksElement = document.querySelector("#asks");
const buyElement = document.querySelector("#buy");
const sellElement = document.querySelector("#sell");
const buyPricesElement = document.querySelector("#buy-prices");
const sellPricesElement = document.querySelector("#sell-prices");
const buyStatisticsElement = document.querySelector("#buy-statistics");
const sellStatisticsElement = document.querySelector("#sell-statistics");
const buyQuoteElement = document.querySelector("#buy-quote");
const sellQuoteElement = document.querySelector("#sell-quote");
const buyQuoteButtonElement = document.querySelector("#buy-quote-button");
const sellQuoteButtonElement = document.querySelector("#sell-quote-button");

buyQuoteButtonElement.addEventListener("click", () => {
  const sidePrices = Object.values(prices).map((price) => Number(price.buy));

  const timestamp = Object.entries(prices)[prices.length - 1];
  const expectedPrice = twoDecimalPlaces(sidePrices[sidePrices.length - 1]);
  const date = dayjs(timestamp).format("HH:mm:ss");

  const { spread } = getStatistics(sidePrices);

  buyQuoteElement.innerHTML = "";
  createParagraph(buyQuoteElement, `${date} Preço esperado: ${expectedPrice}`);
  createParagraph(buyQuoteElement, `${date} Spread: ${spread}`);

  setTimeout(() => {
    const sidePrices = Object.values(prices).map((price) => Number(price.buy));

    const timestamp = Object.entries(prices)[prices.length - 1];
    const executedPrice = twoDecimalPlaces(sidePrices[sidePrices.length - 1]);
    const date = dayjs(timestamp).format("HH:mm:ss");

    createParagraph(
      buyQuoteElement,
      `${date} Preço executado: ${executedPrice}`
    );

    const slippage = twoDecimalPlaces(expectedPrice - executedPrice);

    createParagraph(
      buyQuoteElement,
      `Slippage: ${slippage} (${
        slippage >= 0 ? "Positivo / Lucro" : "Negativo / Prejuízo"
      })`
    );

    createParagraph(
      buyQuoteElement,
      `Slippage somando Spread: ${twoDecimalPlaces(slippage + spread)} (${
        slippage + spread >= 0 ? "Positivo / Lucro" : "Negativo / Prejuízo"
      })`
    );
  }, 5000);
});

sellQuoteButtonElement.addEventListener("click", () => {
  const sidePrices = Object.values(prices).map((price) => Number(price.sell));

  const timestamp = Object.entries(prices)[prices.length - 1];
  const expectedPrice = twoDecimalPlaces(sidePrices[sidePrices.length - 1]);
  const date = dayjs(timestamp).format("HH:mm:ss");

  const { spread } = getStatistics(sidePrices);

  sellQuoteElement.innerHTML = "";
  createParagraph(sellQuoteElement, `${date} Preço esperado: ${expectedPrice}`);
  createParagraph(sellQuoteElement, `${date} Spread: ${spread}`);

  setTimeout(() => {
    const sidePrices = Object.values(prices).map((price) => Number(price.buy));

    const timestamp = Object.entries(prices)[prices.length - 1];
    const executedPrice = twoDecimalPlaces(sidePrices[sidePrices.length - 1]);
    const date = dayjs(timestamp).format("HH:mm:ss");

    createParagraph(
      sellQuoteElement,
      `${date} Preço executado: ${executedPrice}`
    );

    const slippage = twoDecimalPlaces(expectedPrice - executedPrice);

    createParagraph(
      sellQuoteElement,
      `Slippage: ${slippage} (${
        slippage >= 0 ? "Positivo / Prejuízo" : "Negativo / Lucro"
      })`
    );

    createParagraph(
      sellQuoteElement,
      `Slippage subtraindo Spread: ${twoDecimalPlaces(slippage - spread)} (${
        slippage - spread >= 0 ? "Positivo / Prejuízo" : "Negativo / Lucro"
      })`
    );
  }, 5000);
});

// timestamp -> { buy: number, sell: number }
const prices = {};

bitstamp.onmessage = (message) => {
  const orderBook = JSON.parse(message.data).data;

  if (!Object.keys(orderBook).length) return;

  const timestamp = orderBook.timestamp;
  const microtimestamp = orderBook.microtimestamp;
  const bids = orderBook.bids;
  const asks = orderBook.asks;

  const millitimestamp = Math.floor(Number(microtimestamp) / 1000);
  const date = dayjs(millitimestamp);

  dateElement.innerHTML = date.format("DD/MM/YYYY HH:mm:ss.SSS");

  appendSideElements(bidsElement, bids);
  appendSideElements(asksElement, asks);

  prices[timestamp] = { buy: 0, sell: 0 };

  prices[timestamp].sell = calculatePrice(sellElement, bids);
  prices[timestamp].buy = calculatePrice(buyElement, asks);

  appendPriceElements(buyPricesElement, "buy");
  appendPriceElements(sellPricesElement, "sell");

  appendStatisticsElement(buyStatisticsElement, "buy");
  appendStatisticsElement(sellStatisticsElement, "sell");
};

function appendSideElements(element, offers) {
  element.innerHTML = "";
  for (let i = 0; i < 10; i++) {
    const offer = offers[i];
    const li = document.createElement("li");
    li.innerHTML = `${offer[1]} BTC por ${offer[0]} USD`;
    element.appendChild(li);
  }
}

function calculatePrice(element, offers) {
  const totalAmount = 1;

  let currentPrice = 0;
  let currentAmount = 0;

  offers.forEach((offer) => {
    const offerPrice = offer[0];
    const offerAmount = offer[1];

    if (currentAmount + offerAmount <= totalAmount) {
      currentAmount += offerAmount;
      currentPrice += offerPrice * offerAmount;
    } else {
      currentPrice += (totalAmount - currentAmount) * offerPrice;
      currentAmount = totalAmount;
      return;
    }
  });

  const price = twoDecimalPlaces(currentPrice);

  element.innerHTML = price;

  return price;
}

function appendPriceElements(element, side) {
  element.innerHTML = "";
  Object.entries(prices).forEach((entry) => {
    const timestamp = entry[0];
    const price = entry[1][side];

    const action = side === "buy" ? "Comprar" : "Vender";

    const date = dayjs(Number(timestamp) * 1000).format("HH:mm:ss");

    const li = document.createElement("li");
    li.innerHTML = `${date}: ${action} 1 BTC por ${price} USD`;
    element.appendChild(li);
  });
}

function appendStatisticsElement(element, side) {
  element.innerHTML = "";
  const sidePrices = Object.values(prices).map((price) => Number(price[side]));
  const priceAverage = average(sidePrices);

  createParagraph(
    element,
    `Preço médio: ${twoDecimalPlaces(priceAverage)} USD`
  );

  const { spread, slippageAverage, z, slippageSd } = getStatistics(sidePrices);

  createParagraph(
    element,
    `Spread = ${twoDecimalPlaces(spread)} USD = ${twoDecimalPlaces(
      slippageAverage
    )} + ${twoDecimalPlaces(z)} * ${twoDecimalPlaces(slippageSd)}`
  );
}

function twoDecimalPlaces(number) {
  return Number((Math.round(number * 100) / 100).toFixed(2));
}

function average(arr) {
  return arr.reduce((prev, curr) => prev + Number(curr), 0) / arr.length;
}

function variance(arr) {
  const avg = average(arr);

  return (
    arr.reduce((prev, curr) => prev + (Number(curr) - avg) ** 2, 0) / arr.length
  );
}

function getStatistics(sidePrices) {
  const sideSlippages = [];
  for (let i = 0; i < sidePrices.length - 5; i++) {
    const slippage = sidePrices[i] - sidePrices[i + 5];
    sideSlippages.push(slippage);
  }
  const slippageAverage = average(sideSlippages);

  const slippageVariance = variance(sideSlippages);
  const slippageSd = Math.sqrt(slippageVariance);
  const z = 2.58;

  return {
    spread: twoDecimalPlaces(slippageAverage + z * slippageSd),
    slippageAverage,
    z,
    slippageSd,
  };
}

function createParagraph(element, str) {
  const childElement = document.createElement("p");
  childElement.innerHTML = str;

  element.appendChild(childElement);
}
