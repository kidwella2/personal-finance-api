<?php
$month = $_GET['month'] ?? null;
if (!is_string($month) || !preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $month)) {
    sendJsonError(400, 'month must use YYYY-MM format');
}

$budget = ['month' => date('Y-m'), 'budget' => 3000];
$budget_file = __DIR__ . '/data/current_budget.json';
if (file_exists($budget_file)) {
    $saved_budget = json_decode(file_get_contents($budget_file), true);
    if (!is_array($saved_budget) || !isset($saved_budget['month'], $saved_budget['budget']) || !is_numeric($saved_budget['budget'])) {
        sendJsonError(500, 'Could not read budget data');
    }
    $budget = $saved_budget;
}
$budgeted = $budget['month'] === $month ? 0 + $budget['budget'] : 0;

$recurring_file = __DIR__ . '/data/recurring_items.json';
$recurring_items = file_exists($recurring_file) ? json_decode(file_get_contents($recurring_file), true) : [];
if (!is_array($recurring_items) || !array_is_list($recurring_items)) {
    sendJsonError(500, 'Could not read recurring items');
}

$transactions_file = __DIR__ . '/data/transactions.json';
$transactions = file_exists($transactions_file) ? json_decode(file_get_contents($transactions_file), true) : [];
if (!is_array($transactions) || !array_is_list($transactions)) {
    sendJsonError(500, 'Could not read transactions');
}

$recurring_total = 0;
foreach ($recurring_items as $item) {
    if (!is_array($item) || !isset($item['amount']) || !is_numeric($item['amount'])) {
        sendJsonError(500, 'Could not read recurring items');
    }
    $recurring_total += $item['amount'];
}

$transactions_total = 0;
foreach ($transactions as $transaction) {
    if (!is_array($transaction) || !isset($transaction['amount']) || !is_numeric($transaction['amount'])) {
        sendJsonError(500, 'Could not read transactions');
    }
    if (isset($transaction['month']) && $transaction['month'] === $month) {
        $transactions_total += $transaction['amount'];
    }
}

$balance = round($budgeted - $recurring_total - $transactions_total, 2);
echo json_encode([
    'month' => $month,
    'budgeted' => $budgeted,
    'recurring_items_total' => $recurring_total,
    'transactions_total' => $transactions_total,
    'balance' => $balance
]);