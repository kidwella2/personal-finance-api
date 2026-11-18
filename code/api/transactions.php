<?php
$file = __DIR__ . '/data/transactions.json';
$transactions = [];

if (file_exists($file)) {
    $transactions = json_decode(file_get_contents($file), true);
    if (!is_array($transactions) || !array_is_list($transactions)) {
        sendJsonError(500, 'Could not read transactions');
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode(['transactions' => $transactions]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input) || !array_key_exists('month', $input) || !array_key_exists('name', $input) || !array_key_exists('amount', $input)) {
        sendJsonError(400, 'month, name and amount are required');
    }
    if (!is_string($input['month']) || !preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $input['month'])) {
        sendJsonError(400, 'month must use YYYY-MM format');
    }
    if (!is_string($input['name']) || trim($input['name']) === '') {
        sendJsonError(400, 'name must be a non-empty string');
    }
    if (!is_int($input['amount']) && !is_float($input['amount'])) {
        sendJsonError(400, 'amount must be a number');
    }
    if ($input['amount'] < 0) {
        sendJsonError(400, 'amount cannot be negative');
    }

    $next_id = 1;
    foreach ($transactions as $transaction) {
        if (isset($transaction['id']) && $transaction['id'] >= $next_id) {
            $next_id = $transaction['id'] + 1;
        }
    }

    $transactions[] = [
        'month' => $input['month'],
        'id' => $next_id,
        'name' => trim($input['name']),
        'amount' => $input['amount']
    ];
    if (file_put_contents($file, json_encode($transactions, JSON_PRETTY_PRINT), LOCK_EX) === false) {
        sendJsonError(500, 'Could not save transactions');
    }

    http_response_code(201);
    echo json_encode(['id' => $next_id]);
    exit;
}

foreach ($transactions as $index => $transaction) {
    if (isset($transaction['id']) && $transaction['id'] === $transaction_id) {
        array_splice($transactions, $index, 1);
        if (file_put_contents($file, json_encode($transactions, JSON_PRETTY_PRINT), LOCK_EX) === false) {
            sendJsonError(500, 'Could not save transactions');
        }

        http_response_code(204);
        exit;
    }
}

sendJsonError(404, 'Transaction not found');