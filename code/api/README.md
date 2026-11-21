# Personal Finance API: Setup & Automation Guide

An educational REST API written in PHP backed by MySQL via PDO.

```txt
HTTP Request ───► index.php ───► PDO endpoints ───► MySQL (finance_db)
```

### API Endpoints

| Method | Endpoint | Description | Request Body |
|---|---|---|---|
| `GET` | `/` | Show API information and available endpoints | None |
| `POST` | `/login` | Exchange demo credentials for a bearer token | `{"username": "john", "password": "Secret123"}` |
| `GET` | `/budgets/current` | Get the current monthly budget | None |
| `PUT` | `/budgets/current` | Replace the current monthly budget | `{"month":"YYYY-MM","budget":3000}` |
| `GET` | `/budgets/recurring-items` | List recurring budget items | None |
| `POST` | `/budgets/recurring-items` | Create a recurring budget item | `{"name":"electric","amount":100}` |
| `DELETE` | `/budgets/recurring-items/{id}` | Delete a recurring budget item | None |
| `GET` | `/transactions` | List transactions | None |
| `POST` | `/transactions` | Create a transaction | `{"month":"YYYY-MM","name":"gas","amount":40.87}` |
| `DELETE` | `/transactions/{id}` | Delete a transaction | None |
| `GET` | `/reports/monthly-spending?month=YYYY-MM` | Get monthly spending totals | None |

All finance data endpoints require `Authorization: Bearer <token>`. Login reuses
the demo accounts `john` / `Secret123` and `admin` / `Admin123`
and returns the fixed demo tokens `john-demo-token` and `admin-demo-token`.
This is only a local learning example: tokens do not expire, even though the
response includes the demo `expires_in` field.

---

## 1. Quick Start

Get the entire development environment and API server running in three commands:

```bash
# From the code directory:
cd api

# One-time setup: install packages, configure database, and verify tools
./ensure_install_packages.sh

# Start the API server
./start_server.sh
```

- **Keep this terminal window open** while the server is running.
- **Open the test UI** in your browser: `http://localhost:8080/finance_api_test.html`
- **To stop the server**: Press `Ctrl+C` in the server terminal, or open a second terminal and run `./stop_server.sh`.

> [!NOTE]
> The first setup may take several minutes. macOS or Ubuntu may ask for your computer administrator password (`sudo`). On macOS, an existing protected MySQL installation may also require its MySQL root password.

---

## 2. Daily Development Workflow

Run the API with MySQL storage:
```bash
./start_server.sh
```
- Automatically starts the MySQL service if stopped.
- Connects using the dedicated course user (`ase230`), ensures `finance_db` and its tables exist, and preserves existing records.
- `--pdo`, `--mysql`, and `--no-reset` remain accepted for compatibility.

### Resetting Data Between Test Runs
To reset the SQL data between test runs:
```bash
# Reset the MySQL database (finance_db); this deletes existing records:
./reset_db.sh
```

### Stopping Server and Background Services
When finished working, stop the development server and background database service cleanly:
```bash
# Stop both PHP development server (port 8080) and MySQL service:
./stop_server.sh

# Stop only the PHP server (leaves MySQL running):
./stop_server.sh --php

# Stop only the MySQL service (leaves PHP running):
./stop_server.sh --mysql
```

---

## 3. Testing the API

Once the server is running at `http://localhost:8080`, test endpoints using either the browser UI or the automated test suite.

To log in directly, send:

```bash
curl -X POST http://localhost:8080/login \
  -H "Content-Type: application/json" \
  -d '{"username":"john","password":"Secret123"}'
```

Use the returned `token` value on later requests:

```bash
curl http://localhost:8080/budgets/current \
  -H "Authorization: Bearer YOUR_TOKEN"
```

When using NGINX with PHP-FPM, forward the Authorization header inside the PHP
location so PHP can validate the bearer token:

```nginx
fastcgi_param HTTP_AUTHORIZATION $http_authorization;
```

### Option A: Web Test UI (Browser)
Open the visual test page in your web browser:
```txt
http://localhost:8080/finance_api_test.html
```

> [!CAUTION]
> **Never open `finance_api_test.html` directly from your file manager (`file:///...`)!**
> Browser security (CORS) treats local `file://` files as untrusted origins and may block requests to `http://localhost:8080`. You must open it through the HTTP server URL above.

### Option B: Automated Node.js Test Runner
From the `api/` directory, run the finance API tests:
```bash
cd ../api_tests/javascript
npm test
```
The runner covers the finance endpoints, including validation failures and method restrictions, and prints its results to the terminal.

---

## 4. How the Automation Scripts Work

The scripts in this directory provide repeatable setup automation without manual package management.

### `start_server.sh`
- **Orchestrator**: Sources `ensure_install_packages.sh` to load environment variables and helper functions.
- **Dependency Guard**: Calls `install_mac_packages` or `install_ubuntu_packages` to ensure required binaries are installed.
- **Service & DB Guard**: Ensures MySQL daemon is running (`start_mysql`), ensures database/user exists (`configure_course_database`), and verifies connectivity (`verify_installation`).
- **Safety**: Uses `set -euo pipefail` to halt immediately if database reset or setup fails.
- **Runtime**: Runs `php -S localhost:8080`.

### `reset_db.sh`
- **State Hygiene**: Clears stale data to prevent failures caused by records from previous test runs.
- **MySQL**: Drops and recreates `finance_db`, then imports the finance tables from `schema.sql`.
- **Safety**: Uses `set -euo pipefail` and explicit error checks on schema import. If database recreation fails, it exits with an error and never prints `Done.`.

