# Benchmark Server

## How to use

1. Prepare: start a server and start an app that you want to benchmark
2. Start Benchmark

```bash
$ ./benchmark.js -c 500 http://your-app/path/to
```

## exapmle

<details>
<summary><code>./benchmark-tool.js http://test.app.io/ -c 200</code></summary>
<pre>
./benchmark.js http://test.app.io/ -c 200
Benchmark v1.0.0

Benchmarking http://test.app.io/...

Benchmarking with 100 concurrency and 1000 requests...

This is ApacheBench, Version 2.3 <$Revision: 1901567 $>
Copyright 1996 Adam Twiss, Zeus Technology Ltd, http://www.zeustech.net/
Licensed to The Apache Software Foundation, http://www.apache.org/

Benchmarking test.app.io (be patient)


Server Software:        
Server Hostname:        test.app.io
Server Port:            80

Document Path:          /
Document Length:        561 bytes

Concurrency Level:      100
Time taken for tests:   0.710 seconds
Complete requests:      1000
Failed requests:        0
Total transferred:      1220000 bytes
HTML transferred:       561000 bytes
Requests per second:    1408.53 [#/sec] (mean)
Time per request:       70.996 [ms] (mean)
Time per request:       0.710 [ms] (mean, across all concurrent requests)
Transfer rate:          1678.13 [Kbytes/sec] received

Connection Times (ms)
              min  mean[+/-sd] median   max
Connect:        0    1   0.7      0       5
Processing:     7   68   8.9     69      96
Waiting:        4   68   8.8     69      96
Total:          7   69   8.9     69      98
WARNING: The median and mean for the initial connection time are not within a normal deviation
        These results are probably not that reliable.

Percentage of the requests served within a certain time (ms)
  50%     69
  66%     72
  75%     73
  80%     74
  90%     77
  95%     81
  98%     88
  99%     93
 100%     98 (longest request)

-----------------

Benchmarking with 150 concurrency and 1500 requests...

This is ApacheBench, Version 2.3 <$Revision: 1901567 $>
Copyright 1996 Adam Twiss, Zeus Technology Ltd, http://www.zeustech.net/
Licensed to The Apache Software Foundation, http://www.apache.org/

Benchmarking test.app.io (be patient)


Server Software:        
Server Hostname:        test.app.io
Server Port:            80

Document Path:          /
Document Length:        561 bytes

Concurrency Level:      150
Time taken for tests:   1.158 seconds
Complete requests:      1500
Failed requests:        0
Total transferred:      1830000 bytes
HTML transferred:       841500 bytes
Requests per second:    1294.90 [#/sec] (mean)
Time per request:       115.839 [ms] (mean)
Time per request:       0.772 [ms] (mean, across all concurrent requests)
Transfer rate:          1542.75 [Kbytes/sec] received

Connection Times (ms)
              min  mean[+/-sd] median   max
Connect:        0    1   1.1      0       8
Processing:     7  113  25.3    113     202
Waiting:        2  113  25.3    112     202
Total:          7  114  25.0    114     203

Percentage of the requests served within a certain time (ms)
  50%    114
  66%    118
  75%    122
  80%    131
  90%    151
  95%    155
  98%    159
  99%    171
 100%    203 (longest request)

-----------------

Benchmarking with 200 concurrency and 2000 requests...

This is ApacheBench, Version 2.3 <$Revision: 1901567 $>
Copyright 1996 Adam Twiss, Zeus Technology Ltd, http://www.zeustech.net/
Licensed to The Apache Software Foundation, http://www.apache.org/

Benchmarking test.app.io (be patient)


Server Software:        
Server Hostname:        test.app.io
Server Port:            80

Document Path:          /
Document Length:        561 bytes

Concurrency Level:      200
Time taken for tests:   1.467 seconds
Complete requests:      2000
Failed requests:        132
   (Connect: 0, Receive: 46, Length: 86, Exceptions: 0)
Non-2xx responses:      40
Total transferred:      2458480 bytes
HTML transferred:       1186794 bytes
Requests per second:    1363.44 [#/sec] (mean)
Time per request:       146.687 [ms] (mean)
Time per request:       0.733 [ms] (mean, across all concurrent requests)
Transfer rate:          1636.72 [Kbytes/sec] received

Connection Times (ms)
              min  mean[+/-sd] median   max
Connect:        0    2   7.0      1     206
Processing:     8  141  60.5    122     323
Waiting:        0  140  60.9    121     322
Total:          8  143  59.2    123     325

Percentage of the requests served within a certain time (ms)
  50%    123
  66%    146
  75%    178
  80%    182
  90%    233
  95%    268
  98%    305
  99%    311
 100%    325 (longest request)

-----------------

┌─────────────┬──────────┬─────────┬────────────┬──────┬────────┬────────┬────────┬────────┬───────────────┐
│ Concurrency │ Requests │ Success │ QPS        │ Min  │ 50%    │ 90%    │ 99%    │ Max    │ Test Time     │
├─────────────┼──────────┼─────────┼────────────┼──────┼────────┼────────┼────────┼────────┼───────────────┤
│ 100         │ 1000     │ 100.00% │ 1408.53 ms │ 7 ms │ 69 ms  │ 77 ms  │ 93 ms  │ 98 ms  │ 0.710 seconds │
├─────────────┼──────────┼─────────┼────────────┼──────┼────────┼────────┼────────┼────────┼───────────────┤
│ 150         │ 1500     │ 100.00% │ 1294.90 ms │ 7 ms │ 114 ms │ 151 ms │ 171 ms │ 203 ms │ 1.158 seconds │
├─────────────┼──────────┼─────────┼────────────┼──────┼────────┼────────┼────────┼────────┼───────────────┤
│ 200         │ 2000     │ 93.40%  │ 1363.44 ms │ 8 ms │ 123 ms │ 233 ms │ 311 ms │ 325 ms │ 1.467 seconds │
└─────────────┴──────────┴─────────┴────────────┴──────┴────────┴────────┴────────┴────────┴───────────────┘
</pre>
<details>
