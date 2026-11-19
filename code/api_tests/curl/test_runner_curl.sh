#!/bin/bash

#####################################################################
# Simple REST API Tests using CURL for Personal Finance API
# 
# This script demonstrates how to test REST APIs using CURL
# Educational purpose - shows basic API testing patterns
# 
# Make sure your PHP API server is running on http://localhost:8080
# FIXED VERSION: Compatible with macOS head command
#####################################################################

API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"
VERBOSE=false
API_TOKEN=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check command line arguments
if [[ "$1" == "--verbose" ]]; then
    VERBOSE=true
fi

# Helper function to extract JSON from curl response (macOS compatible)
extract_json_data() {
    local response="$1"
    # Use sed to remove the last line instead of head -n -1
    echo "$response" | sed '$d'
}

# Helper function to extract HTTP code from curl response
extract_http_code() {
    local response="$1"
    echo "$response" | tail -n1
}

# Helper function to print test results
print_result() {
    local test_name="$1"
    local success="$2"
    local message="$3"
    local data="$4"
    
    if [[ "$success" == "true" ]]; then
        echo -e "${GREEN}✅ $test_name: $message${NC}"
    else
        echo -e "${RED}❌ $test_name: $message${NC}"
    fi
    
    if [[ "$VERBOSE" == "true" && -n "$data" ]]; then
        echo -e "${CYAN}   Response: $data${NC}"
    fi
}

# Helper function to make CURL requests
make_curl_request() {
    local url="$1"
    local method="$2"
    local data="$3"
    local content_type="application/json"
    local auth_header=()

    if [[ -n "$API_TOKEN" ]]; then
        auth_header=(-H "Authorization: Bearer $API_TOKEN")
    fi
    
    if [[ -n "$data" ]]; then
        curl -s -w "\n%{http_code}" -X "$method" \
             -H "Content-Type: $content_type" \
             "${auth_header[@]}" \
             -d "$data" \
             "$url"
    else
        curl -s -w "\n%{http_code}" -X "$method" "${auth_header[@]}" "$url"
    fi
}

# Test 1.1: Server Connection
test_server_connection() {
    echo -e "${BLUE}Testing server connection...${NC}"
    
    local response=$(make_curl_request "$API_BASE_URL" "GET")
    local http_code=$(extract_http_code "$response")
    local json_data=$(extract_json_data "$response")
    
    if [[ "$http_code" == "200" ]]; then
        print_result "Server Connection" "true" "Server is responding correctly!" "$json_data"
        return 0
    else
        print_result "Server Connection" "false" "Server returned status $http_code" "$json_data"
        return 1
    fi
}

# Test 1.2: API Root Endpoint
test_api_root() {
    echo -e "${BLUE}Testing API root endpoint...${NC}"
    
    local response=$(make_curl_request "$API_BASE_URL" "GET")
    local http_code=$(extract_http_code "$response")
    local json_data=$(extract_json_data "$response")
    
    if [[ "$http_code" == "200" ]]; then
        # Check if response contains expected fields
        if echo "$json_data" | grep -q '"message"' && echo "$json_data" | grep -q '"endpoints"'; then
            print_result "API Root" "true" "API root returns expected structure!" "$json_data"
            return 0
        else
            print_result "API Root" "false" "API root missing expected fields" "$json_data"
            return 1
        fi
    else
        print_result "API Root" "false" "API root returned status $http_code" "$json_data"
        return 1
    fi
}

test_unauthorized_access() {
    echo -e "${BLUE}Testing GET /budgets/current without a token...${NC}"

    local response=$(make_curl_request "$API_BASE_URL/budgets/current" "GET")
    local http_code=$(extract_http_code "$response")
    local json_data=$(extract_json_data "$response")

    if [[ "$http_code" == "401" ]] && echo "$json_data" | grep -q '"error":'; then
        print_result "Unauthorized Access" "true" "Correctly returned 401" "$json_data"
        return 0
    fi
    print_result "Unauthorized Access" "false" "Expected 401, got $http_code" "$json_data"
    return 1
}

test_login() {
    echo -e "${BLUE}Testing POST /login...${NC}"

    local response=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d '{"username":"john","password":"Secret123"}' \
        "$API_BASE_URL/login")
    local http_code=$(extract_http_code "$response")
    local json_data=$(extract_json_data "$response")
    API_TOKEN=$(echo "$json_data" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

    if [[ "$http_code" == "200" && -n "$API_TOKEN" ]]; then
        print_result "Login" "true" "Received a bearer token" "$json_data"
        return 0
    fi
    print_result "Login" "false" "Login did not return a bearer token (HTTP $http_code)" "$json_data"
    return 1
}

