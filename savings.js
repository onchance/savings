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
  // Data Models
  //

  /**
   * @class
   */
  function Transaction(object) {
    // TODO
  }

  /**
   * Get month as "YYYY-MM" string.
   * @param {string} [timezone='Z']
   * @returns {string}
   */
  Transaction.prototype.getMonth = function (timezone) {
    // TODO
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
    // TODO
  }

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
    // TODO
  };


  //
  // Data Fetching
  //

  /**
   * @param {function} callback
   */
  function fetchTransactions(callback) {
    var data = [];  // TODO
    var transactions = initializeTransactions(data);
    callback(transactions);
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
    document.body.innerHTML = JSON.stringify(months, null, 2);
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
