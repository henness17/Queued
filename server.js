var express = require('express');
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.static('public'));

app.get('/', function (req, res) {
  res.render("client");
});

// Broadcasting actions
io.on('connection', function (socket) {
  console.log('a user connected on socket: ' + socket.id);
  socket.on('play song', function () {
    socket.broadcast.emit('play song');
    console.log('BRD: Play');
  });
  socket.on('pause song', function () {
    socket.broadcast.emit('pause song');
    console.log('BRD: Pause');
  });
  socket.on('skip song', function () {
    socket.broadcast.emit('skip song');
    console.log('BRD: Skip');
  });
  socket.on('enqueue song', function (data) {
    socket.broadcast.emit('enqueue song', {
      url: data.url
    });
    console.log('BRD: Enqueue');
  });
});

http.listen(5000, function () {
  console.log('listening on *:5000');
});