# --- Failure-case tests ---

# Test 3.1: Unknown Resource
test_unknown_resource() {
    echo -e "${BLUE}Testing GET /teachers (unknown resource)...${NC}"

    local response=$(make_curl_request "$API_BASE_URL/teachers" "GET")
    local http_code=$(extract_http_code "$response")
    local json_data=$(extract_json_data "$response")

    if [[ "$http_code" == "404" ]]; then
        print_result "Unknown Resource" "true" "Correctly returned 404" "$json_data"
        return 0
    else
        print_result "Unknown Resource" "false" "Expected 404, got $http_code" "$json_data"
        return 1
    fi
}

# Test 3.2: Invalid (non-numeric) ID
test_invalid_id() {
    echo -e "${BLUE}Testing GET /budgets/recurring-items/abc (invalid id)...${NC}"

    local response=$(make_curl_request "$API_BASE_URL/budgets/recurring-items/abc" "GET")
    local http_code=$(extract_http_code "$response")
    local json_data=$(extract_json_data "$response")

    if [[ "$http_code" == "400" ]]; then
        print_result "Invalid ID" "true" "Correctly returned 400" "$json_data"
        return 0
    else
        print_result "Invalid ID" "false" "Expected 400, got $http_code" "$json_data"
        return 1
    fi
}

# Test 3.3: Missing Required Fields
test_missing_fields() {
    echo -e "${BLUE}Testing POST /transactions with {} (missing fields)...${NC}"

    local response=$(make_curl_request "$API_BASE_URL/transactions" "POST" '{}')
    local http_code=$(extract_http_code "$response")
    local json_data=$(extract_json_data "$response")

    if [[ "$http_code" == "400" ]] && echo "$json_data" | grep -q '"error":'; then
        print_result "Missing Fields" "true" "Correctly returned 400" "$json_data"
        return 0
    else
        print_result "Missing Fields" "false" "Expected 400, got $http_code" "$json_data"
        return 1
    fi
}

# Shared check for invalid request bodies: status and error response shape
test_bad_request_body() {
    local test_name="$1"
    local method="$2"
    local path="$3"
    local data="$4"

    echo -e "${BLUE}Testing $test_name...${NC}"
    local response=$(make_curl_request "$API_BASE_URL$path" "$method" "$data")
    local http_code=$(extract_http_code "$response")
    local json_data=$(extract_json_data "$response")

    if [[ "$http_code" == "400" ]] && echo "$json_data" | grep -q '"error":'; then
        print_result "$test_name" "true" "Got 400 with an error response" "$json_data"
        return 0
    else
        print_result "$test_name" "false" "Expected 400 with an error message, got $http_code" "$json_data"
        return 1
    fi
}

test_malformed_json() {
    test_bad_request_body "Malformed JSON" "POST" "/transactions" '{bad json'
}

test_array_body() {
    test_bad_request_body "Array Body" "POST" "/transactions" '[1,2]'
}

test_invalid_field_values() {
    test_bad_request_body "Invalid Field Values" "POST" "/transactions" '{"month":"invalid","name":" ","amount":-1}'
}

test_incomplete_put() {
    test_bad_request_body "Incomplete PUT" "PUT" "/budgets/current" '{"budget":3000}'
}

# Helper: request capturing full headers (for Allow header checks)
make_curl_request_with_headers() {
    local url="$1"
    local method="$2"
    local auth_header=()
    if [[ -n "$API_TOKEN" ]]; then
        auth_header=(-H "Authorization: Bearer $API_TOKEN")
    fi
    curl -s -i -X "$method" "${auth_header[@]}" "$url"
}

# Test 3.4: Method Not Allowed on an item path (expects an Allow header)
test_method_not_allowed_item() {
    echo -e "${BLUE}Testing POST /transactions/1 (method not allowed)...${NC}"

    local raw=$(make_curl_request_with_headers "$API_BASE_URL/transactions/1" "POST")
    local http_code=$(echo "$raw" | head -n 1 | grep -o '[0-9][0-9][0-9]')
    local allow_value=$(echo "$raw" | awk -F': ' 'tolower($1) == "allow" {gsub("\\r", "", $2); print $2}')

    if [[ "$http_code" == "405" && "$allow_value" == "DELETE" ]]; then
        print_result "Method Not Allowed (item)" "true" "Got 405 with Allow: $allow_value"
        return 0
    else
        print_result "Method Not Allowed (item)" "false" "Expected 405 + Allow header, got $http_code"
        return 1
    fi
}

