<?php
$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $items = $pdo->query('SELECT id, name, amount FROM recurring_items ORDER BY id')->fetchAll();
    foreach ($items as &$item) {
        $item['id'] = (int)$item['id'];
        $item['amount'] = (int)$item['amount'];
    }
    unset($item);

    echo json_encode(['items' => $items]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'));
    if (!is_object($input) || !property_exists($input, 'name') || !property_exists($input, 'amount')) {
        sendJsonError(400, 'name and amount are required');
    }
    if (!is_string($input->name) || trim($input->name) === '') {
        sendJsonError(400, 'name must be a non-empty string');
    }
    if (!is_int($input->amount) || $input->amount <= 0) {
        sendJsonError(400, 'amount must be a positive integer');
    }

    $statement = $pdo->prepare('INSERT INTO recurring_items (name, amount) VALUES (:name, :amount)');
    $statement->execute([':name' => trim($input->name), ':amount' => $input->amount]);

    http_response_code(201);
    echo json_encode(['id' => (int)$pdo->lastInsertId()]);
    exit;
}

$statement = $pdo->prepare('DELETE FROM recurring_items WHERE id = :id');
$statement->execute([':id' => $recurring_item_id]);
if ($statement->rowCount() === 0) {
    sendJsonError(404, 'Recurring item not found');
}

http_response_code(204);
