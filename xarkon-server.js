var CHARCODE_OFFSET, Command, Engine, Game, GameObjects, GravityControl, Grid, Physics, Player, Players, Pos, SerializeCreate, ShipCommand, SocketIoClient, Vel, WEBROOT, broadcastPositions, fs, gcomponent, grid, gridCols, gridH, gridRows, gridW, hasCommand, hasEngine, hasPhysics, hasPos, http, io, joop, log, paperboy, path, physicsStep, processCommands, propelEngines, server, sio, sys, url, v, _;
http = require('http');
url = require('url');
fs = require('fs');
sys = require('sys');
path = require('path');
sio = require('socket.io');
v = require('./lib/vector2d');
joop = require('./lib/joop');
Grid = require('./lib/grid-lookup');
_ = require('underscore');
paperboy = require('./lib/node-paperboy');
gcomponent = require('./lib/component').$G;
log = console.log;
CHARCODE_OFFSET = Math.pow(2, 15);
GameObjects = {};
gcomponent.baseObject = gcomponent({
  lookup: GameObjects,
  removeLookups: function() {
    var i, id, lookup, _i, _len, _ref, _results;
    _ref = this._lookup;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      lookup = _ref[_i];
      _results.push((function() {
        var _len2, _results2;
        if (lookup instanceof Array) {
          _results2 = [];
          for (i = 0, _len2 = lookup.length; i < _len2; i++) {
            id = lookup[i];
            if (id === this.id) {
              lookup.splice(i, 1);
              break;
            }
          }
          return _results2;
        } else {
          return delete lookup[this.id];
        }
      }).call(this));
    }
    return _results;
  }
});
gridW = gridH = 10000;
gridCols = gridRows = gridW / 400;
grid = new Grid(gridW, gridH, gridCols, gridRows);
Game = {
  directions: {
    left: v.create(-1, 0),
    right: v.create(1, 0),
    up: v.create(0, -1),
    down: v.create(0, 1)
  }
};
hasPos = [];
Pos = gcomponent({
  compInit: function() {
    var _ref, _ref2;
    if ((_ref = this.w) == null) {
      this.w = 1;
    }
    return (_ref2 = this.h) != null ? _ref2 : this.h = 1;
  },
  lookup: hasPos,
  createPos: function(x, y) {
    this.pos = v.create(x, y);
    return grid.insert(this.id, x, y, this.w, this.h);
  },
  setPos: function(x, y) {
    grid.move(this.id, this.pos[0], this.pos[1], x, y, this.w, this.h);
    return v.set(this.pos, x, y);
  },
  move: function(vec) {
    var p;
    p = [this.pos[0], this.pos[1]];
    v.add(this.pos, vec);
    if (this.pos[0] < 0) {
      this.pos[0] += gridW;
    } else if (this.pos[0] >= gridW) {
      this.pos[0] -= gridW;
    }
    if (this.pos[1] < 0) {
      this.pos[1] += gridH;
    } else if (this.pos[1] >= gridH) {
      this.pos[1] -= gridH;
    }
    return grid.move(this.id, p[0], p[1], this.pos[0], this.pos[1], this.w, this.h);
  },
  distance: function(pos) {
    var ab, n, x, y, _ref;
    ab = v.subtract(pos, this.pos, []);
    _ref = (function() {
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = ab.length; _i < _len; _i++) {
        n = ab[_i];
        _results.push(Math.abs(n));
      }
      return _results;
    })(), x = _ref[0], y = _ref[1];
    if (x > gridW / 2) {
      ab[0] = gridW - x;
    }
    if (y > gridH / 2) {
      ab[1] = gridH - y;
    }
    return v.length(ab);
  },
  vectorTowards: function(pos) {
    var ab;
    ab = v.subtract(pos, this.pos, []);
    if (ab[0] > gridW / 2) {
      ab[0] -= gridW;
    } else if (ab[0] < -gridW / 2) {
      ab[0] += gridW;
    }
    if (ab[1] > gridH / 2) {
      ab[1] -= gridH;
    } else if (ab[1] < -gridH / 2) {
      ab[1] += gridH;
    }
    return v.normalize(ab);
  },
  vectorFrom: function(pos) {
    return v.negate(this.vectorTowards(pos));
  }
});
Vel = gcomponent({
  compInit: function() {
    this.vel = v.create(0, 0);
    this.velError = v.create(0, 0);
    return this.velEC = v.create(0, 0);
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
Physics = gcomponent(Pos, Vel, {
  compInit: function() {
    this.f = v.create(0, 0);
    return this.a = v.create(0, 0);
  },
  lookup: hasPhysics,
  mass: 100,
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
GravityControl = gcomponent({
  attract: function() {
    return this.gravForce(this.vectorFrom);
  },
  repel: function() {
    return this.gravForce(this.vectorTowards);
  },
  gravForce: function(dirFunc) {
    var direction, distance, id, l, magnitude, obj, objectIds, surroundingObjs, _i, _len, _results;
    l = 1200;
    objectIds = grid.rangeSearch(this.pos[0] - l, this.pos[1] - l, l * 2, l * 2);
    surroundingObjs = (function() {
      var _i, _len, _results;
      _results = [];
      for (_i = 0, _len = objectIds.length; _i < _len; _i++) {
        id = objectIds[_i];
        _results.push(GameObjects[id]);
      }
      return _results;
    })();
    _results = [];
    for (_i = 0, _len = surroundingObjs.length; _i < _len; _i++) {
      obj = surroundingObjs[_i];
      if (obj == null) {
        console.error(objectIds);
        console.error(GameObjects);
        continue;
      }
      if (obj.id === this.id) {
        continue;
      }
      distance = Math.max(this.distance(obj.pos), 150);
      magnitude = 5000 * this.mass * obj.mass / Math.pow(distance, 2);
      direction = dirFunc.apply(this, [obj.pos]);
      _results.push(obj.force(v.scale(direction, magnitude)));
    }
    return _results;
  }
});
hasEngine = [];
Engine = gcomponent({
  compInit: function() {
    return this.thrustDir = v.create(0, 0);
  },
  lookup: hasEngine,
  thrust: 900,
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
Command = gcomponent({
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
ShipCommand = gcomponent(Command, {
  commandFlags: {
    up: 1 << 0,
    down: 1 << 1,
    left: 1 << 2,
    right: 1 << 3,
    fast: 1 << 4,
    slow: 1 << 5,
    attract: 1 << 6,
    repel: 1 << 7
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
    },
    attract: function() {
      return this.attract();
    },
    repel: function() {
      return this.repel();
    }
  }
});
SocketIoClient = gcomponent({
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
SerializeCreate = {
  serializeCreate: function(objects) {
    var obj, output, p, pos, _i, _j, _len, _len2;
    output = 'c';
    for (_i = 0, _len = objects.length; _i < _len; _i++) {
      obj = objects[_i];
      output += this.setShortId(obj.id);
      pos = obj.pos;
      for (_j = 0, _len2 = pos.length; _j < _len2; _j++) {
        p = pos[_j];
        output += String.fromCharCode(p + CHARCODE_OFFSET);
      }
    }
    return output;
  },
  sendCreate: function(objects) {
    return this.send(this.serializeCreate(objects));
  },
  serializeDestroy: function(objects) {
    var obj, output, _i, _len;
    output = 'd';
    for (_i = 0, _len = objects.length; _i < _len; _i++) {
      obj = objects[_i];
      output += this.setShortId(obj.id);
    }
    return output;
  },
  sendDestroy: function(objects) {
    return this.send(this.serializeDestroy(objects));
  }
};
Players = [];
Player = gcomponent(Physics, Engine, ShipCommand, SerializeCreate, SocketIoClient, GravityControl, {
  lookup: Players,
  init: function(x, y, client) {
    this.createPos(x, y);
    return this.setClient(client);
  },
  remove: function() {
    var p, _i, _len, _results;
    this.removeLookups();
    grid["delete"](this.id, this.pos[0], this.pos[1], this.w, this.h);
    _results = [];
    for (_i = 0, _len = Players.length; _i < _len; _i++) {
      p = Players[_i];
      _results.push(p.sendDestroy([this]));
    }
    return _results;
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
  var obj, player, shortId, velInfo, velRounded, _i, _j, _k, _len, _len2, _len3, _results;
  for (_i = 0, _len = hasPos.length; _i < _len; _i++) {
    obj = hasPos[_i];
    v.add(obj.vel, obj.velError, obj.velEC);
    velRounded = _(obj.velEC).map(Math.round);
    v.subtract(obj.velEC, velRounded, obj.velError);
  }
  _results = [];
  for (_j = 0, _len2 = Players.length; _j < _len2; _j++) {
    player = Players[_j];
    velInfo = {};
    for (_k = 0, _len3 = hasPos.length; _k < _len3; _k++) {
      obj = hasPos[_k];
      shortId = player.setShortId(obj.id);
      velInfo[shortId] = _(obj.velEC).map(Math.round);
    }
    _results.push(player.send('j' + JSON.stringify(velInfo)));
  }
  return _results;
};
joop(30, processCommands, propelEngines, physicsStep, broadcastPositions);
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
io = sio.listen(server);
server.listen(8124);
log('Server running at http://localhost:8124/');
io.sockets.on('connection', function(client) {
  var p, player, _i, _len;
  player = new Player(0, 0, client);
  player.sendCreate(Players);
  for (_i = 0, _len = Players.length; _i < _len; _i++) {
    p = Players[_i];
    if (p.id === player.id) {
      continue;
    }
    p.sendCreate([player]);
  }
  client.on('message', function(msg) {
    return player.bitmask = msg.charCodeAt(0);
  });
  return client.on('disconnect', function(msg) {
    return player.remove();
  });
});