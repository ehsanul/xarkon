var $C, Physics, Pos, SpaceShip, fs, http, io, myastro, paperboy, path, sys, url;
http = require('http');
url = require('url');
fs = require('fs');
sys = require('sys');
path = require('path');
io = require('./lib/socket.io');
$C = require('./lib/component').$C;
paperboy = require('./lib/node-paperboy');
Pos = $C({
  setPos: function(x, y) {
    this.x = x;
    return this.y = y;
  }
});
Physics = $C(Pos);
SpaceShip = $C(Physics, {
  init: function(x, y) {
    return setPos(x, y);
  }
});
myastro = Astro["new"](23, 92);
console.log(myastro.x);
console.log(myastro.acceleration);
console.log(myastro.another());