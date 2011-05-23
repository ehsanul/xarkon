var Game, GameObjects, MyShip, initKeyHandlers, initSocket, socket;
$(document).ready(function() {
  initKeyHandlers();
  return initSocket();
});
GameObjects = {};
Game = {
  keymap: {
    37: 'left',
    38: 'up',
    39: 'right',
    40: 'down',
    73: 'up',
    74: 'left',
    75: 'down',
    76: 'right',
    32: 'fast',
    65: 'slow',
    83: 'attract',
    68: 'repel'
  },
  flags: {
    up: 1 << 0,
    down: 1 << 1,
    left: 1 << 2,
    right: 1 << 3,
    fast: 1 << 4,
    slow: 1 << 5,
    attract: 1 << 6,
    repel: 1 << 7
  }
};
MyShip = {
  bitmask: 0
};
initKeyHandlers = function() {
  $(document).keydown(function(event) {
    var command;
    if (Game.keymap[event.keyCode] != null) {
      command = Game.keymap[event.keyCode];
      return MyShip.bitmask |= Game.flags[command];
    }
  });
  return $(document).keyup(function(event) {
    var command;
    if (Game.keymap[event.keyCode] != null) {
      command = Game.keymap[event.keyCode];
      return MyShip.bitmask &= ~Game.flags[command];
    }
  });
};
socket = new io.Socket(null, {
  port: 8124,
  rememberTransport: false
});
initSocket = function() {
  socket.connect();
  socket.on('message', function(msg) {
    var pos;
    pos = JSON.parse(msg);
    return $('#ship').css({
      left: pos[0],
      top: pos[1]
    });
  });
  return setInterval((function() {
    return socket.send(String(MyShip.bitmask));
  }), 30);
};