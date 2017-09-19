/**
 * Created by highlander on 9/4/17.
 */

let TAG = " | Bittrex-events | "

const when = require('when');
const pubsubLib = require("redis")
    , subscriber = pubsubLib.createClient()
    , publisher = pubsubLib.createClient();

const views = require('./../modules/views.js')

const exchanges = {}
const Bittrex = require('bittrex-wrapper');
//const bittrex = new Bittrex('YOUR API KEY', 'YOUR API SECRET');
const bittrex = new Bittrex();


let analize_markets = async function(){
    let tag = TAG + " | analize_markets | "
    let debug = true
    let debug1 = true
    try{
        let summary = await bittrex.publicGetTicker('BTC-LTC')
        //if(debug) console.log(tag,"summary: ",summary)

        let corpus = []
        for(let i = 0; i < summary.length; i++){
            let market = summary[i]
            if(debug) console.log(tag,"market: ",market)

            //we only care about BTC bases
            let marketName = market.MarketName
            let coins = marketName.split("-")
            if(coins[0] === "BTC"){
                market.asset = coins[1]
                corpus.push(market)
            }
        }

        //sort by volume (BTC)
        let sorted = corpus.sort(function(a, b) {return parseFloat(a.BaseVolume) - parseFloat(b.BaseVolume);});
        sorted = sorted.reverse()
        // if(debug) console.log(tag,"sorted by volume: ",sorted[0])
        // if(debug) console.log(tag,"sorted by volume: ",sorted[1])

        //heuristics

        //if in top 30 by volume
        sorted = sorted.slice(0,20)
        if(debug) console.log(tag,"sorted top 20: ",sorted.length)

        //if pct change > 10pct
        let upMarkets = []
        for(let i = 0; i < sorted.length; i++){
            let market = sorted[i]
            //if(debug) console.log(tag,"market: ",market)
            let yesterdayPrice = market.PrevDay
            if(debug) console.log(tag,"yesterdayPrice: ",yesterdayPrice)
            let todayPrice = market.Last
            if(debug) console.log(tag,"todayPrice: ",todayPrice)
            let difference = parseFloat(yesterdayPrice) - parseFloat(todayPrice)
            if(debug) console.log(tag,"difference: ",difference)
            let percentage = (todayPrice / yesterdayPrice) * 100
            percentage = percentage - 100
            if(debug) console.log(tag,"percentage: ",percentage)
            market.dayPctChange = percentage
            if(percentage > 5) upMarkets.push(market)
        }


        let upMarketsSorted = upMarkets.sort(function(a, b) {return parseFloat(a.dayPctChange) - parseFloat(b.dayPctChange);});
        upMarketsSorted = upMarketsSorted.reverse()

        if(debug1) console.log(tag,"upMarkets",upMarketsSorted.length)
        if(debug1) console.log(tag,"upMarkets",upMarketsSorted)

        for (let i = 0; i < upMarketsSorted.length; i++) {
            upMarketsSorted[i].rank = i + 1
        }


        let finalPicks = []
        //currently pumping (2pct of daily high)
        for(let i = 0; i < upMarketsSorted.length; i++){
            let market = upMarketsSorted[i]

            let todayHigh = market.High
            if(debug) console.log(tag,"todayHigh: ",todayHigh)
            let currentPrice = market.Last
            if(debug) console.log(tag,"currentPrice: ",currentPrice)
            let percentage = (todayHigh / currentPrice) * 100
            percentage = percentage - 100
            if(debug) console.log(tag,"percentage from high: ",percentage)
            market.dayPctChange = percentage
            if(percentage <= 2) finalPicks.push(market)

        }


        //
        //views.displayArrayToChannel(finalPicks,"fomobot")


        //push event
        if(finalPicks.length === 0){
            if(debug) console.log(tag,"No current assets are pumping. No recommendations!")
            //views.displayStringToChannel("No current assets are pumping. No recommendations!","fomobot")
        } else {
            for(let i = 0; i < finalPicks.length; i++){
                if(debug) console.log(tag,"coin is pumping! coin: ",finalPicks[i].asset)
                views.displayArrayToChannel(finalPicks,"fomo-picks-gen1")
                publisher.publish("pumping",JSON.stringify(finalPicks[i]))
                await pause(3)
            }
        }



    }catch(e){
        console.error(tag,"e:",e)
    }
}


const pause = function(length){
    const d = when.defer();
    const done = function(){d.resolve(true)}
    setTimeout(done,length*1000)
    return d.promise
}

analize_markets()
setInterval(analize_markets,1000*70)
