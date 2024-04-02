const http = require('http');
const mysql = require('mysql');

// const connection = mysql.createConnection({
//   host: 'localhost',
//   user: process.env.db_user,
//   password: process.env.db_password,
//   database: process.env.db_name,
// });

// connection.connect((err) => {
//   if (err) {
//     console.error('Error connecting to MySQL: ' + err.stack);
//     return;
//   }
//   console.log('Connected to MySQL as id ' + connection.threadId);
// });

// Create a HTTP server
const server = http.createServer(function(req, res) {
    // Check if the request is for the root path
    if (req.url === '/') {
        // Render the HTML page with a button
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write('<html><head><title>Increment Number</title></head><body>');
        res.write('<h1>Number: <span id="number"></span></h1>');
        res.write('<button onclick="incrementNumber()">Increment</button>');
        res.write('<script>function incrementNumber() {');
        res.write('var xhr = new XMLHttpRequest();');
        res.write('xhr.open("GET", "/increment", true);');
        res.write('xhr.send();');
        res.write('xhr.onload = function() {');
        res.write('if (xhr.status == 200) {');
        res.write('document.getElementById("number").innerText = xhr.responseText;');
        res.write('}');
        res.write('};');
        res.write('}</script>');
        res.write('</body></html>');
        return res.end();
    }

   // else if (req.url === '/increment') {
   //     // Increment the number in the database
   //     connection.query('UPDATE numbers SET value = value + 1', (err, result) => {
   //         if (err) {
   //             res.writeHead(500, {'Content-Type': 'text/plain'});
   //             return res.end('Error incrementing number in database');
   //         }
   //         // Fetch the updated number from the database
   //         connection.query('SELECT value FROM numbers', (err, rows) => {
   //             if (err) {
   //                 res.writeHead(500, {'Content-Type': 'text/plain'});
   //                 return res.end('Error fetching number from database');
   //             }
   //             res.writeHead(200, {'Content-Type': 'text/plain'});
   //             res.end(rows[0].value.toString());
   //         });
   //     });
   // }
});

// Start the server
server.listen();

