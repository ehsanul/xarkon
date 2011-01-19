#TODO:
# - position/geometry/size/physics components

http = require('http')
url  = require('url')
fs   = require('fs')
sys  = require('sys')
path = require('path')
io   = require('./lib/socket.io')
$C   = require('./lib/component').$C
paperboy = require('./lib/node-paperboy')

# TODO 
#   - use floatarray-based matrix library for position/etc vectors

# temporary, not real implementation
Pos = $C(
  setPos: (x, y) ->
    @x = x
    @y = y
)

Physics = $C(Pos
)

SpaceShip = $C(Physics,
  init: (x, y) ->
    setPos(x, y)
)

myastro = Astro.new(23, 92)
console.log(myastro.x)
console.log(myastro.acceleration)
console.log(myastro.another())
