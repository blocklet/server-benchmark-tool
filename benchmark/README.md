# @blocklet/benchmark

A powerful, flexible HTTP API benchmarking tool tailored for Blocklet and general Node.js services. Supports multiple modes (RPS, concurrency), ramp-up testing, AI-powered analysis, and outputs performance charts and logs.

## 📦 Installation

```bash
npm install -g @blocklet/benchmark
```

Or use it directly via `npx`:

```bash
npx @blocklet/benchmark
```

## 🚀 Quick Start

### Step 1: Initialize Config File

```bash
npx @blocklet/benchmark init --type server
```

Other available types:

- `discuss-kit`
- `tool`
- You can also combine them: `--type server,tool`

This will generate a `benchmark.yml` file in your current directory.

### Step 2: Run the Benchmark

```bash
npx @blocklet/benchmark run
```

Options:

| Option     | Description                                | Default         |
| ---------- | ------------------------------------------ | --------------- |
| `--config` | Path to config file                        | `benchmark.yml` |
| `--format` | Output format: `row`, `json`, or `table`   | `table`         |
| `--mode`   | Benchmark mode: `rps`, `concurrent`, `all` | `all`           |

## 🧩 Configuration

Here's a sample `benchmark.yml` and explanation of the fields:

```yaml
origin: https://example.blocklet.dev
concurrency: 100
timelimit: 20
ramp: 20
data:
  loginToken: your-login-token
  teamDid: your-team-did
  userDid: your-user-did
body: '{"example": true}'
logError: true
logResponse: false
aiAnalysis:
  enable: true
  language: en
  techStack: node.js
  model: gpt-4o
apis:
  - name: Get User Info
    api: /api/user/info
    method: GET
    assert:
      id: not-null
  - name: Update Status
    api: /api/status
    method: POST
    body: '{"status": "ok"}'
    assert:
      success: true
```

### Top-Level Fields

| Field         | Description                                                                   |
| ------------- | ----------------------------------------------------------------------------- |
| `origin`      | Base URL of the API server                                                    |
| `concurrency` | Number of concurrent users                                                    |
| `timelimit`   | Duration of the test per mode (in seconds)                                    |
| `ramp`        | (Optional) Ramp step to gradually increase concurrency                        |
| `data`        | Dynamic values to be injected into API paths or headers                       |
| `body`        | Default request body                                                          |
| `logError`    | Print error logs to console                                                   |
| `logResponse` | Print full API responses                                                      |
| `aiAnalysis`  | Enable GPT-powered result interpretation (requires `OPENAI_CLIENT` in `.env`) |

### API List (`apis`)

Each item defines one endpoint to test:

| Field    | Description                                                           |
| -------- | --------------------------------------------------------------------- |
| `name`   | Human-readable name of the test case                                  |
| `api`    | API path (joined with `origin`)                                       |
| `method` | HTTP method (GET, POST, etc.)                                         |
| `body`   | Request body (if POST/PUT)                                            |
| `assert` | Assertions on response (supports `not-null`, `null`, or fixed values) |
| `only`   | If true, run **only** this endpoint                                   |
| `skip`   | If true, skip this endpoint                                           |

## 📊 Output

All results are saved to the `benchmark-output` folder:

- `benchmark.log`: All logs
- `0-benchmark-raw.yml`: Raw result file
- `*.png`: Chart images (RPS, latency percentiles)
- `console output`: A summary table of all benchmark results

If `aiAnalysis` is enabled and `OPENAI_CLIENT` is set in `.env`, a GPT-powered summary of the test will be provided in the console.

## 📘 License

MIT License
