'use strict';

var Savings = (function () {

  //
  // Main
  //

  var selected = {month: location.hash.slice(1)};

  function update() {
    var filters = getAndFreezeFilters();
    fetchTransactions(function (transactions) {
      transactions = filter(transactions, filters);
      render(aggregate(transactions));
      unfreezeFilters();
    });
  }

  /**
   * @param {string} month
   */
  function select(month) {
    if (/^\d\d\d\d-\d\d$/.test(month)) {
      selected.month = month;
      update();
    }
  }


  //
  // Shims
  //

  if (typeof console === 'undefined') console = {};
  console.info = console.info || function () {};

  Object.freeze = Object.freeze || function (o) { return o; };


  //
  // Data Models
  //

  /**
   * @class
   */
  function Transaction(object) {
    for (var property in this.DEFAULTS) {
      if (object && object.hasOwnProperty(property)) {
        this[property] = object[property];
      } else {
        this[property] = this.DEFAULTS[property];
      }
    }
    Object.freeze(this);
  }

  /**
   * @constant {Object}
   */
  Transaction.prototype.DEFAULTS = {
    'account-id': null,
    'aggregation-time': null,
    'amount': null,
    'categorization': null,
    'clear-date': null,
    'is-pending': null,
    'merchant': null,
    'raw-merchant': null,
    'transaction-id': null,
    'transaction-time': null,
  };

  /**
   * Get month as "YYYY-MM" string.
   * @param {string} [timezone='Z'] - ignored for now
   * @returns {string}
   */
  Transaction.prototype.getMonth = function (timezone) {
    var datetime = this['transaction-time'];
    if (typeof datetime !== 'string') {
      return null;
    } else {
      return datetime.slice(0, 'YYYY-MM'.length);
    }
  };

  /**
   * @returns {number}
   */
  Transaction.prototype.getIncome = function () {
    return this.amount > 0 ? this.amount / 10000 : 0;
  };

  /**
   * @returns {number}
   */
  Transaction.prototype.getSpent = function () {
    return this.amount < 0 ? -this.amount / 10000 : 0;
  };


  /**
   * @class
   */
  function MonthlyAggregate(object) {
    this.transactions = object && object.transactions || [];
    for (var property in this.DEFAULTS) {
      if (object && object.hasOwnProperty(property)) {
        this[property] = object[property];
      } else {
        this[property] = this.DEFAULTS[property];
      }
    }
  }

  /**
   * @constant {Object}
   */
  MonthlyAggregate.prototype.DEFAULTS = {
    'income': 0,
    'spent': 0,
  };

  /**
   * Convert to numbers to strings for JSON serialization.
   *
   *   {spent: 200, income: 500} -> {"spent": "$200.00", "income": "$500.00"}
   *   {spent: 750, income: 950} -> {"spent": "$750.00", "income": "$950.00"}
   *   ...
   *
   * @returns {Object}
   */
  MonthlyAggregate.prototype.toJSON = function () {
    return {
      spent: '$' + this.spent.toFixed(2),
      income: '$' + this.income.toFixed(2),
    };
  };

  /**
   * @param {Transaction} transaction
   */
  MonthlyAggregate.prototype.addTransaction = function (transaction) {
    this.transactions.push(transaction);
    this.income += transaction.getIncome();
    this.spent += transaction.getSpent();
  };

  /**
   * @returns {number}
   */
  MonthlyAggregate.prototype.getSavings = function () {
    return this.income - this.spent;
  };

  /**
   * @returns {number}
   */
  MonthlyAggregate.prototype.getSurplus = function () {
    var savings = this.getSavings();
    return savings > 0 ? savings : 0;
  };

  /**
   * @returns {number}
   */
  MonthlyAggregate.prototype.getDeficit = function () {
    var savings = this.getSavings();
    return savings < 0 ? -savings : 0;
  };

  /**
   * @static
   * @param {Object.<string,MonthlyAggregate>} aggregates
   * @return {MonthlyAggregate}
   */
  MonthlyAggregate.max = function (aggregates) {
    var max = new MonthlyAggregate;
    for (var key in aggregates) {
      var aggregate = aggregates[key];
      max.income = Math.max(max.income, aggregate.income);
      max.spent = Math.max(max.spent, aggregate.spent);
    }
    return max;
  };

  /**
   * @static
   * @param {Object.<string,MonthlyAggregate>} aggregates
   * @returns {MonthlyAggregate}
   */
  MonthlyAggregate.average = function (aggregates) {
    var mean = new MonthlyAggregate();
    var count = 0;
    for (var key in aggregates) {
      var aggregate = aggregates[key];
      mean.income += aggregate.income;
      mean.spent += aggregate.spent;
      count += 1;
    }
    mean.income /= count;
    mean.spent /= count;
    return mean;
  };


  //
  // Data Fetching
  //

  var Auth = {
    UID: 1110590645,
    TOKEN: '66B9004184CBCE113F7653CB863DE416',
    API_TOKEN: 'AppTokenForInterview',
  };

  var Request = {
    METHOD: 'POST',
    HEADERS: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    URI: 'https://2016.api.levelmoney.com/api/v2/core/get-all-transactions',
    BODY: {
     'args': {
       'uid': Auth.UID,
       'token': Auth.TOKEN,
       'api-token': Auth.API_TOKEN,
       'json-strict-mode': false,
       'json-verbose-response': false,
      },
    },
  };

  var cache = {};

  /**
   * @param {function} success
   * @param {function} error
   */
  function fetchTransactions(success, error) {

    // Use cached transactions
    if (cache.transactions) {
      initializeTransactions(cache.transactions);
      success(cache.transactions);
      return;
    }

    // Fetch transactions from API
    var xhr = new XMLHttpRequest();
    xhr.open(Request.METHOD, Request.URI, true);
    xhr.onreadystatechange = function() {
      if (this.readyState !== 4) {
        return;
      } else if (this.status >= 200 && this.status < 400) {
        var response = JSON.parse(this.responseText);
        cache.transactions = response.transactions || [];
        initializeTransactions(cache.transactions);
        success(cache.transactions);
      } else if (typeof error === 'function') {
        error();
      }
    };
    for (var name in Request.HEADERS) {
      xhr.setRequestHeader(name, Request.HEADERS[name]);
    }
    xhr.send(JSON.stringify(Request.BODY));
    xhr = null;
  }

  /**
   * @param {Object[]} transactions
   */
  function initializeTransactions(transactions) {

    // 1. Only transactions initialize once
    if (transactions.initialized) return;

    // 2. Initialize and sort
    for (var i = 0; i < transactions.length; ++i) {
      if (!(transactions[i] instanceof Transaction)) {
        transactions[i] = new Transaction(transactions[i]);
      }
    }
    sortTransactions(transactions);

    // 3. Freeze transactions
    transactions.initialized = true;
    Object.freeze(transactions);
  }

  /**
   * @param {Transaction[]} transactions
   */
  function sortTransactions(transactions) {

    // 1. If initialized, transactions were already sorted
    if (transactions.initialized) return;

    // 2. Sort transactions by transaction time
    transactions.sort(function (a, b) {
      a = new Date(a['transaction-time']);
      b = new Date(b['transaction-time']);
      return a - b;
    });
  }


  //
  // Data Transformation
  //

  /**
   * @param {Transaction[]} transactions
   * @param {function[]}   [filters=[]]
   * @returns {Transaction[]}
   */
  function filter(transactions, filters) {
    filters = filters || [];
    for (var i = 0; i < filters.length; ++i) {
      var filter = filters[i];
      transactions = filter(transactions);
    }
    return transactions;
  }

  /**
   * @param {Transaction[]} transactions
   * @returns {Object.<string,MonthlyAggregate>}
   */
  function aggregate(transactions) {
    var months = {};

    for (var i = 0; i < transactions.length; ++i) {
      var transaction = transactions[i];
      var month = transaction.getMonth();
      months[month] = months[month] || new MonthlyAggregate();
      months[month].addTransaction(transaction);
    }
    months.average = MonthlyAggregate.average(months);

    return sortByKey(months);
  }


  //
  // Data Rendering
  //

  /**
   * @constant {number} - max bar width in pixels
   */
  var MAX_BAR_WIDTH = 150;

  /**
   * @param {Object.<string,MonthlyAggregate>} months
   * @param {Transaction[]} transactions
   */
  function render(months, transactions) {

    var html;


    // Monthly Chart

    var max = MonthlyAggregate.max(months);
    var scale = MAX_BAR_WIDTH / Math.max(max.spent, max.income);

    html = [];

    html.push(
      '<thead>',
        '<tr>',
          '<th class=month>',
          '<th class=spent colspan=2>Spending',
          '<th class=income colspan=2>Income',
          '<th class=savings colspan=3>Net Savings'
    );

    if (!(selected.month in months)) {
      selected.month = null;
    }

    html.push('<tbody>');
    for (var month in months) {
      var aggregate = months[month];
      var spentWidth = css(scale * aggregate.spent, 'px');
      var incomeWidth = css(scale * aggregate.income, 'px');
      var deficitWidth = css(scale * aggregate.getDeficit(), 'px');
      var surplusWidth = css(scale * aggregate.getSurplus(), 'px');
      var savingsSign = aggregate.getSavings() < 0 ? '-' : '+';

      selected.month = selected.month || month;
      if (month === 'average') {
        html.push('<tfoot>', '<tr>');
      } else if (month === selected.month) {
        html.push('<tr data-month=', month, ' class=selected>');
      } else {
        var onclick = "Savings.select('" + month + "')";
        html.push('<tr data-month=', month, ' onclick=', onclick, '>');
      }

      html.push(
        '<th class=month>', formatMonth(month),
        '<td class="spent bar">',
          '<b style="width: ', spentWidth,  '"></b>',
        '<td class="spent amount">',
          formatDollars(aggregate.spent, 2),
        '<td class="income amount">',
          formatDollars(aggregate.income, 2),
        '<td class="income bar">',
          '<b style="width: ', incomeWidth, '"></b>',
        '<td class="savings deficit bar">',
          '<b style="width: ', deficitWidth, '"></b>',
        '<td class="savings surplus bar">',
          '<b style="width: ', surplusWidth, '"></b>',
        '<td class="savings net amount">',
          formatAccounting(aggregate.getSavings(), 2)
      );
    }
    chart.innerHTML = html.join('');

    // Transactions Table

    var transactions = months[selected.month].transactions;

    html = [];

    html.push(
      '<thead>',
        '<tr>',
          '<th class=date>Date',
          '<th class=merchant>Merchant',
          '<th class=amount>Amount'
    );

    html.push('<tbody>');
    for (var i = 0; i < transactions.length; ++i) {
      var transaction = transactions[i];
      html.push(
        '<tr>',
          '<td class=date>',
            formatDate(transaction['transaction-time']),
          '<td class=merchant>',
            transaction['merchant'],
          '<td class=amount>',
            formatAccounting(transaction['amount'] / 10000, 2)
      );
    }
    location.hash = '#' + selected.month;
    selectedmonth.innerHTML = formatMonth(selected.month || '');
    table.innerHTML = html.join('');

    // JSON
    output.innerHTML = JSON.stringify(months, null, 2);

    // Show All
    main.style.display = '';
  }


  //
  // Filters
  //

  /**
   * @param {Transaction[]} transactions
   * @returns {Transaction[]}
   */
  function noop(transactions) {
    return transactions;
  }

  /**
   * @param {string} property
   * @param {RegExp} pattern
   * @param {boolean} [invert=false]
   * @returns {function}
   */
  function filterByPattern(property, pattern, invert) {
    if (pattern instanceof RegExp) {
      return function (transactions) {
        var filtered = [];
        for (var i = 0; i < transactions.length; ++i) {
          var transaction = transactions[i];
          var text = (transaction[property] || '').toLocaleLowerCase();
          if (pattern.test(text) ^ invert) {
            filtered.push(transaction);
          } else {
            logRejection(transaction);
          }
        }
        return filtered;
      };
    } else {
      return noop;
    }
  }

  /**
   * @param {string} property
   * @param {string} string
   * @param {boolean} [invert=false]
   * @returns {function}
   */
  function filterByString(property, string, invert) {
    if (string && typeof string === 'string') {
      var strings = string.toLocaleLowerCase().split(',');
      var i = strings.length;
      while (i--) {
        strings[i] = strings[i].trim();
        if (!strings[i]) strings.splice(i, 1);
      }
      var pattern = new RegExp(strings.join('|'));
      return filterByPattern(property, pattern, invert);
    } else {
      return noop;
    }
  }

  /**
   * @param {string} property
   * @param {RegExp} pattern
   */
  function rejectByPattern(property, pattern) {
    return filterByPattern(property, pattern, true);
  }

  /**
   * @param {string} property
   * @param {string} string
   */
  function rejectByString(property, string) {
    return filterByString(property, string, true);
  }

  /**
   * @param {number} milliseconds
   */
  function rejectEqualAndOpposite(milliseconds) {
    return function (transactions) {

      // 1. Shallow copy
      transactions = transactions.slice();
      transactions.initialized = true;

      // 2. Sort transactions
      sortTransactions(transactions);

      // 3. Reject transactions with (reverse) sliding window
      var i = transactions.length;
      var sliding = {amounts: [], times: []};
      while (i--) {
        var transaction = transactions[i];
        var amount = transaction['amount'];
        var time = new Date(transaction['transaction-time']);

        // a. Trim end of sliding window to maintain interval size
        var j = sliding.times.length;
        while (j--) {
          if (sliding.times[j] - time > milliseconds) {
            sliding.amounts.pop();
            sliding.times.pop();
          } else {
            break;
          }
        }

        // b. Search for closest matching opposite amount
        var match = sliding.amounts.indexOf(-amount);

        if (match > -1) {
          // c. Remove this transaction and matching opposite amount
          var x = transactions.splice(i, 1)[0];
          var y = transactions.splice(i + match, 1)[0];
          sliding.amounts.splice(match, 1);
          sliding.times.splice(match, 1);
          logEqualAndOppositeRejection(x, y);
        } else {
          // d. Add this transaction to sliding window
          sliding.amounts.unshift(amount);
          sliding.times.unshift(time);
        }
      }

      return transactions;
    };
  }

  /**
   * @param {Transaction} x
   * @param {Transaction} y
   */
  function logEqualAndOppositeRejection(x, y) {
    if (x['amount'] > y['amount']) {
      var dummy = x; x = y; y = dummy;
    }
    console.info(
      'Rejected:',
      x['amount'] / 10000,
      x['merchant'],
      x['transaction-time'].slice(0, 16).replace('T', ' '),
      y['transaction-time'].slice(0, 16).replace('T', ' '),
      y['merchant'],
      y['amount'] / 10000
    );
  }

  /**
   * @param {Transaction} x
   */
  function logRejection(x) {
    console.info(
      'Rejected:',
      x['amount'] / 10000,
      x['merchant'],
      x['transaction-time'].slice(0, 16).replace('T', ' ')
    );
  }

  /**
   * @returns {function[]}
   */
  function getAndFreezeFilters() {

    card.disabled = true;
    card.onchange = null;
    donut.disabled = true;
    donut.onchange = null;

    var filters = [];
    if (!card.checked) {
      filters.push(rejectEqualAndOpposite(24 * 60 * 60 * 1000));
    }
    if (!donut.checked) {
      filters.push(rejectByPattern('merchant', /dunkin|donut/));
    }
    return filters;
  }

  function unfreezeFilters() {
    card.disabled = false;
    card.onchange = update;
    donut.disabled = false;
    donut.onchange = update;
  }


  //
  // Utilities
  //

  /**
   * @param {number} value
   * @param {string} unit
   * @returns {string}
   */
  function css(value, unit) {
    return value.toFixed(2) + unit;
  }

  /**
   * @param {number}  amount
   * @param {number} [decimals=0]
   * @returns {string}
   */
  function formatAccounting(amount, decimals) {
    var dollars = formatDollars(Math.abs(amount), decimals);
    if (amount < 0) {
      return '<span class="accounting negative">(' + dollars + ')</span>';
    } else {
      return '<span class="accounting positive">' + dollars + ' </span>';
    }
  }

  /**
   * @param {number}  amount
   * @param {number} [decimals=0]
   * @returns {string}
   */
  function formatDollars(amount, decimals) {
    var whole = amount.toLocaleString().split('.')[0];
    var part = decimals > 0 ? '.' + amount.toFixed(decimals).split('.')[1] : '';
    return '$' + whole + part;
  }

  /**
   * @param {string} datetime
   * @returns {string}
   */
  function formatDate(datetime) {
    var date = new Date(datetime);
    if (!isNaN(date)) {
      var datestring = date.toUTCString();
      var DD_MMM_YYYY = datestring.split(' ').slice(1, 4);
      return DD_MMM_YYYY.join(' ');
    }
    return datetime;
  }

  /**
   * @param {string} datetime
   * @returns {string}
   */
  function formatMonth(datetime) {
    var date = new Date(datetime);
    if (!isNaN(date)) {
      var datestring = date.toUTCString();
      var MMM_YYYY = datestring.split(' ').slice(2, 4);
      return MMM_YYYY.join(' ');
    }
    return datetime;
  }

  /**
   * @param {Object} object
   * @returns {Object}
   */
  function sortByKey(object) {

    var keys = [];
    for (var key in object) {
      if (object.hasOwnProperty(key)) {
        keys.push(key);
      }
    }
    keys.sort();

    var sorted = {};
    for (var i = 0; i < keys.length; ++i) {
      sorted[keys[i]] = object[keys[i]];
    }
    return sorted;
  }


  //
  // Exports
  //

  return {
    cache: cache,
    select: select,
    update: update,
  };

})();
