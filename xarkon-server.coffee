# TODO:
#  - position/geometry/size/physics components
#  - tests - especially for serialization/deserialization/deserialization

http = require('http')
url  = require('url')
fs   = require('fs')
sys  = require('sys')
path = require('path')
io   = require('socket.io')
v    = require('./lib/vector2d')
$G   = require('./lib/component').$G
joop = require('./lib/joop')
log  = console.log
paperboy = require('./lib/node-paperboy')

GameObjects = {}
$G.baseObject = $G(lookup: GameObjects)

Game =
  # Could there be a better place for directions?
  directions:
    left:  v.create(-1, 0)
    right: v.create(1, 0)
    up:    v.create(0, -1)
    down:  v.create(0, 1)



hasPos = []
Pos = $G(
  # no compInit to create the @pos vector since every object using this
  # component will probably want to initialize it. wasteful to initialize
  # it here and then set it again in the init() function.
  # ie, i'm doing some premature optimization
  lookup: hasPos
  createPos: (x, y) ->
    @pos = v.create(x, y)
  setPos: (x, y) ->
    v.set(@pos, x, y)
  move: (vec)->
    v.add(@pos, vec)
)

Vel = $G(
  compInit: ->
    @vel = v.create(0, 0)
  setVel: (x, y) ->
    v.set(@vel, x, y)
  accelerate: (vec)->
    v.add(@vel, vec)
  df: 0.84 # default damping factor
  dampen: ->
    v.scale(@vel, @df)
)

hasPhysics = []
Physics = $G(Pos, Vel,
  compInit: ->
    @f = v.create(0, 0) # force vector
    @a = v.create(0, 0) # acceleration vector
  lookup: hasPhysics
  mass: 1
  # force/v.add function will probably be faster with x,y params instead
  # as vec won't have to be created then. TODO: benchmark
  force: (vec)->
    v.add(@f, vec)
  phyStep: ->
    v.scale(@f, 1/@mass, @a) # a = F/m
    v.set(@f, 0, 0)
    @accelerate(@a)
    @dampen()
    # may be appropriate to move the next line to a @velStep function which
    # would run for all objects with the Vel component. this way, we can have 
    # objects which don't have physics, but do have velocity - plausible
    @move(@vel)
)

hasEngine = []
Engine = $G(
  compInit: ->
    @thrustDir = v.create(0,0)
  lookup: hasEngine
  thrust: 9
  warp: 1
  addThrustDir: (vec)->
    v.add(@thrustDir, vec)
  propel: ->
    v.normalize(@thrustDir)
    @force( v.scale(@thrustDir, @thrust * @warp) )
    @warp = 1 # get it back to normal
    v.set(@thrustDir, 0, 0)
)

hasCommand = []
Command = $G(
  compInit: ->
    @bitmask = 0
  lookup: hasCommand
  setCommand: (com)->
    @bitmask |= @commandFlags[com]
  commandFlags: {}
  commandFuncs: {}
  processCommands: ->
    for com, flag of @commandFlags
      if flag & @bitmask
        @commandFuncs[com].apply(this)
)

# if you use ShipCommand, you must use Engine or a derivative too.
# Engine is not included as it may override say a custom engine
# and this component just shouldn't include that, though it amy assume it.
ShipCommand = $G(Command,
  commandFlags:
    up:      1 << 0
    down:    1 << 1
    left:    1 << 2
    right:   1 << 3
    fast:    1 << 4
    slow:    1 << 5
    #TODO implement attract/repel
    #attract: 1 << 6
    #repel:   1 << 7

  commandFuncs:
    up:    -> @addThrustDir(Game.directions.up)
    down:  -> @addThrustDir(Game.directions.down)
    left:  -> @addThrustDir(Game.directions.left)
    right: -> @addThrustDir(Game.directions.right)
    slow:  -> @warp = 0.5; @df = 0.8
    fast:  -> @warp = 2.5; @df = 0.87
)

SocketIoClient = $G(
  compInit: ->
    @sessionId = null # this needs to be set later
    @client = null # this needs to be set later
    @shortId = {top: 0}
    @shortId[@id] = 0 # damn, this wont' work because id isn't set yet, bleh
                      # need a compInitAfter
  setClient: (client)->
    [@client, @sessionId] = [client, client.sessionId]
  send: (msg)->
    @client.send(msg)
  setShortId: (id)->
    @shortId[id] = ++@shortId.top unless @shortId[id]?
  shortIdReset: ->
    #TODO:
    # - implement!
    # - this should clear out ids well out of range
    # - then it should reset values so that @shortId.top is below 100
    # - then it should notify the clients of new @shortId values.
    #   - this requires a new serialization format, mapping old to new
)

