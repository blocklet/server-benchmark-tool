# Server Benchmark

## How to use

1. Prepare: start a server
2. Install https://test.store.blocklet.dev/blocklets/z2qaAYeWTZkhb5yNHqwos6mJLLK9ykHrxehjx
3. Config "Invited only" for Static Demo component in Blocklet Dashboard
4. Install Media kit
5. Save login_token from cookie in browser
6. Save any User Did from Blocklet Dashboard
7. Start Benchmark

## Server use cluster

`ABT_NODE_MAX_CLUSTER_SIZE=3 blocklet server start`

## Use benchmark

Use concurrent mode and require/s mode test(default):

```bash
$ npx @blocklet/server-benchmark -c 300 -t 36 --mode all con -o https://your-app-url --user-did your-did --team-did the-installed-app-did --login-token your-login-token
```

Use concurrent mode:

```bash
$ npx @blocklet/server-benchmark -c 300 -t 36 --mode concurrent -o https://your-app-url --user-did your-did --team-did the-installed-app-did --login-token your-login-token
```

Use require/s mode:

```
$ npx @blocklet/server-benchmark -c 300 -t 36 --mode rps -o https://your-app-url --user-did your-did --team-did the-installed-app-did --login-token your-login-token
```

Only run some url, use `--match`:

```
$ npx @blocklet/server-benchmark -c 300 -t 36 --mode rps -o https://your-app-url --match /.well-known/service/api/user-session --user-did your-did --team-did the-installed-app-did --login-token your-login-token
```

```

## FAQ

How to access blocklet by local domain?

1. Config `server.benchmark.local` to `127.0.0.1` in `/etc/hosts`
2. Add `server.benchmark.local` from Blocklet Dashboard - Configuration
```
