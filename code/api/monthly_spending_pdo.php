<?php
$month = $_GET['month'] ?? null;
if (!is_string($month) || !preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $month)) {
    sendJsonError(400, 'month must use YYYY-MM format');
}

$pdo = db();
$budget = $pdo->query('SELECT month, budget FROM current_budget WHERE id = 1')->fetch();
if (!$budget) {
    $budget = ['month' => date('Y-m'), 'budget' => 3000];
}
$budgeted = $budget['month'] === $month ? 0 + $budget['budget'] : 0;

$recurring_total = 0 + $pdo->query(
    'SELECT COALESCE(SUM(amount), 0) AS total FROM recurring_items'
)->fetchColumn();
$statement = $pdo->prepare(
    'SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE month = :month'
);
$statement->execute([':month' => $month]);
$transactions_total = 0 + $statement->fetchColumn();

$balance = round($budgeted - $recurring_total - $transactions_total, 2);
echo json_encode([
    'month' => $month,
    'budgeted' => $budgeted,
    'recurring_items_total' => $recurring_total,
    'transactions_total' => $transactions_total,
    'balance' => $balance,
]);
