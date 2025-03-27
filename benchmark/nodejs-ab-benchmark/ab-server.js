const http = require('http');

const port = 5555;

const server = http.createServer((req, res) => {
  // 可根据需要打印请求信息：console.log(`收到请求：${req.url}`);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ message: 'success' }));
});

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`server is running on port ${port}`);
});
