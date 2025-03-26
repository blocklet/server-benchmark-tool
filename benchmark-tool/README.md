# Benchmark Tool

## Benchmark Server

## How to use

1. Prepare: start a server
2. Install https://test.store.blocklet.dev/blocklets/z2qa7xJnpqbLZ1jrnhCx9Z4vsLFopR1pe9M9U
3. Config "Invited only" for Static Demo component in Blocklet Dashboard
4. Save login_token from cookie in browser
5. Save any User Did from Blocklet Dashboard
6. Start Benchmark

```bash

./benchmark-node.js -c 2  -t 3  -o https://bbqathtgbx72pp3ee7zbgbvujqycl4er6ga2cxrtafq.did.abtnet.io:8443/ --user-did zxxxxx --team-did zxxxxxxxx --login-token eyJxxxx
```

## Server use cluster

`ABT_NODE_MAX_CLUSTER_SIZE=3 blocklet server start`

7. Results

```
Server Version: 1.16.8-beta-81db8efa
Platform: linux
CPU Cores: 4
Memory (GB): 8
┌─────────────────────────────────────────────────────┬─────────────┬──────────┬─────────┬──────┬───────┬────────┬────────┬────────┬────────┬───────────┐
│ Case                                                │ Concurrency │ Requests │ Success │ RPS  │ Min   │ 50%    │ 90%    │ 99%    │ Max    │ Test Time │
├─────────────────────────────────────────────────────┼─────────────┼──────────┼─────────┼──────┼───────┼────────┼────────┼────────┼────────┼───────────┤
│ /api/date                                           │ 100         │ 1000     │ 100%    │ 1120 │ 8 ms  │ 72 ms  │ 142 ms │ 349 ms │ 395 ms │ 0.9 s     │
├─────────────────────────────────────────────────────┼─────────────┼──────────┼─────────┼──────┼───────┼────────┼────────┼────────┼────────┼───────────┤
│ /api/date (with session)                            │ 100         │ 1000     │ 100%    │ 749  │ 7 ms  │ 120 ms │ 173 ms │ 213 ms │ 229 ms │ 1.36 s    │
├─────────────────────────────────────────────────────┼─────────────┼──────────┼─────────┼──────┼───────┼────────┼────────┼────────┼────────┼───────────┤
│ /.well-known/service/api/did/session                │ 100         │ 1000     │ 100%    │ 1979 │ 1 ms  │ 8 ms   │ 166 ms │ 614 ms │ 632 ms │ 0.77 s    │
├─────────────────────────────────────────────────────┼─────────────┼──────────┼─────────┼──────┼───────┼────────┼────────┼────────┼────────┼───────────┤
│ /.well-known/service/api/did/session (with session) │ 100         │ 1000     │ 100%    │ 515  │ 6 ms  │ 184 ms │ 202 ms │ 231 ms │ 257 ms │ 1.94 s    │
├─────────────────────────────────────────────────────┼─────────────┼──────────┼─────────┼──────┼───────┼────────┼────────┼────────┼────────┼───────────┤
│ /invited-only (without session)                     │ 100         │ 1000     │ 100%    │ 1294 │ 5 ms  │ 73 ms  │ 102 ms │ 128 ms │ 146 ms │ 0.77 s    │
├─────────────────────────────────────────────────────┼─────────────┼──────────┼─────────┼──────┼───────┼────────┼────────┼────────┼────────┼───────────┤
│ /api/user/z1jy1KtbVjuLS6u16McJxUgQQSu5CSk5HcZ       │ 100         │ 1000     │ 100%    │ 312  │ 10 ms │ 291 ms │ 449 ms │ 584 ms │ 605 ms │ 3.25 s    │
├─────────────────────────────────────────────────────┼─────────────┼──────────┼─────────┼──────┼───────┼────────┼────────┼────────┼────────┼───────────┤
│ /api/users                                          │ 100         │ 1000     │ 100%    │ 363  │ 11 ms │ 260 ms │ 315 ms │ 425 ms │ 469 ms │ 2.77 s    │
└─────────────────────────────────────────────────────┴─────────────┴──────────┴─────────┴──────┴───────┴────────┴────────┴────────┴────────┴───────────┘

```

## Use benchmark-tool.js

```bash
$ ./benchmark-tool.js -c 200 -n 10000 http://your-app --times 2 --login-token <loginToken> <url>
```

## FAQ

How to access blocklet by local domain?

1. Config `server.benchmark.local` to `127.0.0.1` in `/etc/hosts`
2. Add `server.benchmark.local` from Blocklet Dashboard - Configuration
3. Run `./benchmark-server.js http://server.benchmark.local`
