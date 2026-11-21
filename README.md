# personal-finance-api

After cloning, run the commands below from the `personal-finance-api` folder
(the repository root). On Windows, use an Ubuntu WSL terminal for the scripts.

## Submitted version

The submitted version is the `main` branch containing this README. To see the
exact commit in your checkout, run `git rev-parse HEAD`.

## Setup, run, and test

Use macOS, Ubuntu 22.04/24.04, or Ubuntu on WSL2. If you haven't cloned the
repository yet, run:

```bash
git clone https://github.com/kidwella2/personal-finance-api.git
cd personal-finance-api
```

Set up the API and MySQL:

```bash
bash code/api/ensure_install_packages.sh
```

The setup may ask for an administrator or MySQL root password and may change
the password of the local `ase230` MySQL account.

Start NGINX and the API:

```bash
bash code/api/start_server.sh
```

Open the [API test page](http://localhost:8080/finance_api_test.html), click
**POST /login**, and use the buttons to test the endpoints.

Run the automated API tests:

```bash
node code/api_tests/javascript/test_runner.js
```

In Windows PowerShell, if Node.js is installed there, use
`node "code\api_tests\javascript\test_runner.js"`. The tests change database
data; there is no separate unit-test suite.

Stop the API:

```bash
bash code/api/stop_server.sh
```

See the [API guide](code/api/README.md) for more details.

## Repository layout

- `code/api/` contains the API, its runtime files, and setup instructions.
- `code/api_tests/` contains the API test runners.
- `code/nginx.conf` configures NGINX for the API.
- `presentation/` contains the endpoint tutorial.
- `plan/acceptance.md` contains the acceptance criteria.
