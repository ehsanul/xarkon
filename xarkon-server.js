var $G, Command, Engine, Game, GameLoop, GameObjects, Physics, Player, Players, Pos, Serialize, SerializeCreate, SerializePos, ShipCommand, SocketIoClient, Vel, WEBROOT, broadcastPositions, fs, hasCommand, hasEngine, hasPhysics, hasPos, http, io, joop, log, paperboy, path, physicsStep, processCommands, propelEngines, server, socket, sys, url, v, _;
var __slice = Array.prototype.slice;
http = require('http');
url = require('url');
fs = require('fs');
sys = require('sys');
path = require('path');
io = require('socket.io');
v = require('./lib/vector2d');
$G = require('./lib/component').$G;
joop = require('./lib/joop');
log = console.log;
paperboy = require('./lib/node-paperboy');
_ = require('underscore');
GameObjects = {};
$G.baseObject = $G({
  lookup: GameObjects
});
Game = {
  directions: {
    left: v.create(-1, 0),
    right: v.create(1, 0),
    up: v.create(0, -1),
    down: v.create(0, 1)
  }
};
hasPos = [];
Pos = $G({
  lookup: hasPos,
  createPos: function(x, y) {
    return this.pos = v.create(x, y);
  },
  setPos: function(x, y) {
    return v.set(this.pos, x, y);
  },
  move: function(vec) {
    return v.add(this.pos, vec);
  }
});
Vel = $G({
  compInit: function() {
    return this.vel = v.create(0, 0);
  },
  setVel: function(x, y) {
    return v.set(this.vel, x, y);
  },
  accelerate: function(vec) {
    return v.add(this.vel, vec);
  },
  df: 0.84,
  dampen: function() {
    return v.scale(this.vel, this.df);
  }
});
hasPhysics = [];
Physics = $G(Pos, Vel, {
  compInit: function() {
    this.f = v.create(0, 0);
    return this.a = v.create(0, 0);
  },
  lookup: hasPhysics,
  mass: 1,
  force: function(vec) {
    return v.add(this.f, vec);
  },
  phyStep: function() {
    v.scale(this.f, 1 / this.mass, this.a);
    v.set(this.f, 0, 0);
    this.accelerate(this.a);
    this.dampen();
    return this.move(this.vel);
  }
});
hasEngine = [];
Engine = $G({
  compInit: function() {
    return this.thrustDir = v.create(0, 0);
  },
  lookup: hasEngine,
  thrust: 9,
  warp: 1,
  addThrustDir: function(vec) {
    return v.add(this.thrustDir, vec);
  },
  propel: function() {
    v.normalize(this.thrustDir);
    this.force(v.scale(this.thrustDir, this.thrust * this.warp));
    this.warp = 1;
    return v.set(this.thrustDir, 0, 0);
  }
});
hasCommand = [];
Command = $G({
  compInit: function() {
    return this.bitmask = 0;
  },
  lookup: hasCommand,
  setCommand: function(com) {},
  commandFlags: {},
  commandFuncs: {},
  processCommands: function() {
    var com, flag, _ref, _results;
    _ref = this.commandFlags;
    _results = [];
    for (com in _ref) {
      flag = _ref[com];
      _results.push(flag & this.bitmask ? this.commandFuncs[com].apply(this) : void 0);
    }
    return _results;
  }
});
ShipCommand = $G(Command, {
  commandFlags: {
    up: 1 << 0,
    down: 1 << 1,
    left: 1 << 2,
    right: 1 << 3,
    fast: 1 << 4,
    slow: 1 << 5
  },
  commandFuncs: {
    up: function() {
      return this.addThrustDir(Game.directions.up);
    },
    down: function() {
      return this.addThrustDir(Game.directions.down);
    },
    left: function() {
      return this.addThrustDir(Game.directions.left);
    },
    right: function() {
      return this.addThrustDir(Game.directions.right);
    },
    slow: function() {
      this.warp = 0.5;
      return this.df = 0.8;
    },
    fast: function() {
      this.warp = 2.5;
      return this.df = 0.87;
    }
  }
});
SocketIoClient = $G({
  compInit: function() {
    this.sessionId = null;
    this.client = null;
    this.shortId = {
      top: 1
    };
    return this.shortId[this.id] = String.fromCharCode(1);
  },
  setClient: function(client) {
    var _ref;
    return _ref = [client, client.sessionId], this.client = _ref[0], this.sessionId = _ref[1], _ref;
  },
  send: function(msg) {
    return this.client.send(msg);
  },
  setShortId: function(id) {
    if (this.shortId[id] == null) {
      this.shortId[id] = String.fromCharCode(++this.shortId.top);
    }
    return this.shortId[id];
  },
  shortIdReset: function() {}
});
Serialize = $G({
  numCompress: function() {
    var n, nums, out, _i, _len;
    nums = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    out = '';
    for (_i = 0, _len = nums.length; _i < _len; _i++) {
      n = nums[_i];
      if (n < 100) {
        out += String.fromCharCode(n + 1);
      } else {
        out += this.numCompress(Math.floor(n / 100)) + String.fromCharCode((n + 1) % 100);
      }
    }
    return out;
  },
  fixedNumCompress: function() {
    var n, nums, out, _i, _len;
    nums = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
    out = '';
    for (_i = 0, _len = nums.length; _i < _len; _i++) {
      n = nums[_i];
      if (n < 0 || n >= 10000) {
        throw new RangeError('fixedNumCompress() takes numbers 0..9999');
      }
      out += this.numCompress(n);
    }
    return out;
  }
});
SerializePos = $G(Serialize, {
  serializePos: function(objects) {
    var minX, minY, obj, output, _i, _j, _len, _len2, _ref;
    _ref = [Infinity, Infinity], minX = _ref[0], minY = _ref[1];
    for (_i = 0, _len = objects.length; _i < _len; _i++) {
      obj = objects[_i];
      this.setShortId(obj.id);
      if (obj.pos[0] < minX) {
        minX = obj.pos[0];
      }
      if (obj.pos[1] < minY) {
        minY = obj.pos[1];
      }
    }
    output = 'p:';
    output += this.numCompress(minX) + ':' + this.numCompress(minY) + ':';
    for (_j = 0, _len2 = objects.length; _j < _len2; _j++) {
      obj = objects[_j];
      output += this.shortId[obj.id];
      output += this.posCompress(obj.pos, minX, minY);
    }
    return output;
  },
  posCompress: function(pos, origX, origY) {
    return this.fixedNumCompress(pos[0] - origX, pos[1] - origY);
  },
  serializePosDelta: function(objects) {
    var obj, output, _i, _len;
    output = 'd:';
    for (_i = 0, _len = objects.length; _i < _len; _i++) {
      obj = objects[_i];
      this.setShortId(obj.id);
      output += this.shortId[obj.id];
      output += this.posDeltaCompress(obj.vel);
    }
    return output;
  },
  posDeltaCompress: function(vel) {
    var deltaX, deltaY, output, _ref, _ref2;
    deltaX = vel[0];
    deltaY = vel[1];
    if ((100 <= deltaX && deltaX < -100) || (100 <= deltaY && deltaY < -100)) {
      _ref = [Math.floor(deltaX / 4, Math.floor(deltaY / 4))], deltaX = _ref[0], deltaY = _ref[1];
      output = String.fromCharCode(127);
    } else if ((50 <= deltaX && deltaX < -50) || (50 <= deltaY && deltaY < -50)) {
      _ref2 = [Math.floor(deltaX / 2, Math.floor(deltaY / 2))], deltaX = _ref2[0], deltaY = _ref2[1];
      output = String.fromCharCode(126);
    } else {
      output = '';
    }
    deltaX += 50;
    deltaY += 50;
    output += this.numCompress(deltaX, deltaY);
    return output;
  }
});
SerializeCreate = $G({
  serializeCreate: function(objects) {
    var obj, output, p, pos, _i, _j, _len, _len2;
    output = 'c';
    for (_i = 0, _len = objects.length; _i < _len; _i++) {
      obj = objects[_i];
      output += this.setShortId(obj.id);
      pos = obj.pos;
      for (_j = 0, _len2 = pos.length; _j < _len2; _j++) {
        p = pos[_j];
        output += String.fromCharCode(p);
      }
    }
    return output;
  },
  sendCreate: function(objects) {
    return this.send(this.serializeCreate(objects));
  }
});
Players = [];
Player = $G(Physics, Engine, ShipCommand, SerializeCreate, SerializePos, SocketIoClient, {
  lookup: Players,
  init: function(x, y) {
    return this.createPos(x, y);
  }
});
processCommands = function() {
  var obj, _i, _len, _results;
  _results = [];
  for (_i = 0, _len = hasCommand.length; _i < _len; _i++) {
    obj = hasCommand[_i];
    _results.push(obj.processCommands());
  }
  return _results;
};
propelEngines = function() {
  var obj, _i, _len, _results;
  _results = [];
  for (_i = 0, _len = hasEngine.length; _i < _len; _i++) {
    obj = hasEngine[_i];
    _results.push(obj.propel());
  }
  return _results;
};
physicsStep = function() {
  var obj, _i, _len, _results;
  _results = [];
  for (_i = 0, _len = hasPhysics.length; _i < _len; _i++) {
    obj = hasPhysics[_i];
    _results.push(obj.phyStep());
  }
  return _results;
};
broadcastPositions = function() {
  var obj, player, shortId, velInfo, _i, _j, _len, _len2, _results;
  _results = [];
  for (_i = 0, _len = Players.length; _i < _len; _i++) {
    player = Players[_i];
    velInfo = {};
    for (_j = 0, _len2 = hasPos.length; _j < _len2; _j++) {
      obj = hasPos[_j];
      shortId = player.setShortId(obj.id);
      velInfo[shortId] = _(obj.vel).map(Math.round);
    }
    _results.push(player.send('j' + JSON.stringify(velInfo)));
  }
  return _results;
};
GameLoop = joop(processCommands, propelEngines, physicsStep, broadcastPositions, 30);
GameLoop();
WEBROOT = path.dirname(__filename);
server = http.createServer(function(req, res) {
  return paperboy.deliver(WEBROOT, req, res).error(function(statCode, msg) {
    res.writeHead(statCode, {
      'Content-Type': 'text/plain'
    });
    return res.end('Error ' + statCode);
  }).otherwise(function(err) {
    res.writeHead(404, {
      'Content-Type': 'text/plain'
    });
    return res.end('Error 404: File not found');
  });
});
server.listen(8124);
log('Server running at http://localhost:8124/');
socket = io.listen(server);
socket.on('connection', function(client) {
  var p, ss, _i, _len;
  ss = new Player(0, 0);
  ss.setClient(client);
  ss.sendCreate(Players);
  for (_i = 0, _len = Players.length; _i < _len; _i++) {
    p = Players[_i];
    if (p.id === ss.id) {
      continue;
    }
    p.sendCreate([ss]);
  }
  /*
    setInterval((->
      client.send(Math.random())
    ), 1000)
    */
  client.on('message', function(msg) {
    return ss.bitmask = Number(msg);
  });
  return client.on('disconnect', function(msg) {});
});