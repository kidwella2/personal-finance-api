<?php
$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $transactions = $pdo->query(
        'SELECT id, month, name, amount FROM transactions ORDER BY id'
    )->fetchAll();
    foreach ($transactions as &$transaction) {
        $transaction['id'] = (int)$transaction['id'];
        $transaction['amount'] = 0 + $transaction['amount'];
    }
    unset($transaction);

    echo json_encode(['transactions' => $transactions]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input) || !array_key_exists('month', $input) ||
        !array_key_exists('name', $input) || !array_key_exists('amount', $input)) {
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

    $statement = $pdo->prepare(
        'INSERT INTO transactions (month, name, amount) VALUES (:month, :name, :amount)'
    );
    $statement->execute([
        ':month' => $input['month'],
        ':name' => trim($input['name']),
        ':amount' => $input['amount'],
    ]);

    http_response_code(201);
    echo json_encode(['id' => (int)$pdo->lastInsertId()]);
    exit;
}

$statement = $pdo->prepare('DELETE FROM transactions WHERE id = :id');
$statement->execute([':id' => $transaction_id]);
if ($statement->rowCount() === 0) {
    sendJsonError(404, 'Transaction not found');
}

http_response_code(204);
