<?php
$file = __DIR__ . '/data/recurring_items.json';
$items = [];

if (file_exists($file)) {
    $items = json_decode(file_get_contents($file), true);
    if (!is_array($items) || !array_is_list($items)) {
        sendJsonError(500, 'Could not read recurring items');
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
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

    $next_id = 1;
    foreach ($items as $item) {
        if (isset($item['id']) && $item['id'] >= $next_id) {
            $next_id = $item['id'] + 1;
        }
    }

    $items[] = ['id' => $next_id, 'name' => trim($input->name), 'amount' => $input->amount];
    if (file_put_contents($file, json_encode($items, JSON_PRETTY_PRINT), LOCK_EX) === false) {
        sendJsonError(500, 'Could not save recurring items');
    }

    http_response_code(201);
    echo json_encode(['id' => $next_id]);
    exit;
}

foreach ($items as $index => $item) {
    if (isset($item['id']) && $item['id'] === $recurring_item_id) {
        array_splice($items, $index, 1);
        if (file_put_contents($file, json_encode($items, JSON_PRETTY_PRINT), LOCK_EX) === false) {
            sendJsonError(500, 'Could not save recurring items');
        }

        http_response_code(204);
        exit;
    }
}

sendJsonError(404, 'Recurring item not found');