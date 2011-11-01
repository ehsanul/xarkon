var CHARCODE_OFFSET, Game, GameObjects, MyShip, initKeyHandlers, initSocket, processMessage, socket;
CHARCODE_OFFSET = Math.pow(2, 15);
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
socket = io.connect();
initSocket = function() {
  var x;
  socket.on('message', function(msg) {
    var protocol;
    protocol = msg[0];
    msg = msg.slice(1, msg.length);
    return processMessage[protocol](msg);
  });
  x = setInterval((function() {
    return socket.send(String.fromCharCode(MyShip.bitmask));
  }), 30);
  return socket.on('disconnect', function() {
    $('div').remove();
    return setTimeout(socket.connect, 500);
  });
};
processMessage = {
  c: function(msg) {
    var id, l, obj, x, y, _results;
    if (msg.length % 3 !== 0) {
      throw new Error("msg fixed-formatting prob (must be mult of 3): " + msg);
    }
    _results = [];
    while (msg.length !== 0) {
      l = msg.length;
      obj = msg.slice(l - 3, l);
      msg = msg.slice(0, l - 3);
      id = obj.charCodeAt(0);
      x = obj.charCodeAt(1) - CHARCODE_OFFSET;
      y = obj.charCodeAt(2) - CHARCODE_OFFSET;
      if (x > 5000) {
        x -= 10000;
      }
      if (y > 5000) {
        y -= 10000;
      }
      $('body').append("<div id='" + id + "'></div>");
      _results.push($("#" + id).css({
        left: x,
        top: y
      }));
    }
    return _results;
  },
  d: function(msg) {
    var id, l, obj, _results;
    _results = [];
    while (msg.length !== 0) {
      l = msg.length;
      obj = msg.slice(l - 1, l);
      msg = msg.slice(0, l - 1);
      id = obj.charCodeAt(0);
      _results.push($("#" + id).remove());
    }
    return _results;
  },
  j: function(msg) {
    var id, l, t, vel, _ref, _ref2, _results;
    _ref = JSON.parse(msg);
    _results = [];
    for (id in _ref) {
      vel = _ref[id];
      id = id.charCodeAt(0);
      _ref2 = [$("#" + id).css('left'), $("#" + id).css('top')], l = _ref2[0], t = _ref2[1];
      _results.push($("#" + id).css({
        left: parseInt(l) + vel[0],
        top: parseInt(t) + vel[1]
      }));
    }
    return _results;
  }
};