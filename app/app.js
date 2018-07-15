const binance = require('binance-api-node').default();
const broadcast = require('./bot');

const { DEBUG, INTERVAL, THERESOLD, BASE_SYMBOL } = process.env;


async function publishTopic(data){
	console.log('data', data)
	const {symbol, currentRate, newRate, difference, differencePercent, trend} = data;
	const dataBuffer = Buffer.from(JSON.stringify(data), 'utf8');
	const dataBuffercurrentRate = Buffer.from(JSON.stringify(data.currentRate), 'utf8');
	const dataBuffernewRate = Buffer.from(JSON.stringify(data.newRate || {}), 'utf8');
	const dataBuffercurrentRateString = (
		`
		\`\`\`json
		${dataBuffercurrentRate}
		\`\`\`
		`
	);
	const dataBuffernewRateString = (
		`
		\`\`\`json
		${dataBuffernewRate}
		\`\`\`
		`
	);
	return broadcast(
		`
		#${symbol}
		|===
		|	** Price Difference ** (${differencePercent.toFixed(2)}%)
		|	** Previous rates ** ${currentRate.pumpLow} (Low) ${currentRate.pumpHigh} (High)
		|	** Last Traded Price ** ${newRate.close} (${trend})
[Binance - Desktop](https://www.binance.com/trade.html?symbol=${symbol.slice(-3)}_BTC)   [Binance - Mobile](https://www.binance.com/indexSpa.html#/trade/index?symbol=${symbol.slice(-3)}_BTC)   
`
    
    /*

		|-----------------------------------------------|------------------------------
		|			|	Prv Rate						|	Trigger Rate 
		|-----------------------------------------------|-----------------------------:
		|	Open	|	${currentRate.open}				|	${newRate.open}
		|----------	|:---------------------------------:|-----------------------------:
		|	Close	|	${currentRate.close}			|	${newRate.close}
		|----------	|:---------------------------------:|-----------------------------:
		|	High	|	${currentRate.high}				|	${newRate.high}
		|----------	|:---------------------------------:|-----------------------------:
		|	Low		|	${currentRate.low}				|	${newRate.low}
		|----------	|:---------------------------------:|-----------------------------:
		|	All		|	${dataBuffercurrentRateString}	|	${dataBuffernewRateString}
    */
		
		
		
	);
}
const rateMap = new Map();

async function handleStream(tick) {
	
	if(DEBUG){	
		//console.log(tick);
    //console.log("##############################################################################################");
	}

	const { symbol, ...newRate } = tick;
	
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

	if(DEBUG){
		//console.log('symbolRate', currentRate);
    //console.log("***************************");
	}

	if(newRate.close > currentRate.pumpLow){
		const difference = newRate.close - currentRate.pumpLow;
		const differencePercent = (difference / currentRate.pumpLow) * 100;
		const isChangeBeyondThresold = differencePercent >= THERESOLD;
		
		if(isChangeBeyondThresold){
			const message = {symbol, currentRate, newRate, difference, differencePercent, trend: 'bull'};
      console.log(message);
			return publishTopic(message).then(() => {
				rateMap.set(symbol, {...newRate, pumpLow: newRate.close});
			});
		}
	}
	
	if( newRate.close < currentRate.pumpHigh){
		const difference = newRate.close - currentRate.pumpHigh;
		const differencePercent = (difference / currentRate.pumpHigh) * 100;
		const isChangeBeyondThresold = differencePercent <= -(THERESOLD);
		
		if(isChangeBeyondThresold){
			const message = {symbol, currentRate, newRate, difference, differencePercent, trend: 'bear'};
      console.log(message);
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
	console.log(`Binance boot time ${time}`);
	return await binance.ws.candles(symbols, INTERVAL, handleStream);
}


module.exports = app;