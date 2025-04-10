/* eslint-disable no-console */
const http = require('http');

const sitemap = {
  apis: [
    {
      name: '/api/date',
      api: '/api/date',
      method: 'GET',
      cookie: 'login_token=$$loginToken',
      format: 'json',
    },
  ],
  data: {
    key: 'value',
  },
};

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/sitemap') {
    const json = JSON.stringify(sitemap);
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(json),
    });
    res.end(json);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
});

const port = 5588;
server.listen(port, () => {
  console.log(`Sitemap server running at http://localhost:${port}/sitemap`);
});
