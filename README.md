# Benchmark Tool

## Benchmark Server

## How to use

1. Prepare: start a server
2. Install https://test.store.blocklet.dev/blocklets/z2qaAYeWTZkhb5yNHqwos6mJLLK9ykHrxehjx
3. Config "Invited only" for Static Demo component in Blocklet Dashboard
4. Save login_token from cookie in browser
5. Save any User Did from Blocklet Dashboard
6. Start Benchmark

## Server use cluster

`ABT_NODE_MAX_CLUSTER_SIZE=3 blocklet server start`

## Use benchmark

```bash
$ npx @blocklet/server-benchmark -c 200 -t 30 -o http://your-app-url --login-token <loginToken>
```

## FAQ

How to access blocklet by local domain?

1. Config `server.benchmark.local` to `127.0.0.1` in `/etc/hosts`
2. Add `server.benchmark.local` from Blocklet Dashboard - Configuration
