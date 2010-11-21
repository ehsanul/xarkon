//TODO:
//  attachment on attraction
//  remove lzw "compression", replace with number => ascii 50% compression

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

var GameObjects = {};
var Spaceships = {};
var Asteroids = {};
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
      Spaceships[id] = new Spaceship(id, data.name);
      GameObjects[id] = Spaceships[id];
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
  processCommands();
  updateVelocities();
  updatePositions();
  detectCollisions();
  broadcastPositions();
}

function updatePositions(){
  _(GameObjects).each(function(obj, id){
    obj.updatePosition();
  });
}

function processCommands(){
  _(Spaceships).each(function(ship, id){
    if (ship.command('repel')) {
      ship.eachOtherShip(function(ship2, id2){
        ship.repel(ship2);
      });
      _(Asteroids).each(function(asteroid, id){
        ship.repel(asteroid);
      });
    }
    else if (ship.command('attract')){
      ship.eachOtherShip(function(ship2, id2){
        ship.attract(ship2);
      });
      _(Asteroids).each(function(asteroid, id){
        ship.attract(asteroid);
      });
    }
  });
}

function updateVelocities(){
  _(GameObjects).each(function(obj, id){
    obj.updateVelocity();
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

          ship.pos = ship.pos.add( dir.multiply(60 - distVector.modulus()) );
          ship2.pos = ship2.pos.add( dir2.multiply(60 - distVector.modulus()) );

          ship.vel = ship.vel.add( dir.multiply(Math.abs(dir.dot(relativeVel))) );
          ship2.vel = ship2.vel.add( dir2.multiply(Math.abs(dir2.dot(relativeVel2))) );

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

// Very simple for now. How about stripping out all []
// and joining the flat array, then lzw over that?
// TODO: delta compression (send only changes, not full positions)
function serializePositions(positions){
  return lzw_encode(JSON.stringify(positions));
}

var MAXSPEED = 10;
var ACC = 5;
var Game = {
  keymap: {
    73: 'up',      // i
    74: 'left',    // j
    75: 'down',    // k
    76: 'right',   // l
    32: 'fast',    // spacebar
    65: 'slow',    // a
    83: 'attract', // s
    68: 'repel'    // d
  },
  directions: {
    left:  $V([-1,0]),
    right: $V([1,0]),
    up:    $V([0,-1]),
    down:  $V([0,1])
  },
  flags: {
    up:      1 << 0,
    down:    1 << 1,
    left:    1 << 2,
    right:   1 << 3,
    fast:    1 << 4,
    slow:    1 << 5,
    attract: 1 << 6,
    repel:   1 << 7,
  }
};
var Asteroid = function(id, x, y, vx, vy){
  this.id = id;
  if (arguments.length === 5){
    this.pos = $V([x, y]);
    this.vel = $V([vx, vy]);
  }
  else {
    this.pos = Vector.Zero(2);
    this.vel = Vector.Zero(2);
  }
};
Asteroid.prototype = {
  updateVelocity: function(){
    // drag
    this.vel = this.vel.multiply(0.95);
    // speed limit 
    //if (this.vel.modulus() > MAXSPEED){
    //  this.vel = this.vel.multiply(0.85);
    //}
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
var Spaceship = function(id, name, x, y, vx, vy){
  this.id = id;
  this.name = name;
  if (arguments.length === 6){
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
  command: function(action){
    return this.bitmask & Game.flags[action];
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
  eachOtherShip: function(eachFunc){
    _(Spaceships).chain()
      .reject(function(ship2, id2){
        return this.id === id2;
      }).each(eachFunc);
  },
  distanceFrom: function(other){
    return other.pos.subtract(this.pos).modulus();
  },
  vectorTowards: function(other){
    return other.pos.subtract(this.pos).toUnitVector();
  },
  repel: function(other){
    var dist = this.distanceFrom(other);
    var repelF = 90000 / Math.pow(dist - 50, 2);
    if (repelF > 20){repelF = 20;}
    var velAdd = this.vectorTowards(other).multiply(repelF);
    other.vel = other.vel.add(velAdd);
  },
  attract: function(other){
    var dist = this.distanceFrom(other);
    var attractF = 90000 / Math.pow(dist - 50, 2);
    if (attractF > 15){attractF = 15;}
    var velAdd = other.vectorTowards(this).multiply(attractF);
    other.vel = other.vel.add(velAdd);
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

