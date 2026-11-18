<?php
$file = __DIR__ . '/data/current_budget.json';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $budget = ['month' => date('Y-m'), 'budget' => 3000];
    if (file_exists($file)) {
        $saved = json_decode(file_get_contents($file), true);
        if (!is_array($saved) || !isset($saved['month']) || !isset($saved['budget']) || !is_numeric($saved['budget'])) {
            sendJsonError(500, 'Could not read budget data');
        }
        $budget = $saved;
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

$budget = ['month' => $input->month, 'budget' => $input->budget];
$directory = dirname($file);
if (!is_dir($directory) && !mkdir($directory, 0755, true)) {
    sendJsonError(500, 'Could not save budget data');
}
$json = json_encode($budget, JSON_PRETTY_PRINT);
if ($json === false || file_put_contents($file, $json, LOCK_EX) === false) {
    sendJsonError(500, 'Could not save budget data');
}

http_response_code(200);
echo json_encode($budget);