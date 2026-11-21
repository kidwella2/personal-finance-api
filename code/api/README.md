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

## 1. Set up

Use Ubuntu 24.04 or Ubuntu 24.04 on WSL2. Open a terminal and keep it open
until you finish the steps below. Run the commands in each box in order. If a
command reports an error, fix it before continuing.

These steps use a MySQL database named `finance_db` and an account named
`ase230`. The setup can change that account's password, and the tests change
database data. Use a separate Ubuntu environment if you already use them.

Install the required software:

```bash
sudo apt-get update
sudo apt-get install -y git nodejs npm nginx php-cli php-fpm php-mysql mysql-server default-mysql-client nano curl
```

Download the project to a temporary directory that NGINX can read:

```bash
# mktemp replaces the Xs with random characters.
WORKDIR=$(mktemp -d /tmp/finance-api.XXXXXX)
chmod 755 "$WORKDIR"
umask 022
cd "$WORKDIR"
git clone https://github.com/kidwella2/personal-finance-api.git
cd personal-finance-api/code/api
```

Set up MySQL and create the tables:

```bash
bash ensure_install_packages.sh &&
MYSQL_PWD=ase230pass mysql -u ase230 finance_db < schema.sql
```

---

## 2. Start the API

Start PHP-FPM and copy the NGINX configuration:

```bash
PHP_VERSION=$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;')
sudo service "php${PHP_VERSION}-fpm" start
# mktemp replaces the Xs with random characters.
NGINX_CONFIG=$(mktemp /tmp/finance-nginx.XXXXXX.conf)
cp ../nginx.conf "$NGINX_CONFIG"
sed -i "s|^pid .*|pid $WORKDIR/nginx.pid;|" "$NGINX_CONFIG"
```

The next two commands print the paths you need for your computer:

```bash
pwd -P
echo "/run/php/php${PHP_VERSION}-fpm.sock"
```

Open the copied configuration:

```bash
nano "$NGINX_CONFIG"
```

1. Find the `root` line. Replace the path inside the quotes with the first
   path printed above. Keep the quotes and semicolon.
2. Find the `fastcgi_pass` line. Replace the path after `unix:` with the
   second path printed above. Keep `unix:` and the semicolon.
3. Press **Ctrl+O**, then **Enter** to save. Press **Ctrl+X** to exit.

Check the configuration and start NGINX:

```bash
sudo nginx -t -c "$NGINX_CONFIG" &&
sudo nginx -c "$NGINX_CONFIG"
```

If the check reports an error, fix it before starting NGINX. If port 8080 is
already in use, stop the application using it first.

The configuration follows the ASE230
[NGINX and PHP-FPM example](https://github.com/nkuase/ase230/blob/main/module1/code/5_Webserver_using_NGINX/nginx.conf).

---

## 3. Test the API

### Test page

1. Open [http://localhost:8080/finance_api_test.html](http://localhost:8080/finance_api_test.html)
   in your browser. Do not open the HTML file directly.
2. Click **POST /login** using the filled-in username and password.
3. Click the other buttons to test the API. Results appear below each button.

### Automated tests

There is no separate unit-test suite. To run the API integration tests, return
to the same terminal and run:

```bash
curl --fail -sS -X PUT http://127.0.0.1:8080/budgets/current \
  -H "Authorization: Bearer john-demo-token" \
  -H "Content-Type: application/json" \
  -d '{"month":"2026-11","budget":3000}' &&
cd ../api_tests/javascript &&
NODE_OPTIONS=--dns-result-order=ipv4first npm test
```

The first command sets the budget expected by the tests. The test summary
appears in the terminal and in `test_results.txt`.

### Stop the API

When finished, run this command in the same terminal:

```bash
sudo nginx -s quit -c "$NGINX_CONFIG"
```

### Reset the database

To delete the API's saved data and start over:

```bash
cd "$WORKDIR/personal-finance-api/code/api"
bash reset_db.sh
```

---

## 4. How the Automation Scripts Work

The scripts in this directory provide repeatable setup automation without manual package management.

### `start_server.sh`
- This optional script starts PHP's built-in server, not NGINX.
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
- This script is not intended for NGINX and may kill processes on port 8080;
  use the NGINX stop command above.
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

- **`Address already in use` (Port 8080)**: Stop the application already using port 8080 before starting NGINX.
- **Node.js cannot connect to localhost**: On Node.js 17 or newer, try
  `NODE_OPTIONS=--dns-result-order=ipv4first npm test` to match NGINX's IPv4 listener.
- **MySQL Connection / Credentials Error**: If the database service stopped or credentials fell out of sync, re-run:
  ```bash
  bash ensure_install_packages.sh
  ```
- **Web page does not load in browser**: Ensure NGINX and PHP-FPM are running and navigate to `http://localhost:8080/finance_api_test.html`. Do not open the HTML file directly from your operating system's file manager (`file:///...`).
- **If problems persist**: Only after the steps above fail should you consider the complete reinstallation below.

---

### Complete Reinstallation (Advanced / Emergency Only)

> [!CAUTION]
> **DANGER: Read carefully before running `ensure_delete_packages.sh`!**  
> This script is an **emergency recovery tool**, NOT part of the normal daily workflow.  
> Running `ensure_delete_packages.sh` permanently uninstalls PHP and MySQL, and **deletes all local MySQL databases, configuration files, and data directories managed by Homebrew/APT**, not just `finance_db`. Other personal or course projects using local MySQL will be permanently lost.

Use this script only if your PHP or MySQL installation is severely corrupted and you need to reset to a clean state.

```bash
# 1. Stop NGINX using the command above and stop any PHP development server

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

After deletion, run `bash ensure_install_packages.sh` to perform a fresh Homebrew/APT-managed installation.
