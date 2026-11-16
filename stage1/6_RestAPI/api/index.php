<?php
/**
 * Simple Finance Management REST API
 * 
 * This is a basic example for learning REST API concepts
 * 
 * Available endpoints:
 * GET    /students      - Get all students
 * GET    /students/{id} - Get student by ID
 * POST   /students      - Create new student
 * PUT    /students/{id} - Update student
 * DELETE /students/{id} - Delete student
 */

// Use JSON while learning the REST structure. Set FINANCE_STORAGE=pdo to
// reuse the Week 3 PDO pattern with MySQL for the Project 1 bridge.
$storage = getenv('FINANCE_STORAGE') ?: 'json';
require_once $storage === 'pdo'
    ? __DIR__ . '/handlers_pdo.php'
    : __DIR__ . '/handlers.php';
require_once __DIR__ . '/../../7_Security/Basics/bearer/bearer_auth.php';

// Set JSON response header
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle OPTIONS request for CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Parse the URL path
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = trim($path, '/');

// Remove 'api' from path if present
// This is useful if the API is accessed via a prefix like /api/students
/* 
if (strpos($path, 'api/') === 0) {
    $path = substr($path, 4);
}
*/

$segments = explode('/', $path);
$resource = $segments[0] ?? ''; // students
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
            'GET /students' => 'Get all students',
            'GET /students/{id}' => 'Get student by ID',
            'POST /students' => 'Create new student',
            'PUT /students/{id}' => 'Update student',
            'DELETE /students/{id}' => 'Delete student',
            'GET /budgets/current' => 'Get the current monthly budget',
            'PUT /budgets/current' => 'Create or replace the current monthly budget',
            'GET /budgets/recurring-items' => 'Get recurring budget items',
            'POST /budgets/recurring-items' => 'Create a recurring budget item',
            'DELETE /budgets/recurring-items/{id}' => 'Delete a recurring budget item',
            'GET /transactions' => 'Get transactions',
            'POST /transactions' => 'Create a transaction',
            'DELETE /transactions/{id}' => 'Delete a transaction',
            'GET /reports/monthly-spending?month=YYYY-MM' => 'Get monthly spending totals',
            'POST /login' => 'Get a bearer token'
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
        $budget_handler = 'budgets.php';
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
        $budget_handler = 'recurring_items.php';
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
    require __DIR__ . '/transactions.php';
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
    require __DIR__ . '/monthly_spending.php';
    exit;
}

if ($resource !== 'students') {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Resource not found']);
    exit;
}

if (count($segments) > 2) {
    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Resource not found']);
    exit;
}

$student_id = null;
if (isset($segments[1]) && $segments[1] !== '') {
    if (!ctype_digit($segments[1])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid student ID']);
        exit;
    }
    $student_id = (int)$segments[1];
}

// Each path allows a different set of methods, so we check that first and
// reply with 405 + Allow for anything else, instead of hard-coding one list.
$allowed = ($student_id !== null) ? ['GET', 'PUT', 'DELETE'] : ['GET', 'POST'];

if (!in_array($method, $allowed)) {
    header('Allow: ' . implode(', ', $allowed));
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

requireAuth();

switch ($method) {
    case 'GET':
        if ($student_id !== null) {
            get_student($student_id);
        } else {
            get_all_students();
        }
        break;

    case 'POST':
        create_student();
        break;

    case 'PUT':
        update_student($student_id);
        break;

    case 'DELETE':
        delete_student($student_id);
        break;
}
