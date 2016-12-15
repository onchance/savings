'use strict';

(function () {

  //
  // Simplified Mocks
  //

  /**
   * [0] Spotify purchase
   * [1] Credit card payment 1 (paired)
   * [2] Credit card payment 2 (paired)
   * [3] Krispy Kreme purchase
   * [4] Dunkin Donuts purchase
   * [5] Credit card payment 3 (unpaired)
   * [6] ATM withdraw
   */
  Savings.cache.transactions = [
    {
      'account-id': 'nonce:comfy-cc/hdhehe',
      'aggregation-time': 1414995900000,
      'amount': -99900,
      'categorization': 'Unknown',
      'clear-date': 1415023140000,
      'is-pending': false,
      'merchant': 'Spotify.com',
      'raw-merchant': 'Spotify.com',
      'transaction-id': '1415023140000',
      'transaction-time': '2014-11-03T06:25:00.000Z',
    },
    {
      'account-id': 'nonce:comfy-cc/hdhehe',
      'aggregation-time': 1415041080000,
      'amount': 5194500,
      'categorization': 'Unknown',
      'clear-date': 1415042820000,
      'is-pending': false,
      'merchant': 'Credit Card Payment',
      'raw-merchant': 'CREDIT CARD PAYMENT',
      'transaction-id': '1415042820000',
      'transaction-time': '2014-11-03T18:58:00.000Z',
    },
    {
      'account-id': 'nonce:comfy-checking/hdhehe',
      'aggregation-time': 1415048280000,
      'amount': -5194500,
      'categorization': 'Unknown',
      'clear-date': 1415193660000,
      'is-pending': false,
      'merchant': 'CC Payment',
      'raw-merchant': 'CC PAYMENT',
      'transaction-id': '1415193660000',
      'transaction-time': '2014-11-03T20:58:00.000Z',
    },
    {
      'account-id': 'nonce:comfy-cc/hdhehe',
      'aggregation-time': 1415723340000,
      'amount': -129200,
      'categorization': 'Unknown',
      'clear-date': 1415931540000,
      'is-pending': false,
      'merchant': 'Krispy Kreme Donuts',
      'raw-merchant': 'Krispy Kreme Donuts',
      'transaction-id': '1415931540000',
      'transaction-time': '2014-11-11T16:29:00.000Z',
    },
    {
      'account-id': 'nonce:comfy-cc/hdhehe',
      'aggregation-time': 1416049980000,
      'amount': -58600,
      'categorization': 'Unknown',
      'clear-date': 1416290940000,
      'is-pending': false,
      'merchant': 'Dunkin #336784',
      'raw-merchant': 'DUNKIN #336784',
      'transaction-id': '1416290940000',
      'transaction-time': '2014-11-15T11:13:00.000Z',
    },
    {
      'account-id': 'nonce:comfy-checking/hdhehe',
      'aggregation-time': 1430611200000,
      'amount': -5194500,
      'categorization': 'Unknown',
      'clear-date': 1430673540000,
      'is-pending': false,
      'merchant': 'CC Payment',
      'raw-merchant': 'CC PAYMENT',
      'transaction-id': '1430673540000',
      'transaction-time': '2015-05-03T00:00:00.000Z',
    },
    {
      'account-id': 'nonce:comfy-checking/hdhehe',
      'aggregation-time': 1430784000000,
      'amount': -400000,
      'categorization': 'Unknown',
      'clear-date': 1430909700000,
      'is-pending': false,
      'merchant': 'ATM Withdrawal',
      'raw-merchant': 'ATM WITHDRAWAL',
      'transaction-id': '1430909700000',
      'transaction-time': '2015-05-05T00:00:00.000Z',
    },
  ];


  //
  // Shims
  // 

  if (typeof console === 'undefined') console = {};
  console.log = console.log || function () {};
  console.error = console.error || function () {};
  console.assert = console.assert || function (condition) {
    if (!condition) {
      if (arguments.length < 2) {
        console.error('Assertion Failed');
      } else if (arguments.length === 2) {
        console.error('Assertion Failed:', arguments[1]);
      } else  {
        var messages = Array.apply(null, arguments);
        messages[0] = 'Assertion Failed:';
        console.error.apply(console, messages);
      }
    }
  };


  //
  // Tests
  //

  // Initialize
  Savings.update();

  var SPOTIFY = Savings.cache.transactions[0];
  var CARD1   = Savings.cache.transactions[1];
  var CARD2   = Savings.cache.transactions[2];
  var KRISPY  = Savings.cache.transactions[3];
  var DUNKIN  = Savings.cache.transactions[4];
  var CARD3   = Savings.cache.transactions[5];
  var ATM     = Savings.cache.transactions[6];

  var nov = {income: 0, spent: 0};
  var may = {income: 0, spent: 0};
  var avg = {income: 0, spent: 0};

  nov.income += CARD1['amount'];

  nov.spent += SPOTIFY['amount'];
  nov.spent += CARD2['amount'];
  nov.spent += KRISPY['amount'];
  nov.spent += DUNKIN['amount'];
  may.spent += CARD3['amount'];
  may.spent += ATM['amount'];

  avg.income += nov.income;
  avg.income += may.income;
  avg.income /= 2;

  avg.spent += nov.spent;
  avg.spent += may.spent;
  avg.spent /= 2;

  nov.income /= 10000;
  may.income /= 10000;
  avg.income /= 10000;
  nov.spent /= -10000;
  may.spent /= -10000;
  avg.spent /= -10000;

  // Test card filter
  card.checked = false;
  donut.checked = true;
  console.log('Running tests for card filter...');
  Savings.update(function (transactions, aggregates) {
    console.assert(transactions[0] === SPOTIFY, '1st transaction is Spotify');
    console.assert(transactions[1] === KRISPY, '2nd transaction is Krispy Kreme');
    console.assert(transactions[2] === DUNKIN, '3rd transaction is Dunkin Donuts');
    console.assert(transactions[3] === CARD3, '4th transaction is unpaired credit card');
    console.assert(transactions[4] === ATM, '5th transaction is ATM withdraw');
  });

  // Test donut filter
  card.checked = true;
  donut.checked = false;
  console.log('Running tests for donut filter...');
  Savings.update(function (transactions, aggregates) {
    console.assert(transactions[0] === SPOTIFY, '1st transaction is Spotify');
    console.assert(transactions[1] === CARD1, '2nd transaction is credit card pair');
    console.assert(transactions[2] === CARD2, '3rd transaction is credit card pair');
    console.assert(transactions[3] === CARD3, '4th transaction is unpaired credit card');
    console.assert(transactions[4] === ATM, '5th transaction is ATM withdraw');
  });

  // Test aggregates
  card.checked = true;
  donut.checked = true;
  console.log('Running tests for aggregates...');
  Savings.update(function (transactions, aggregates) {
    var aggnov = aggregates['2014-11'];
    var aggmay = aggregates['2015-05'];
    var aggavg = aggregates['average'];
    console.assert(aggnov, 'Aggregate was calculated for 2014-11');
    console.assert(aggnov.income === nov.income, '2014-11 income equals ' + nov.income);
    console.assert(aggnov.spent === nov.spent, '2014-11 spending equals ' + nov.spent);
    console.assert(aggmay, 'Aggregate was calculated for 2015-05');
    console.assert(aggmay.income === may.income, '2015-05 income equals ' + may.income);
    console.assert(aggmay.spent === may.spent, '2015-05 spending equals ' + may.spent);
    console.assert(aggavg, 'Monthly average was calculated');
    console.assert(aggavg.income === avg.income, 'Average income equals ' + avg.income);
    console.assert(aggavg.spent === avg.spent, 'Average spending equals ' + avg.spent);
  });

  console.log('Tests completed.');
  
})();
