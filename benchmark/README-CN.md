# @blocklet/benchmark

A powerful, flexible HTTP API benchmarking tool tailored for Blocklet and general Node.js services. Supports multiple modes (RPS, concurrency), ramp-up testing, AI-powered analysis, and outputs performance charts and logs.

一个强大且灵活的 HTTP API 压测工具，专为 Blocklet 和通用 Node.js 服务设计。支持多种模式（RPS、并发）、逐步升压测试、AI 分析，并输出性能图表与日志。

## 📦 Installation 安装

```bash
npm install -g @blocklet/benchmark
```

Or use it directly via `npx`:  
或者使用 `npx` 直接运行：

```bash
npx @blocklet/benchmark
```

## 🚀 Quick Start 快速开始

### Step 1: Initialize Config File

第一步：初始化配置文件

```bash
npx @blocklet/benchmark init --type server
```

Other available types:  
其他可用类型：

- `discuss-kit`
- `tool`
- 你也可以组合使用：`--type server,tool`

这将在当前目录生成一个 `benchmark.yml` 配置文件。

### Step 2: Run the Benchmark

第二步：运行压测

```bash
npx @blocklet/benchmark run
```

Options 选项说明：

| Option     | Description                                | Default         | 说明                                      |
| ---------- | ------------------------------------------ | --------------- | ----------------------------------------- |
| `--config` | Path to config file                        | `benchmark.yml` | 配置文件路径                              |
| `--format` | Output format: `row`, `json`, or `table`   | `table`         | 输出格式，可选 `row`, `json`, `table`     |
| `--mode`   | Benchmark mode: `rps`, `concurrent`, `all` | `all`           | 压测模式，可选 `rps`, `concurrent`, `all` |

## 🧩 Configuration 配置说明

Here's a sample `benchmark.yml` and explanation of the fields:  
以下是一个示例配置文件 `benchmark.yml` 及字段说明：

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

### Top-Level Fields 顶级字段说明

| Field         | Description                                                                   | 说明                                                           |
| ------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `origin`      | Base URL of the API server                                                    | API 服务的基础地址                                             |
| `concurrency` | Number of concurrent users                                                    | 并发用户数                                                     |
| `timelimit`   | Duration of the test per mode (in seconds)                                    | 每种模式下的压测时长（单位秒）                                 |
| `ramp`        | (Optional) Ramp step to gradually increase concurrency                        | （可选）逐步提升并发的步长                                     |
| `data`        | Dynamic values to be injected into API paths or headers                       | 可注入到 API 路径或请求头的动态值                              |
| `body`        | Default request body                                                          | 默认请求体内容                                                 |
| `logError`    | Print error logs to console                                                   | 是否在控制台输出错误日志                                       |
| `logResponse` | Print full API responses                                                      | 是否输出完整 API 响应                                          |
| `aiAnalysis`  | Enable GPT-powered result interpretation (requires `OPENAI_CLIENT` in `.env`) | 是否启用 GPT AI 分析结果（需设置 `.env` 中的 `OPENAI_CLIENT`） |
| `sitemap`     | The remote endpoint should return a JSON response                             | 远程站点地图的 JSON 配置                                       |

### API List (`apis`) 接口列表定义

Each item defines one endpoint to test:  
每项定义一个要测试的接口：

| Field    | Description                                                           | 说明                                     |
| -------- | --------------------------------------------------------------------- | ---------------------------------------- |
| `name`   | Human-readable name of the test case                                  | 用于识别的测试项名称                     |
| `api`    | API path (joined with `origin`)                                       | API 相对路径（与 `origin` 合并）         |
| `method` | HTTP method (GET, POST, etc.)                                         | 请求方法，如 GET、POST 等                |
| `body`   | Request body (if POST/PUT)                                            | 请求体（适用于 POST、PUT 请求）          |
| `assert` | Assertions on response (supports `not-null`, `null`, or fixed values) | 响应断言（支持 not-null、null 或固定值） |
| `only`   | If true, run **only** this endpoint                                   | 如果为 true，只执行此接口测试            |
| `skip`   | If true, skip this endpoint                                           | 如果为 true，跳过此接口                  |

## 🌐 Using `sitemap` to Auto-Load API Definitions

使用 `sitemap` 自动加载 API 定义

To simplify and centralize API configuration, `@blocklet/benchmark` supports loading APIs dynamically from a remote `sitemap`.  
为了简化配置并集中管理 API，`@blocklet/benchmark` 支持从远程 `sitemap` 动态加载接口列表。

### 🧩 Configuration 配置方法

你可以在 `benchmark.yml` 中这样配置：

```yaml
sitemap:
  enable: true
  url: 'https://your-server-url.com/sitemap'
```

- `enable`: 设置为 `true` 启用该功能。
- `url`: 返回 JSON 结构的远程接口地址。

> 📌 如果 `enable` 为 false，或请求失败，将回退使用本地 `benchmark.yml` 中的 `apis` 配置。

---

### 📝 Expected Sitemap Response Format

预期的站点地图响应格式如下：

```json
{
  "apis": [
    {
      "name": "/api/example",
      "api": "/api/example"
    },
    {
      "name": "/api/full",
      "api": "/api/full",
      "method": "GET",
      "cookie": "login_token=$$loginToken",
      "format": "json",
      "headers": {
        "Content-Type": "application/json; charset=utf-8"
      },
      "skip": false,
      "only": false,
      "body": {},
      "assert": {}
    }
  ],
  "data": {
    "key": "option use some data"
  }
}
```

## 📊 Output 输出结果

All results are saved to the `benchmark-output` folder:  
所有压测结果会保存到 `benchmark-output` 文件夹：

- `benchmark.log`: 所有日志
- `0-benchmark-raw.yml`: 原始结果文件
