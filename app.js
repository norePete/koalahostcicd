const http = require('http');
const server = http.createServer(function(req, res) {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    let message = 'ci / cd pipeline operational';
    res.end(message);
});

server.listen();

