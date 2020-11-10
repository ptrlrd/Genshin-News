const http = require('http');
const fs = require('fs');
const url = require('url');
require('dotenv').config()
const fetch = require('node-fetch');

http.createServer((req, res) => {
        var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

        let responseCode = 404;
        let content = fs.readFileSync('./index.html');

        if (req.url === '/authorize') {
            responseCode = 200;
            content = fs.readFileSync('./index.html');
        }

        if (req.url === '/statsJSON') {
            if (req.method === 'POST') {
                responseCode = 200;
                var info = ''
                req.on('data', function(data) {
                    res.writeHead(200, {
                        'Content-Type': 'application/json'
                    })
                    info += data
                    console.log(info)
                })
                req.on('end', function() {
                    fs.writeFile("stats.json", info, function(err) {
                        if (err) throw err;
                    });
                    res.writeHead(200, {
                        'Content-Type': 'application/json'
                    })
                    res.end('post received')
                })
            } else {
                content = fs.readFileSync('./stats.json');
            }
        }

        if (req.url === '/api') {
            if (ip == /*insert IP*/ ) { // used to filter out external requests
                responseCode = 200;
                content = fs.readFileSync('./test.json');
            } else {
                responseCode = 200;
                content = fs.readFileSync('./index.html');
            }
        }

        res.writeHead(responseCode, {
            'content-type': 'text/html;charset=utf-8',
        });

        // Obtain Code
        const urlObj = url.parse(req.url, true);

        if (urlObj.query.code) {
            const accessCode = urlObj.query.code;
            console.log(`The access code is: ${accessCode}`);

            // Fetch
            const facts = {
                client_id: process.env.CLIENT,
                client_secret: process.env.SECRET,
                grant_type: 'authorization_code',
                redirect_uri: 'http://genshinnews.com/authorize',
                code: accessCode,
                scope: 'webhook.incoming',
            };

            // Fetching Discord information
            fetch('https://discord.com/api/oauth2/token', {
                    method: 'POST',
                    body: new URLSearchParams(facts),
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                })
                .then(res => res.json())
                // Writing Discord information to local file
                .then(data =>
                    fs.appendFile('test.json', `,${JSON.stringify(data)}\n`, function(err) {
                        if (err) throw err;
                        console.log('Saved!');

                    })
                )
        }

        if (urlObj.pathname === '/authorize') {
            responseCode = 200;
            content = fs.readFileSync('./index.html');
        }

        // Write and end

        res.write(content);
        res.end();
    })
    .listen();
