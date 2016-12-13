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
   * @param {Object.<string,MonthlyAggregate>}
   */
  function render(months) {
    output.innerHTML = JSON.stringify(months, null, 2);
  }


  //
  // Utilities
  //

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
