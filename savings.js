'use strict';

var Savings = (function () {

  //
  // Main
  //

  function update() {
    fetchTransactions(function (transactions) {
      transactions = filter(transactions);
      render(aggregate(transactions));
    });
  }


  //
  // Shims
  //

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

  /**
   * @param {function} success
   * @param {function} error
   */
  function fetchTransactions(success, error) {
    var xhr = new XMLHttpRequest();
    xhr.open(Request.METHOD, Request.URI, true);
    xhr.onreadystatechange = function() {
      if (this.readyState !== 4) {
        return;
      } else if (this.status >= 200 && this.status < 400) {
        var response = JSON.parse(this.responseText);
        var data = response.transactions || [];
        var transactions = initializeTransactions(data);
        success(transactions);
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
   * @param {Object[]} data
   * @returns {Transaction[]}
   */
  function initializeTransactions(data) {
    var transactions = [];
    for (var i = 0; i < data.length; ++i) {
      transactions.push(new Transaction(data[i]));
    }
    return transactions;
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
   * @param {Object.<string,MonthlyAggregate>}
   */
  function render(months) {

    // Table

    var max = MonthlyAggregate.max(months);
    var scale = MAX_BAR_WIDTH / Math.max(max.spent, max.income);

    var html = [];

    html.push(
      '<thead>',
        '<tr>',
          '<th class=month>',
          '<th class=spent colspan=2>Monthly Spending',
          '<th class=income colspan=2>Monthly Income',
          '<th class=savings colspan=3>Net Savings'
    );

    html.push('<tbody>');
    for (var month in months) {
      if (month === 'average') html.push('<tfoot>');
      var aggregate = months[month];
      var spentWidth = css(scale * aggregate.spent, 'px');
      var incomeWidth = css(scale * aggregate.income, 'px');
      var deficitWidth = css(scale * aggregate.getDeficit(), 'px');
      var surplusWidth = css(scale * aggregate.getSurplus(), 'px');
      var savingsSign = aggregate.getSavings() < 0 ? '-' : '+';
      html.push(
        '<tr>',
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

    // JSON
    output.innerHTML = JSON.stringify(months, null, 2);

    // Show All
    main.hidden = false;
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
   * @param {string} month
   * @returns {string}
   */
  function formatMonth(month) {
    if (/^\d\d\d\d-\d\d$/.test(month)) {
      var datestring = new Date(month).toUTCString();
      var MMM_YYYY = datestring.split(' ').slice(2, 4);
      return MMM_YYYY.join(' ');
    }
    return month;
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

  return {update: update};

})();
