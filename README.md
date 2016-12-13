Savings
===

*An overview of your monthy income and spending*

Requirements
---

- [x] Ingest transactions data from the (CORS-enabled) `GetAllTransactions` endpoint in the following format:

      ```json
      [
        {
          "account-id": "nonce:comfy-cc/hdhehe",
          "aggregation-time": 1412686740000,
          "amount": -34300,
          "categorization": "Unknown",
          "clear-date": 1412790480000,
          "is-pending": false,
          "merchant": "7-Eleven 23853",
          "raw-merchant": "7-ELEVEN 23853",
          "transaction-id": "1412790480000",
          "transaction-time": "2014-10-07T12:59:00.000Z"
        },
        {
          "account-id": "nonce:comfy-cc/hdhehe",
          "aggregation-time": 1412702940000,
          "amount": -30200,
          "categorization": "Unknown",
          "clear-date": 1412985120000,
          "is-pending": false,
          "merchant": "Sunoco",
          "raw-merchant": "SUNOCO 0299792200",
          "transaction-id": "1412985120000",
          "transaction-time": "2014-10-07T17:29:00.000Z"
        },
        ...
      ]
      ```

- [x] Aggregate income transactions by month

- [x] Aggregate spending transactions by month

- [x] Output aggregates in the following format:

      ```json
      {
        "2014-10": {"spent": "$200.00", "income": "$500.00"},
        "2014-11": {"spent": "$1510.05", "income": "$1000.00"},
        ...
        "2015-04": {"spent": "$300.00", "income": "$500.00"},
        "average": {"spent": "$750.00", "income": "$950.00"}
      }
      ```

Enhancements
---

- [ ] Display the aggregates in a more pretty format.
      - [ ] Display a chart of monthly income and spending.
      - [ ] Display a table of the transactions included in the monthly aggregates.
- [ ] Provide an `ignore-donuts` option to ignore (the oh-so-important) donuts transactions named `"Krispy Kreme Donuts"` or `"DUNKIN #336784"`.
- [ ] Provide a `crystal-ball` option to show projected income and spending for the current month using data from the `GetProjectedTransactionsForMonth` endpoint.
- [ ] Provide an `ignore-cc-payments` option to ignore credit card payments that appear as two transactions in opposite amounts (*e.g.*, 5000000 centocents and -5000000 centocents) within 24 hours of each other. For verfication, also output of a list those ignored credit card payments.
- [ ] Enable time zone support
- [ ] Enable controls for finer-grained filtering of transactions

Architecture
---

1. Fetch transactions from API
2. Filter transactions (*optional*) — for **Enhancements** only
3. Aggregate transactions by month
4. Output aggregates

Implementation
---

Technologies like ES6, TypeScript, SCSS, *etc.*, can make a lot of sense for larger projects, but for this demo we use vanilla HTML, CSS, and JavaScript to:

* Maximize backwards compatibility with older browsers
* Avoid the need to compile before viewing in browser