Serialize = $G(
  numCompress: (nums...)->
    out = ''
    for n in nums
      if n < 100
        out += String.fromCharCode(n+1)
        #^ the +1 makes sure we don't get null char (2 bytes in utf-8)
      else
        out += @numCompress(Math.floor n/100) + String.fromCharCode (n+1) % 100
    return out
  # input of 0-9999 would return a 2-character string. for fixed-length stuff
  fixedNumCompress: (nums...)->
    out = ''
    for n in nums
      if n >= 10000
        throw new Error 'fixedNumCompress() takes numbers below 10000'
      out += @numCompress(Math.floor n/100, n % 100)
    return out
)

SerializePos = $G(Serialize,
  serializePos: (objects)->
    [minX, minY] = [Infinity, Infinity]
    for obj in objects
      @setShortId(obj.id)
      minX = obj.pos[0] if obj.pos[0] < minX
      minY = obj.pos[1] if obj.pos[1] < minY

    if @shortId.top < 100
      output = 'p:'
      compressFunc = @numCompress
    else
      output = 'o:'
      compressFunc = @fixedNumCompress
    output += @numCompress(minX) + ':' + @numCompress(minY) + ':'

    for obj in objects
      output += compressFunc @shortId[obj.id]
      #^ this allows shortId of 0-9999, while 0-99 would mean max 100 objects
      #  unfortunately, this means an extra byte for every single object
      #  TODO: prematurely optimize this for bandwidth usage
      output += @posCompress obj.pos, minX, minY
    return output

  posCompress: (pos, origX, origY)->
    @fixedNumCompress(pos[0] - origX, pos[1] - origY)

  serializePosDelta: (objects)->
    output = 'd:'
    for obj in objects
      @setShortId(obj.id)
      output += @fixedNumCompress @shortId[obj.id]
      #TODO: prematurely optimize ^this for bandwidth usage
      output += @posDeltaCompress obj.vel
    return output

  # this encodes position in deltas only
  posDeltaCompress: (vel)->
    deltaX = vel[0]
    deltaY = vel[1]
    #TODO: make it so that max speed is 199 units/tick
    if 100 <= deltaX < -100 || 100 <= deltaY < -100
      [deltaX, deltaY] = [Math.floor deltaX/4, Math.floor deltaY/4]
      output = String.fromCharCode(127)
    else if 50 <= deltaX < -50 || 50 <= deltaY < -50
      [deltaX, deltaY] = [Math.floor deltaX/2, Math.floor deltaY/2]
      output = String.fromCharCode(126)
    else
      output = ''
    deltaX += 50
    deltaY += 50
    output += @numCompress(deltaX, deltaY)
    return output
)

SerializeCreate = $G(
  serializeCreate: (objects)->
    output = 'c:'
    for obj in objects
      @setShortId(obj.id)
    return output
)

Players = []
SpaceShip = $G(Physics, Engine, ShipCommand, SerializePos, SocketIoClient,
  lookup: Players
  init: (x, y) ->
    @createPos(x, y)
)

processCommands = ->
  for obj in hasCommand
    obj.processCommands()

propelEngines = ->
  for obj in hasEngine
    obj.propel()

physicsStep = ->
  for obj in hasPhysics
    obj.phyStep()
    #log v.str(obj.pos)

broadcastPositions = ->
  for player in Players
    #TODO:
    # - limit object positions sent to those in visual range
    # - keep track of client's estimates and send only those positions where
    #   the estimate is not close to the actual (say within +-5 units)
    #player.send(player.serializePosDelta(hasPos))
    player.send(v.str(player.pos))

GameLoop = joop(
  processCommands
  propelEngines
  physicsStep
  broadcastPositions
  30
)
GameLoop()

WEBROOT = path.dirname(__filename)
server = http.createServer( (req, res)->
  paperboy
    .deliver(WEBROOT, req, res)
    .error( (statCode, msg)->
      res.writeHead(statCode, 'Content-Type': 'text/plain')
      res.end('Error ' + statCode)
    )
    .otherwise( (err)->
      res.writeHead(404, 'Content-Type': 'text/plain')
      res.end('Error 404: File not found')
    )
)
server.listen(8124)
log 'Server running at http://localhost:8124/'

socket = io.listen(server)
socket.on('connection', (client)->
  # new player connects, needs a spaceship
  ss = new SpaceShip(0,0)
  ss.setClient(client)

  # better tell the player what's around
  #ss.send(ss.serializeCreate(hasPosition))
  ###
  setInterval((->
    client.send(Math.random())
  ), 1000)
  ###

  client.on('message', (msg)->
    ss.bitmask = Number(msg)
  )
  client.on('disconnect', (msg)->
  )
)

###
myastro = new SpaceShip(1,1)
myastro.setPos(23, 92)
log v.str(myastro.pos)
myastro.force(v.create(5,-10))
myastro.phyStep()
log v.str(myastro.vel)
log v.str(myastro.pos)
log JSON.stringify(GameObjects)
###