---
marp: true
theme: default
paginate: true
---

# Personal Finance API

## Endpoint tutorial

ASE 230 learning API · `http://localhost:8080`

Requests and responses use JSON; MySQL stores the finance data.

---

## Authentication

Login is public. All finance endpoints require this header:

```http
Authorization: Bearer <token>
```

Demo accounts:

| Username | Password | Token |
|---|---|---|
| `john` | `Secret123` | `john-demo-token` |
| `admin` | `Admin123` | `admin-demo-token` |

Tokens are fixed demo values and do not expire; `expires_in` is informational.
The API also accepts unauthenticated `OPTIONS` preflight requests with an empty
response.

---

## `GET /`

**Authentication:** None  
**Input:** No body or query parameters.

**Output — `200`:** API information and an `endpoints` map of available methods
to descriptions.

```json
{
  "success": true,
  "message": "Simple Finance Management API",
  "endpoints": {
    "POST /login": "Get a bearer token"
  }
}
```

The map includes every supported finance route.

---

## `POST /login`

**Authentication:** None  
**Input:** JSON object with `username` and `password`.

```json
{"username":"john","password":"Secret123"}
```

**Output — `200`:** `message`, `token`, `user`, and `expires_in`.

```json
{"message":"Login successful","token":"john-demo-token","user":"john","expires_in":3600}
```

Missing credentials return `400`; invalid credentials return `401`. Errors have
the form `{"error":"..."}`.

---

## `/budgets/current`

### `GET /budgets/current`

**Authentication:** Bearer token  
**Input:** No body or query parameters.

**Output — `200`:** `month` (`YYYY-MM`) and numeric `budget`. If not set, the
API returns the current month and a `3000` budget.

### `PUT /budgets/current`

**Authentication:** Bearer token  
**Input:** JSON object with `month` (`YYYY-MM`) and numeric `budget`.

**Output — `200`:** The saved `month` and `budget`.

---

## `/budgets/recurring-items`

### `GET /budgets/recurring-items`

**Authentication:** Bearer token  
**Input:** No body or query parameters.

**Output — `200`:** `{"items":[{"id":1,"name":"electric","amount":100}]}`

### `POST /budgets/recurring-items`

**Authentication:** Bearer token  
**Input:** JSON with a non-empty `name` and positive integer `amount`.

**Output — `201`:** `{"id":1}` for the created item.

---

## `DELETE /budgets/recurring-items/{id}`

**Authentication:** Bearer token  
**Input:** Numeric item ID in the path; no body.

**Output — `204`:** No response body.

Invalid IDs return `400`; an unknown item returns `404`.

---

## `/transactions`

### `GET /transactions`

**Authentication:** Bearer token  
**Input:** No body or query parameters.

**Output — `200`:** `{"transactions":[{"id":1,"month":"2026-01","name":"gas","amount":40.87}]}`

### `POST /transactions`

**Authentication:** Bearer token  
**Input:** JSON with `month` (`YYYY-MM`), non-empty `name`, and non-negative
numeric `amount`.

**Output — `201`:** `{"id":1}` for the created transaction.

---

## `DELETE /transactions/{id}`

**Authentication:** Bearer token  
**Input:** Numeric transaction ID in the path; no body.

**Output — `204`:** No response body.

An unknown transaction returns `404`.

---

## `GET /reports/monthly-spending?month=YYYY-MM`

**Authentication:** Bearer token  
**Input:** Required `month` query parameter in `YYYY-MM` format; no body.

**Output — `200`:** Month totals and remaining balance.

```json
{
  "month":"2026-01",
  "budgeted":3000,
  "recurring_items_total":100,
  "transactions_total":40.87,
  "balance":2859.13
}
```

Invalid or missing month returns `400`.

---

## Calling a protected endpoint

```bash
curl http://localhost:8080/budgets/current \
  -H "Authorization: Bearer john-demo-token"
```

Missing or invalid tokens return `401` with `{"error":"..."}`. Unsupported
methods return `405`; unknown paths return `404`.
