<?php
$pdo = db();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $budget = $pdo->query('SELECT month, budget FROM current_budget WHERE id = 1')->fetch();
    if (!$budget) {
        $budget = ['month' => date('Y-m'), 'budget' => 3000];
    } else {
        $budget['budget'] = 0 + $budget['budget'];
    }

    echo json_encode($budget);
    exit;
}

$input = json_decode(file_get_contents('php://input'));
if (!is_object($input)) {
    sendJsonError(400, 'Body must be a valid JSON object');
}
if (!property_exists($input, 'month')) {
    sendJsonError(400, 'month is required');
}
if (!property_exists($input, 'budget')) {
    sendJsonError(400, 'budget is required');
}
if (!is_string($input->month) || !preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $input->month)) {
    sendJsonError(400, 'month must use YYYY-MM format');
}
if (!is_int($input->budget) && !is_float($input->budget)) {
    sendJsonError(400, 'budget must be a number');
}

$statement = $pdo->prepare(
    'INSERT INTO current_budget (id, month, budget) VALUES (1, :month, :budget) ' .
    'ON DUPLICATE KEY UPDATE month = :updated_month, budget = :updated_budget'
);
$statement->execute([
    ':month' => $input->month,
    ':budget' => $input->budget,
    ':updated_month' => $input->month,
    ':updated_budget' => $input->budget,
]);

http_response_code(200);
echo json_encode(['month' => $input->month, 'budget' => $input->budget]);
