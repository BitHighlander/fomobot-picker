/**
 * Created by highlander on 9/18/17.
 */
const Bittrex = require('bittrex-wrapper');
//const bittrex = new Bittrex('YOUR API KEY', 'YOUR API SECRET');
const bittrex = new Bittrex();


bittrex.publicGetTicker('BTC-LTC')
    .then(function(resp){
        console.log(resp)
    });
