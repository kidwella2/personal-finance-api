#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

source ./ensure_install_packages.sh

for arg in "$@"; do
    case "$arg" in
        --pdo|--mysql|--no-reset) ;;
        *) echo "ERROR: Unknown argument: $arg" >&2; exit 1 ;;
    esac
done

if [ "$(id -u)" -eq 0 ]; then
    echo "ERROR: Run this script as your regular user, not root." >&2
    exit 1
fi

if [ "$PLATFORM" = "mac" ]; then
    install_mac_packages
    nginx_dir="$(brew --prefix)/etc/nginx"
    fpm="$(brew --prefix php)/sbin/php-fpm"
else
    install_ubuntu_packages
    nginx_dir="/etc/nginx"
    php_version="$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;')"
    fpm="$(command -v "php-fpm${php_version}")" || {
        echo "ERROR: PHP-FPM for PHP $php_version was not found." >&2
        exit 1
    }
fi

start_mysql
configure_course_database
verify_installation
MYSQL_PWD="$COURSE_PASS" mysql -u "$COURSE_USER" "$COURSE_DB" < schema.sql

api_dir="$(pwd -P)"
runtime_dir="$(runtime_directory "$api_dir")"
if [ -e "$runtime_dir" ] || [ -L "$runtime_dir" ]; then
    if [ ! -d "$runtime_dir" ] || [ -L "$runtime_dir" ] || [ ! -O "$runtime_dir" ]; then
        echo "ERROR: Unsafe runtime directory: $runtime_dir" >&2
        exit 1
    fi
else
    mkdir -m 700 "$runtime_dir"
fi
chmod 700 "$runtime_dir"

for pid_file in "$runtime_dir/nginx.pid" "$runtime_dir/php-fpm.pid"; do
    if [ -f "$pid_file" ]; then
        pid="$(cat "$pid_file")"
        if [ -z "$pid" ]; then
            rm "$pid_file"
            continue
        fi
        case "$pid" in
            *[!0-9]*) echo "ERROR: Invalid PID in $pid_file" >&2; exit 1 ;;
        esac
        if kill -0 "$pid" 2>/dev/null; then
            echo "ERROR: A process is already running for this API. Stop it first." >&2
            exit 1
        fi
        rm "$pid_file"
    fi
done

if [ -L "$runtime_dir/api" ]; then
    if [ "$(readlink "$runtime_dir/api")" != "$api_dir" ]; then
        echo "ERROR: Runtime directory belongs to another checkout: $runtime_dir" >&2
        exit 1
    fi
elif [ -e "$runtime_dir/api" ]; then
    echo "ERROR: Unexpected path: $runtime_dir/api" >&2
    exit 1
else
    ln -s "$api_dir" "$runtime_dir/api"
fi

escaped_nginx_dir="$(printf '%s' "$nginx_dir" | sed 's/[\\&|]/\\&/g')"
sed -e "s|@RUNTIME_DIR@|$runtime_dir|g" \
    -e "s|@NGINX_DIR@|$escaped_nginx_dir|g" ../nginx.conf > "$runtime_dir/nginx.conf"

cat > "$runtime_dir/php-fpm.conf" <<EOF
[global]
pid = $runtime_dir/php-fpm.pid
error_log = $runtime_dir/php-fpm.log
[www]
user = $(id -un)
group = $(id -gn)
listen = $runtime_dir/php-fpm.sock
pm = ondemand
pm.max_children = 5
pm.process_idle_timeout = 10s
clear_env = no
EOF

"$fpm" -t -y "$runtime_dir/php-fpm.conf"
nginx -t -c "$runtime_dir/nginx.conf"
"$fpm" -y "$runtime_dir/php-fpm.conf"
if ! nginx -c "$runtime_dir/nginx.conf"; then
    if [ -f "$runtime_dir/nginx.pid" ] && [ ! -s "$runtime_dir/nginx.pid" ]; then
        rm "$runtime_dir/nginx.pid"
    fi
    if ! bash ./stop_server.sh; then
        echo "ERROR: Could not stop the API processes." >&2
    fi
    echo "ERROR: NGINX failed to start." >&2
    exit 1
fi

if ! curl --fail --silent --show-error --max-time 5 http://127.0.0.1:8080/ >/dev/null; then
    echo "ERROR: The API did not respond. Stopping its processes." >&2
    if ! bash ./stop_server.sh; then
        echo "ERROR: Could not stop the API processes." >&2
    fi
    exit 1
fi

echo "API: http://localhost:8080/"
echo "Test page: http://localhost:8080/finance_api_test.html"
