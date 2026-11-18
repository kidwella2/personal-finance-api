# Personal Finance API Acceptance

| Endpoint | Success case | Failure case |
|---|---|---|
| `POST /api/login` | Valid seeded credentials return `200` and a non-empty `token`. | Incorrect credentials return `401` and an error object. |
| `GET /api/budgets/current` | Valid token returns `200`, November 2026, and an `items` array. | Missing or invalid token returns `401` and an error object. |
| `PUT /api/budgets/current` | Valid token and valid month/items JSON create or replace the monthly budget; return `200` with the saved month and items. | Missing/invalid token returns `401`; missing month returns `400`. |
| `GET /api/budgets/recurring-items` | Valid token returns `200` and an `items` array. | Missing or invalid token returns `401`. |
| `POST /api/budgets/recurring-items` | Valid token and a positive amount return `201` and the created item's `id`. | Missing/invalid token returns `401`; a negative amount returns `400`. |
| `DELETE /api/budgets/recurring-items/{id}` | Valid token and an existing item return `204`; it is excluded from future budgets. | Missing/invalid token returns `401`; unknown ID returns `404`. |
| `GET /api/transactions` | Valid token returns `200` and a `transactions` array. | Missing or invalid token returns `401`. |
| `POST /api/transactions` | Valid token and transaction data return `201` and the created transaction's `id`. | Missing/invalid token returns `401`; a negative amount returns `400`. |
| `DELETE /api/transactions/{id}` | Valid token and an existing transaction return `204`. | Missing/invalid token returns `401`; unknown ID returns `404`. |
| `GET /api/reports/monthly-spending?month=YYYY-MM` | Valid token and a valid month return `200`, that month, and numeric `budgeted` and `actual` totals. | Missing/invalid token returns `401`; malformed month returns `400`. |