# Test 3.5: Method Not Allowed on the collection path
test_method_not_allowed_collection() {
    echo -e "${BLUE}Testing PUT /transactions (method not allowed)...${NC}"

    local raw=$(make_curl_request_with_headers "$API_BASE_URL/transactions" "PUT")
    local http_code=$(echo "$raw" | head -n 1 | grep -o '[0-9][0-9][0-9]')
    local allow_value=$(echo "$raw" | awk -F': ' 'tolower($1) == "allow" {gsub("\\r", "", $2); print $2}')

    if [[ "$http_code" == "405" && "$allow_value" == "GET, POST" ]]; then
        print_result "Method Not Allowed (collection)" "true" "Got 405 with Allow: $allow_value"
        return 0
    else
        print_result "Method Not Allowed (collection)" "false" "Expected 405 + Allow header, got $http_code"
        return 1
    fi
}

# Check if CURL is available
check_curl() {
    if ! command -v curl &> /dev/null; then
        echo -e "${RED}ERROR: curl is not installed or not in PATH${NC}"
        echo "Please install curl to run these tests"
        echo ""
        echo "Installation:"
        echo "  Ubuntu/Debian: sudo apt-get install curl"
        echo "  CentOS/RHEL:   sudo yum install curl"
        echo "  MacOS:         curl is usually pre-installed"
        echo "  Windows:       Download from https://curl.se/windows/"
        exit 1
    else
        echo -e "${GREEN}curl is installed at:$(command -v curl)${NC}"
    fi
}

# Main test runner
run_all_tests() {
    echo -e "${MAGENTA}🚀 Starting REST API Tests using CURL${NC}"
    echo -e "${CYAN}API Base URL: $API_BASE_URL${NC}"
    echo ""
    
    local passed_tests=0
    local total_tests=0
    
    # Test 1: Server connection
    ((total_tests++))
    if test_server_connection; then
        ((passed_tests++))
    fi
    echo ""
    
    # Test 2: API root
    ((total_tests++))
    if test_api_root; then
        ((passed_tests++))
    fi
    echo ""

    ((total_tests++))
    if test_unauthorized_access; then
        ((passed_tests++))
    fi
    echo ""

    ((total_tests++))
    if test_login; then
        ((passed_tests++))
    fi
    echo ""
    
    # Failure cases (routing, input, and method validation)
    ((total_tests++))
    if test_unknown_resource; then
        ((passed_tests++))
    fi
    echo ""

    ((total_tests++))
    if test_invalid_id; then
        ((passed_tests++))
    fi
    echo ""

    ((total_tests++))
    if test_missing_fields; then
        ((passed_tests++))
    fi
    echo ""

    ((total_tests++))
    if test_malformed_json; then
        ((passed_tests++))
    fi
    echo ""

    ((total_tests++))
    if test_array_body; then
        ((passed_tests++))
    fi
    echo ""

    ((total_tests++))
    if test_invalid_field_values; then
        ((passed_tests++))
    fi
    echo ""

    ((total_tests++))
    if test_incomplete_put; then
        ((passed_tests++))
    fi
    echo ""

    ((total_tests++))
    if test_method_not_allowed_item; then
        ((passed_tests++))
    fi
    echo ""

    ((total_tests++))
    if test_method_not_allowed_collection; then
        ((passed_tests++))
    fi
    echo ""
    
    # Summary
    echo -e "${MAGENTA}📊 Test Summary${NC}"
    echo -e "${CYAN}Total Tests: $total_tests${NC}"
    echo -e "${GREEN}Passed: $passed_tests${NC}"
    echo -e "${RED}Failed: $((total_tests - passed_tests))${NC}"
    
    if [[ $passed_tests -eq $total_tests ]]; then
        echo -e "${GREEN}🎉 All tests passed!${NC}"
        exit 0
    else
        echo -e "${YELLOW}⚠️  Some tests failed. Check the output above.${NC}"
        exit 1
    fi
}

# Script entry point
echo -e "${CYAN}Simple REST API Testing Tool - CURL Version (macOS Compatible)${NC}"
echo ""

# Check prerequisites
check_curl

# Run the tests
run_all_tests
