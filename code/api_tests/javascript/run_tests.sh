#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$(cd "$SCRIPT_DIR/../../api" && pwd)"

echo "=========================================="
echo "REST API Testing Tool"
echo "=========================================="
echo ""
echo "Make sure your PHP API server is running:"
echo "  cd \"$API_DIR\""
echo "  php -S localhost:8080"
echo ""
echo "=========================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org"
    exit 1
fi

echo "Running API tests..."
echo ""
cd "$SCRIPT_DIR"
node test_runner.js

echo ""
echo "=========================================="
echo "Test completed!"
echo "=========================================="