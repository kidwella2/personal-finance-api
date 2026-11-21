#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

source "$(dirname "$0")/ensure_install_packages.sh"

for arg in "$@"; do
    case "$arg" in
        --pdo|--mysql|--no-reset) ;;
        *) echo "ERROR: Unknown argument: $arg" >&2; exit 1 ;;
    esac
done

if [ "$PLATFORM" = "mac" ]; then
    install_mac_packages
else
    install_ubuntu_packages
fi

start_mysql
configure_course_database
verify_installation
export MYSQL_PWD="$COURSE_PASS"
mysql -u "$COURSE_USER" "$COURSE_DB" < schema.sql || {
    echo "ERROR: Failed to ensure database schema for '$COURSE_DB'." >&2
    exit 1
}

echo "=========================================="
echo "Starting Finance API (MySQL)"
echo "URL:     http://localhost:8080/"
echo "Test UI: http://localhost:8080/finance_api_test.html"
echo "         (Access via HTTP; NEVER open as file://)"
echo "=========================================="

exec php -S localhost:8080
