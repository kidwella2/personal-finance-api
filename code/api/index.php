<?php
/**
 * Simple Finance Management REST API
 */
require_once __DIR__ . '/bearer_auth.php';

// Set JSON response header
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle OPTIONS request for CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/database.php';

// Parse the URL path
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = trim($path, '/');

// Remove 'api' from path if present
// This is useful if the API is accessed via an /api prefix
/*
if (strpos($path, 'api/') === 0) {
    $path = substr($path, 4);
}
*/

$segments = explode('/', $path);
$resource = $segments[0] ?? ''; // Resource name
$id = $segments[1] ?? null; // 123

// We can also use a more flexible approach to handle paths
// $path_parts = explode('/', trim($path, '/'));

// Get HTTP method
$method = $_SERVER['REQUEST_METHOD'];

// Simple routing
if (empty($resource)) {
    // Root endpoint - show API info
    echo json_encode([
        'success' => true,
        'message' => 'Simple Finance Management API',
        'endpoints' => [
            'POST /login' => 'Get a bearer token',
            'GET /budgets/current' => 'Get the current monthly budget',
            'PUT /budgets/current' => 'Create or replace the current monthly budget',
            'GET /budgets/recurring-items' => 'Get recurring budget items',
            'POST /budgets/recurring-items' => 'Create a recurring budget item',
            'DELETE /budgets/recurring-items/{id}' => 'Delete a recurring budget item',
            'GET /transactions' => 'Get transactions',
            'POST /transactions' => 'Create a transaction',
            'DELETE /transactions/{id}' => 'Delete a transaction',
            'GET /reports/monthly-spending?month=YYYY-MM' => 'Get monthly spending totals'
        ]
    ]);
    exit;
}

if ($resource === 'login') {
    if (count($segments) !== 1) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Resource not found']);
        exit;
    }
    require __DIR__ . '/login.php';
    exit;
}

if ($resource === 'budgets') {
    $recurring_item_id = null;
    if (count($segments) === 2 && $segments[1] === 'current') {
        $allowed = ['GET', 'PUT'];
        $budget_handler = 'budgets_pdo.php';
    } elseif (count($segments) >= 2 && count($segments) <= 3 && $segments[1] === 'recurring-items') {
        if (count($segments) === 3) {
            if (!ctype_digit($segments[2])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'Invalid recurring item ID']);
                exit;
            }
            $recurring_item_id = (int)$segments[2];
        }
        $allowed = $recurring_item_id === null ? ['GET', 'POST'] : ['DELETE'];
        $budget_handler = 'recurring_items_pdo.php';
    } else {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Resource not found']);
        exit;
    }

    if (!in_array($method, $allowed)) {
        header('Allow: ' . implode(', ', $allowed));
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        exit;
    }

    requireAuth();
    require __DIR__ . '/' . $budget_handler;
    exit;
}

if ($resource === 'transactions') {
    if (count($segments) > 2 || (isset($segments[1]) && !ctype_digit($segments[1]))) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Resource not found']);
        exit;
    }

    $transaction_id = isset($segments[1]) ? (int)$segments[1] : null;
    $allowed = $transaction_id === null ? ['GET', 'POST'] : ['DELETE'];
    if (!in_array($method, $allowed)) {
        header('Allow: ' . implode(', ', $allowed));
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        exit;
    }

    requireAuth();
    require __DIR__ . '/transactions_pdo.php';
    exit;
}

if ($resource === 'reports') {
    if (count($segments) !== 2 || $segments[1] !== 'monthly-spending') {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Resource not found']);
        exit;
    }

    if ($method !== 'GET') {
        header('Allow: GET');
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Method not allowed']);
        exit;
    }

    requireAuth();
    require __DIR__ . '/monthly_spending_pdo.php';
    exit;
}

http_response_code(404);
echo json_encode(['success' => false, 'error' => 'Resource not found']);
