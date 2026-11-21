#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

source ./ensure_install_packages.sh

case "${1:-}" in
    --mysql)
        [ "$#" -eq 1 ] || { echo "ERROR: Too many arguments." >&2; exit 1; }
        stop_mysql
        exit
        ;;
    ""|--php)
        [ "$#" -le 1 ] || { echo "ERROR: Too many arguments." >&2; exit 1; }
        ;;
    *) echo "ERROR: Unknown argument: $1" >&2; exit 1 ;;
esac

runtime_dir="$(runtime_directory "$(pwd -P)")"
if [ ! -d "$runtime_dir" ]; then
    echo "API is not running."
    exit 0
fi
if [ -L "$runtime_dir" ] || [ ! -O "$runtime_dir" ]; then
    echo "ERROR: Unsafe runtime directory: $runtime_dir" >&2
    exit 1
fi

for service in nginx php-fpm; do
    pid_file="$runtime_dir/$service.pid"
    config="$runtime_dir/$service.conf"
    if [ ! -f "$pid_file" ]; then
        continue
    fi
    pid="$(cat "$pid_file")"
    if ! process_matches "$pid" "$config"; then
        echo "ERROR: Cannot verify $service process in $pid_file; not stopping it." >&2
        exit 1
    fi
    if [ "$service" = nginx ]; then
        nginx -s quit -c "$config"
        for attempt in 1 2 3 4 5; do
            if ! process_matches "$pid" "$config"; then
                break
            fi
            sleep 1
        done
        if process_matches "$pid" "$config"; then
            echo "ERROR: NGINX did not stop; PHP-FPM was left running." >&2
            exit 1
        fi
    else
        kill -QUIT "$pid"
        for attempt in 1 2 3 4 5; do
            if ! process_matches "$pid" "$config"; then
                break
            fi
            sleep 1
        done
        if process_matches "$pid" "$config"; then
            echo "ERROR: PHP-FPM did not stop." >&2
            exit 1
        fi
    fi
done

echo "API stopped."
