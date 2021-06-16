const binance = require('binance-api-node').default();
const broadcast = require('./bot');

const { DEBUG, INTERVAL, THRESHOLD, BASE_SYMBOL } = process.env;

console.log('THRESHOLD', THRESHOLD);
console.log('INTERVAL', INTERVAL);
async function publishTopic(data){
	const {symbol, currentRate, newRate, difference, differencePercent, trend} = data;
	console.log(data);
	const dataBuffer = Buffer.from(JSON.stringify(data), 'utf8');
	const emoji = trend === 'bull' ? '🚀' : '🔻';
	const ticktrades_url = new URL("https://www.ticktrades.com/exchanges/binance/trades/"+symbol);
	return broadcast(
		`
		<b>${symbol}</b> ${emoji} ${differencePercent.toFixed(2)}%
		<b>Price: </b> ${newRate.close}
		<b>Volume: </b> ${newRate.quoteVolume} BTC
		<a href="${ticktrades_url.href}">More details</a>
		`
	);
}

const rateMap = new Map();

async function handleStream(tick) {
	const { symbol, ...newRate } = tick;
  //console.log(tick);
	
	/**
	 * Initialise Rate map if symbol is abscent
	 */
	if(!rateMap.has(symbol)){
		rateMap.set(symbol, {...newRate, pumpLow: newRate.low, pumpHigh: newRate.high});
	}

	/**
	 * Get the slice of symbol from Rate
	 */
	const currentRate = rateMap.get(symbol);

	if(currentRate.startTime !== newRate.startTime){
		rateMap.set(symbol, {...newRate, pumpLow: newRate.low, pumpHigh: newRate.high});
	}

	if(newRate.close > currentRate.pumpLow){
		const difference = newRate.close - currentRate.pumpLow;
		const differencePercent = (difference / currentRate.pumpLow) * 100;
		const isChangeBeyondThreshold = differencePercent >= parseInt(THRESHOLD, 10);
		const differenceInt = (difference * 100000000);

		if(isChangeBeyondThreshold && (differenceInt > 1.1) && newRate.quoteVolume > 1){
			console.log('##############', differenceInt);
			const message = {symbol, currentRate, newRate, difference, differenceInt, differencePercent, trend: 'bull'};
			
			return publishTopic(message).then(() => {
				rateMap.set(symbol, {...newRate, pumpLow: newRate.close});
			});
		}
	}
	
	if(newRate.close < currentRate.pumpHigh){
		const difference = newRate.close - currentRate.pumpHigh;
		const differencePercent = (difference / currentRate.pumpHigh) * 100;
		const isChangeBeyondThreshold = differencePercent <= -(THRESHOLD);
		const differenceInt = (difference * 100000000);
		
		if(isChangeBeyondThreshold && (differenceInt < -1.1) && newRate.quoteVolume > 1){
			console.log('------------------------------------------------', differenceInt);
			const message = {symbol, currentRate, newRate, difference, differenceInt, differencePercent, trend: 'bear'};

			return publishTopic(message).then(() => {
				rateMap.set(symbol, {...newRate, pumpHigh: newRate.close});
			});
		}
	}
}

async function app() {
	const exchangeInfo = await binance.exchangeInfo();
	const symbols = await [
		...new Set(
			exchangeInfo.symbols.map(
				symbol => `${symbol.baseAsset}${BASE_SYMBOL}`
			)
		)
	];
	const time = await binance.time();
	console.log(`TickTradesLab Bot started at ⏰ ${time}`);
	function intervalFunc() {
		console.log('Cant stop me now!');
	  }
	  
	  setInterval(() => {
		console.log(new Date(Date.now()).toString());
	  }, 3600000);
	return await binance.ws.candles(symbols, INTERVAL, handleStream);
}


module.exports = app;