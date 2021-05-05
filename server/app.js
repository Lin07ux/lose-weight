const express = require('express');
const app = express();
const server = require('http').createServer(app);
const PORT = 3002;

app.use(express.static('../public'));

// 设置 404 处理
app.use((req, res, next) => res.status(404).send('Sorry cant find that!'));

require('./socket.js')(server);

server.listen(PORT, function () {
  console.log('listening on *:' + PORT);
});
