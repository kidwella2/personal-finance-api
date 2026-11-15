<?php
require_once __DIR__ . '/../../7_Security/Basics/bearer/bearer_auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonError(405, 'Method not allowed. Use POST.');
}

$input = json_decode(file_get_contents('php://input'), true);
if (!isset($input['username']) || !isset($input['password'])) {
    sendJsonError(400, 'Username and password required');
}

$users = [
    'john' => 'Secret123',
    'admin' => 'Admin123',
];

$username = $input['username'];
$password = $input['password'];
if (!isset($users[$username]) || $users[$username] !== $password) {
    sendJsonError(401, 'Invalid username or password');
}

$demoTokens = [
    'john' => 'john-demo-token',
    'admin' => 'admin-demo-token',
];

sendJsonSuccess([
    'message' => 'Login successful',
    'token' => $demoTokens[$username],
    'user' => $username,
    'expires_in' => 3600,
]);