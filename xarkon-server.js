var http = require('http'),
		url = require('url'),
		fs = require('fs'),
		sys = require('sys'),
		path = require('path'),
    io = require('./lib/socket.io'),
    paperboy = require('./lib/node-paperboy');

eval(fs.readFileSync("./js/sylvester.min.js", 'utf8'));
eval(fs.readFileSync("./js/underscore-min.js", 'utf8'));
eval(fs.readFileSync("./js/lzw.js", 'utf8'));

//WEBROOT = path.join(path.dirname(__filename), 'webroot');
WEBROOT = path.dirname(__filename);

var server = http.createServer(function (req, res) {
  paperboy
    .deliver(WEBROOT, req, res)
    .error(function(statCode, msg) {
      res.writeHead(statCode, {'Content-Type': 'text/plain'});
      res.end("Error " + statCode);
    })
    .otherwise(function(err) {
      res.writeHead(404, {'Content-Type': 'text/plain'});
      res.end("Error 404: File not found");
    });
});
server.listen(8124, "localhost");
console.log('Server running at http://localhost:8124/');

var Spaceships = {};
var idMap = {};
var idCount = 0;

// socket.io 
var socket = io.listen(server); 
socket.on('connection', function(client){ 
  var id = idCount++;
  idMap[client.sessionId] = id;

  // new client is here! 
  // tell it about everyone else already online
  var birthSpaceships = {};
  _(Spaceships).each(function(ship, id){
    birthSpaceships[id] = ship.birthRepresentation();
  });
  client.send(JSON.stringify({
    birth: birthSpaceships
  }));

  client.on('message', function(message){
    var id = idMap[client.sessionId];
    var data = JSON.parse(message);
    if (data.name !== undefined){
      // tell  itself its own id
      Spaceships[id] = new Spaceship(data.name);
      client.send(JSON.stringify({
        selfId: id,
        name: data.name
      }));

      // tell everyone else about itself
      var thisSpacehip = {};
      thisSpacehip[id] = Spaceships[id].birthRepresentation();
      client.broadcast(JSON.stringify({
        birth: thisSpacehip
      }));
    }
    else {
      Spaceships[id].bitmask = data;
    }
  });

  client.on('disconnect', function(){
    var id = idMap[client.sessionId];
    // tell everyone this spaceship is gone
    delete Spaceships[id];
    client.broadcast(JSON.stringify({
      death: id
    }));
  });
}); 

setInterval(updateGame,30);

function updateGame(){
  updateVectors();
  detectCollisions();
  broadcastPositions();
}

function updateVectors(){
  _(Spaceships).each(function(ship, id){
    ship.updateVelocity();
    ship.updatePosition();
  });
}

function detectCollisions(){
  _(Spaceships).each(function(ship, id){
    ship.collisions = [];
  });
  _(Spaceships).each(function(ship, id){
    _(Spaceships).chain()
      .reject(function(ship2, id2){
        return (
          _(ship.collisions).include(id2) ||
          _(ship2.collisions).include(id) ||
          id === id2
        );
      })
      .each(function(ship2, id2){
        // Crude radius-based detection
        // TODO: Replace with GJK
        var distVector = ship.pos.subtract(ship2.pos);
        if (distVector.modulus() < 60){
          ship.collisions.push(id2);
          ship2.collisions.push(id);
          // TODO: replace with real physics with inelastic collisions
          //       though it almost already is assuming equal mass and circular objects etc
          var dir = distVector.toUnitVector();
          var dir2 = distVector.multiply(-1).toUnitVector();
          var relativeVel = ship2.vel.subtract(ship.vel);
          var relativeVel2 = relativeVel.multiply(-1);
          ship.vel = ship.vel.add( dir.multiply(Math.abs(dir.dot(relativeVel) * 1.45)) );
          ship2.vel = ship2.vel.add( dir2.multiply(Math.abs(dir2.dot(relativeVel2) * 1.45)) );
          // Letting the next tick handle updating the positions
          // as otherwise, we'll double the pre-existing velocity
        }
      });
  });
}

function broadcastPositions(){
  var objectPositions = [];
  _(Spaceships).each(function(ship, id){
    var pos = ship.posXY();
    objectPositions.push([Number(id), pos[0], pos[1]]);
  });
  socket.broadcast( serializePositions(objectPositions) );
}

// simple for now, can do weirder stuff like stripping out all []
// and joining the flat array, then lzw over that,
// but probably don't need to
function serializePositions(positions){
  return lzw_encode(JSON.stringify(positions));
}

var MAXSPEED = 10;
var ACC = 5;
var Game = {
  keymap: {
    73: 'up',
    74: 'left',
    75: 'down',
    76: 'right',
    32: 'fast',
    83: 'slow'
  },
  directions: {
    left: $V([-1,0]),
    right: $V([1,0]),
    up: $V([0,-1]),
    down: $V([0,1])
  },
  flags: {
    up: 0x1,
    down: 0x2,
    left: 0x4,
    right: 0x8,
    slow: 0x10,
    fast: 0x20
  }
};
var Spaceship = function(name, x, y, vx, vy){
  this.name = name;
  if (arguments.length === 5){
    this.pos = $V([x, y]);
    this.vel = $V([vx, vy]);
  }
  else {
    this.pos = Vector.Zero(2);
    this.vel = Vector.Zero(2);
  }
};
Spaceship.prototype = {
  bitmask: 0x0,
  move: function(dir){
    return this.bitmask & Game.flags[dir];
  },
  thrust: function (){
    var thrust = Vector.Zero(2);
    var self = this; //required for function below
    _(Game.directions).each(function(vector, direction){
        if (self.move(direction)){
          thrust = thrust.add(vector);
        }
    });
    return thrust.toUnitVector().multiply(ACC * this.warp());
  },
  warp: function (){
    var warp = 1;
    if (this.move('slow')){
      warp = 0.4;
    }
    else if (this.move('fast')){
      warp = 3;
    }
    return warp;
  },
  updateVelocity: function(){
    // F = ma, v = u + at but m = 1 and t = 1 so v = u + F
    this.vel = this.vel.add(this.thrust());
    // drag
    this.vel = this.vel.multiply(0.8);
    // speed limit 
    if (this.vel.modulus() > MAXSPEED * this.warp()){
      this.vel = this.vel.multiply(0.85);
    }
  },
  updatePosition: function(){
    // update position
    this.pos = this.pos.add(this.vel);
  },
  birthRepresentation: function(){
    return {
      name: this.name,
      x: Math.round(this.pos.e(1)),
      y: Math.round(this.pos.e(2))
    };
  },
  posXY: function(){
    return [
      Math.round(this.pos.e(1)),
      Math.round(this.pos.e(2))
    ];
  }
};
