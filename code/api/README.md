# Personal Finance API: Setup & Automation Guide

Run the commands below from the `personal-finance-api` folder (the repository
root). On Windows, use an Ubuntu WSL terminal for the scripts.

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

Use macOS, Ubuntu 22.04/24.04, or Ubuntu on WSL2. Open a terminal as your
regular user. If you haven't cloned the repository yet, run:

```bash
git clone https://github.com/kidwella2/personal-finance-api.git
cd personal-finance-api
```

From the repository root, run the setup script:

```bash
bash code/api/ensure_install_packages.sh
```

The script installs the required tools, starts MySQL, and creates the database
tables. It may ask for your administrator password or MySQL root password.
It uses the `finance_db` database and `ase230` account; it may change that
account's password.

---

## 2. Start the API

From the repository root, run:

```bash
bash code/api/start_server.sh
```

The script starts NGINX and PHP-FPM. If port 8080 is already in use, stop the
application using it and try again.

---

## 3. Test the API

### Test page

1. Open [http://localhost:8080/finance_api_test.html](http://localhost:8080/finance_api_test.html)
   in your browser. Do not open the HTML file directly.
2. Click **POST /login** using the filled-in username and password.
3. Click the other buttons to test the API. Results appear below each button.

### Automated tests

There is no separate unit-test suite. To run the API integration tests, return
to the repository root and run:

```bash
node code/api_tests/javascript/test_runner.js
```

On Windows, the same command is `node "code\api_tests\javascript\test_runner.js"`.
The tests change database data. Results appear in the terminal and in
`code/api_tests/javascript/test_results.txt`.

### Stop the API

From the repository root, run:

```bash
bash code/api/stop_server.sh
```

### Reset the database

To delete the API's saved data and start over:

```bash
bash code/api/reset_db.sh
```

---

## 4. Security & Configuration Notes

- **Dedicated User**: The application uses `'ase230'@'localhost'` with password `'ase230pass'`. This configuration is intended **strictly for local educational lab environments** for ease of learning; it should never be used in a production environment.
- **Password Handling**: Scripts use `MYSQL_PWD` instead of placing the password directly in command-line arguments. Note that environment variables may still be visible in shared process environments, which is acceptable for local single-user development.
- **Fail-Fast Error Handling**: The setup, server startup, and database reset scripts use `set -euo pipefail` so any command failure immediately stops execution rather than failing silently.

---

## 5. Troubleshooting & Complete Reinstallation

### Common Issues & Quick Fixes

Before considering reinstallation, check if your issue matches one of these common errors:

- **`Address already in use` (Port 8080)**: Stop the application already using port 8080 before starting NGINX.
- **MySQL Connection / Credentials Error**: If the database service stopped or credentials fell out of sync, re-run:
  ```bash
  bash code/api/ensure_install_packages.sh
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
bash code/api/ensure_delete_packages.sh
```

- **Safety Prompt**: In interactive mode, the script requires you to type `DELETE` in all capital letters before proceeding.
- **What It Purges**:
  - Stops MySQL service.
  - macOS: Runs `brew uninstall --force --ignore-dependencies` against `mysql`, `php`, and related packages (`php@...`, `mysql@...`, `mysql-client`, `mysql-client@...`). Removes `$brew_prefix/var/mysql`, `$brew_prefix/etc/php`, `$brew_prefix/etc/my.cnf`, and `$brew_prefix/etc/my.cnf.d`.  
    *(Warning: `--ignore-dependencies` may break other local tools that depend on Homebrew's PHP or MySQL).*
  - Ubuntu: Purges all matching packages (`php`, `php-*`, `php[0-9]*`, `mysql-*`, `default-mysql-*`) and deletes `/var/lib/mysql`, `/etc/mysql`, and `/etc/php`.
- **Post-Deletion Verification**: Clears command cache (`hash -r`) and verifies that `php`, `mysql`, `mysqld`, and `mysqladmin` are no longer in `PATH`.
- *(The `--yes` flag is reserved strictly for disposable CI/CD containers and virtual machines).*

After deletion, run `bash code/api/ensure_install_packages.sh` to perform a fresh Homebrew/APT-managed installation.