### `stop_server.sh`
- **Port Cleanup**: Uses `pkill -f "php -S.*8080"` and `lsof` to find and terminate processes listening on port 8080.
- **Service Teardown**: Gracefully stops the MySQL daemon via Homebrew (`brew services stop mysql`) or system service (`service mysql stop`).

### `ensure_install_packages.sh`
- **Platform Detection**: Identifies macOS (`Darwin`) and evaluates Homebrew shellenv (`/opt/homebrew` or `/usr/local`). Identifies Ubuntu Linux / WSL2 via `/etc/os-release` (`ID=ubuntu`).
- **Batch Installation**:
  - macOS: Checks `php` and `mysql` separately with `brew list --versions`, then installs whichever formula is missing.
  - Ubuntu: Uses `apt-get install -y php-cli php-mysql mysql-server default-mysql-client`.
- **Service Health (`is_mysql_running`)**: Uses `mysqladmin ping` exit code to confirm MySQL daemon responsiveness independently from user login.
- **Dedicated Course Account (`configure_course_database`)**:
  - Creates database `finance_db` and user `'ase230'@'localhost'`.
  - Uses `ALTER USER` to synchronize the password (`ase230pass`) and `GRANT` to synchronize permissions on `finance_db.*`.
  - **Does not modify system `root`**, protecting existing personal projects and system databases.
- **Strict 4-Step Verification (`verify_installation`)**:
  Fails fast with exit code `1` if any check fails:
  1. `php -v` (PHP CLI execution)
  2. `class_exists('PDO')` (PDO extension available)
  3. `extension_loaded('pdo_mysql')` (PDO MySQL driver loaded)
  4. `mysql -u ase230 finance_db -e "SELECT 1;"` (database connectivity verified)

---

## 5. Security & Configuration Notes

- **Dedicated User**: The application uses `'ase230'@'localhost'` with password `'ase230pass'`. This configuration is intended **strictly for local educational lab environments** for ease of learning; it should never be used in a production environment.
- **Password Handling**: Scripts use `MYSQL_PWD` instead of placing the password directly in command-line arguments. Note that environment variables may still be visible in shared process environments, which is acceptable for local single-user development.
- **Fail-Fast Error Handling**: The setup, server startup, and database reset scripts use `set -euo pipefail` so any command failure immediately stops execution rather than failing silently.

---

## 6. Troubleshooting & Complete Reinstallation

### Common Issues & Quick Fixes

Before considering reinstallation, check if your issue matches one of these common errors:

- **`Permission denied: ./...sh`**: The shell scripts may need executable permissions. Run:
  ```bash
  chmod +x *.sh
  ```
- **`Address already in use` (Port 8080)**: A previous PHP server process is holding port 8080. Stop it with:
  ```bash
  ./stop_server.sh --php
  ```
- **MySQL Connection / Credentials Error**: If the database service stopped or credentials fell out of sync, re-run:
  ```bash
  ./ensure_install_packages.sh
  ```
- **Web page does not load in browser**: Ensure the server is actively running (`./start_server.sh`) and navigate to `http://localhost:8080/finance_api_test.html`. Do not open the HTML file directly from your operating system's file manager (`file:///...`).
- **If problems persist**: Only after the steps above fail should you consider the complete reinstallation below.

---

### Complete Reinstallation (Advanced / Emergency Only)

> [!CAUTION]
> **DANGER: Read carefully before running `ensure_delete_packages.sh`!**  
> This script is an **emergency recovery tool**, NOT part of the normal daily workflow.  
> Running `ensure_delete_packages.sh` permanently uninstalls PHP and MySQL, and **deletes all local MySQL databases, configuration files, and data directories managed by Homebrew/APT**, not just `finance_db`. Other personal or course projects using local MySQL will be permanently lost.

Use this script only if your PHP or MySQL installation is severely corrupted and you need to reset to a clean state.

```bash
# 1. Stop any running PHP server first
./stop_server.sh

# 2. Run the interactive uninstaller
./ensure_delete_packages.sh
```

- **Safety Prompt**: In interactive mode, the script requires you to type `DELETE` in all capital letters before proceeding.
- **What It Purges**:
  - Stops MySQL service.
  - macOS: Runs `brew uninstall --force --ignore-dependencies` against `mysql`, `php`, and related packages (`php@...`, `mysql@...`, `mysql-client`, `mysql-client@...`). Removes `$brew_prefix/var/mysql`, `$brew_prefix/etc/php`, `$brew_prefix/etc/my.cnf`, and `$brew_prefix/etc/my.cnf.d`.  
    *(Warning: `--ignore-dependencies` may break other local tools that depend on Homebrew's PHP or MySQL).*
  - Ubuntu: Purges all matching packages (`php`, `php-*`, `php[0-9]*`, `mysql-*`, `default-mysql-*`) and deletes `/var/lib/mysql`, `/etc/mysql`, and `/etc/php`.
- **Post-Deletion Verification**: Clears command cache (`hash -r`) and verifies that `php`, `mysql`, `mysqld`, and `mysqladmin` are no longer in `PATH`.
- *(The `--yes` flag is reserved strictly for disposable CI/CD containers and virtual machines).*

After deletion, run `./ensure_install_packages.sh` to perform a fresh Homebrew/APT-managed installation.
