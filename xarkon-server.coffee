# TODO:
# - tests - especially for serialization/deserialization
# - modularize

http = require('http')
url  = require('url')
fs   = require('fs')
sys  = require('sys')
path = require('path')
sio   = require('socket.io')
v    = require('./lib/vector2d')
joop = require('./lib/joop')
Grid = require('./lib/grid-lookup')
_    = require('underscore')
paperboy   = require('./lib/node-paperboy')
gcomponent = require('./lib/component').$G
log  = console.log
CHARCODE_OFFSET = Math.pow(2, 15)


GameObjects = {}
gcomponent.baseObject = gcomponent
  lookup: GameObjects
  #TODO: move this to gcomponent
  removeLookups: ->
    for lookup in @_lookup
      if lookup instanceof Array
        for id, i in lookup
          if id == @id
            lookup.splice(i,1)
            break
      else
        delete lookup[@id]
gridW = gridH = 10000
gridCols = gridRows = gridW / 400
grid = new Grid(gridW, gridH, gridCols, gridRows)


Game =
  # Could there be a better place for directions?
  directions:
    left:  v.create(-1,  0)
    right: v.create( 1,  0)
    up:    v.create( 0, -1)
    down:  v.create( 0,  1)


hasPos = []
Pos = gcomponent
  # no compInit to create the @pos vector since every object using this
  # component will probably want to initialize it. wasteful to initialize
  # it here and then set it again in the init() function.
  # ie, i'm doing some premature optimization
  compInit: ->
    # in case this object has no @w or @h
    @w ?= 1
    @h ?= 1
  lookup: hasPos

  createPos: (x, y) ->
    @pos = v.create x, y
    grid.insert @id, x, y, @w, @h

  setPos: (x, y) ->
    grid.move @id, @pos[0], @pos[1], x, y, @w, @h
    v.set @pos, x, y

  move: (vec)->
    p = [@pos[0], @pos[1]]
    v.add @pos, vec
    if @pos[0] < 0
      @pos[0] += gridW
    else if @pos[0] >= gridW
      @pos[0] -= gridW
    if @pos[1] < 0
      @pos[1] += gridH
    else if @pos[1] >= gridH
      @pos[1] -= gridH
    grid.move @id, p[0], p[1], @pos[0], @pos[1], @w, @h

  distance: (pos)->
    ab = v.subtract(pos, @pos, [])
    [x, y] = (Math.abs n for n in ab)
    # dealing with the wrapped grid/map
    if x > gridW/2
      ab[0] = gridW - x
    if y > gridH/2
      ab[1] = gridH - y
    v.length ab

  vectorTowards: (pos)->
    ab = v.subtract(pos, @pos, [])
    # dealing with the wrapped grid/map
    if ab[0] > gridW/2
      ab[0] -= gridW
    else if ab[0] < -gridW/2
      ab[0] += gridW
    if ab[1] > gridH/2
      ab[1] -= gridH
    else if ab[1] < -gridH/2
      ab[1] += gridH
    v.normalize ab

  vectorFrom: (pos)->
    v.negate @vectorTowards(pos)


Vel = gcomponent
  compInit: ->
    @vel      = v.create 0, 0
    @velError = v.create 0, 0
    @velEC    = v.create 0, 0
  setVel: (x, y) ->
    v.set @vel, x, y
  accelerate: (vec)->
    v.add @vel, vec
  df: 0.84 # default damping factor
  dampen: ->
    v.scale @vel, @df


hasPhysics = []
Physics = gcomponent Pos, Vel,
  compInit: ->
    @f = v.create 0, 0 # force vector
    @a = v.create 0, 0 # acceleration vector
  lookup: hasPhysics
  mass: 100
  # force/v.add function will probably be faster with x,y params instead
  # as vec won't have to be created then. TODO: benchmark
  force: (vec)->
    v.add @f, vec
  phyStep: ->
    v.scale @f, 1/@mass, @a      # a = F/m
    v.set @f, 0, 0
    @accelerate @a
    @dampen()
    # may be appropriate to move the next line to a @velStep function which
    # would run for all objects with the Vel component. this way, we can have 
    # objects which don't have physics, but do have velocity - plausible
    @move @vel

GravityControl = gcomponent
  attract: ->
    @gravForce @vectorFrom
    
  repel: ->
    @gravForce @vectorTowards

  gravForce: (dirFunc)->
    l = 1200
    objectIds = grid.rangeSearch @pos[0]-l, @pos[1]-l, l*2, l*2
    surroundingObjs = (GameObjects[id] for id in objectIds)
    for obj in surroundingObjs
      unless obj?
        console.error objectIds
        console.error GameObjects
        continue
      continue if obj.id == @id
      distance =  Math.max @distance(obj.pos), 150
      # FIXME there's normal gravity, which is GMm/r^2, and controlled
      # "gravity", which should work differently. a player shouldn't be able to
      # push/pull a huge planet more easily than a tiny asteroid!
      magnitude = 5000 * @mass * obj.mass / Math.pow distance, 2
      #log "object id: #{obj.id}"
      #log "distance: #{distance}"
      #log "magnitude: #{magnitude}"
      #log "obj force: #{obj.f}"
      direction = dirFunc.apply this, [obj.pos]
      obj.force v.scale direction, magnitude
      #log "obj force after: #{obj.f}"


hasEngine = []
Engine = gcomponent
  compInit: ->
    @thrustDir = v.create 0, 0
  lookup: hasEngine
  thrust: 900
  warp: 1
  addThrustDir: (vec)->
    v.add @thrustDir, vec
  propel: ->
    v.normalize @thrustDir
    @force v.scale(@thrustDir, @thrust * @warp) #TODO inline @thrust?
    @warp = 1 # get it back to normal; TODO put this in Command component
    v.set @thrustDir, 0, 0


hasCommand = []
Command = gcomponent
  compInit: ->
    @bitmask = 0
  lookup: hasCommand
  setCommand: (com)->
    
  commandFlags: {}
  commandFuncs: {}
  processCommands: ->
    for com, flag of @commandFlags
      if flag & @bitmask
        @commandFuncs[com].apply(this)


# if you use ShipCommand, you must use Engine or a derivative too.
# Engine is not included as it may override say a custom engine
# and this component just shouldn't include that, though it does assume it.
ShipCommand = gcomponent Command,
  commandFlags:
    up:      1 << 0
    down:    1 << 1
    left:    1 << 2
    right:   1 << 3
    fast:    1 << 4
    slow:    1 << 5
    #TODO implement repel
    attract: 1 << 6
    repel:   1 << 7

  commandFuncs:
    up:    -> @addThrustDir Game.directions.up
    down:  -> @addThrustDir Game.directions.down
    left:  -> @addThrustDir Game.directions.left
    right: -> @addThrustDir Game.directions.right
    slow:  -> @warp = 0.5; @df = 0.8
    fast:  -> @warp = 2.5; @df = 0.87
    attract: -> @attract()
    repel: -> @repel()


SocketIoClient = gcomponent
  compInit: ->
    @sessionId = null # this needs to be set later
    @client = null # this needs to be set later
    @shortId = top: 1
    @shortId[@id] = String.fromCharCode 1  # @id was set by CMan's generated init
  setClient: (client)->
    [@client, @sessionId] = [client, client.sessionId]
  send: (msg)->
    @client.send msg
  setShortId: (id)->
    unless @shortId[id]?
      @shortId[id] = String.fromCharCode ++@shortId.top
    return @shortId[id]
  shortIdReset: ->
    #TODO:
    # - implement!
    # - this should clear out ids well out of range or not seen for a while
    # - should make sure own shortId is 0
    # - then it should reset values so that @shortId.top is below 100
    # - then it should notify the clients of new @shortId values.
    #   - this requires a new serialization format, mapping old to new


# TODO proper serialization of values to binary (base128-encoded)
SerializeCreate =
  serializeCreate: (objects)->
    output = 'c'
    for obj in objects
      output += @setShortId(obj.id)
      pos = obj.pos
      # offset due to how String.fromCharCode behaves with negative values.
      output += String.fromCharCode(p + CHARCODE_OFFSET) for p in pos
    return output
  sendCreate: (objects)->
    @send @serializeCreate(objects)
  serializeDestroy: (objects)->
    output = 'd'
    for obj in objects
      output += @setShortId(obj.id)
    return output
  sendDestroy: (objects)->
    @send @serializeDestroy(objects)


Players = []
Player = gcomponent Physics, Engine, ShipCommand,
  SerializeCreate, SocketIoClient, GravityControl,
  lookup: Players
  init: (x, y, client)->
    @createPos(x, y)
    @setClient(client)
  remove: ->
    @removeLookups()
    grid.delete @id, @pos[0], @pos[1], @w, @h
    for p in Players
      p.sendDestroy([this])


processCommands = ->
  for obj in hasCommand
    obj.processCommands()

propelEngines = ->
  for obj in hasEngine
    obj.propel()

physicsStep = ->
  for obj in hasPhysics
    obj.phyStep()

broadcastPositions = ->
  for obj in hasPos
    #TODO figure out the off-by-one error in x/y position rendered
    v.add obj.vel, obj.velError, obj.velEC
    velRounded = _(obj.velEC).map Math.round
    v.subtract obj.velEC, velRounded, obj.velError
  for player in Players
    #TODO:
    # - Eureka! send vel deltas instead, smaller
    # - limit object positions sent to those in visual range
    # - keep track of client's estimates and send only those positions where
    #   the estimate is not close to the actual (say within +-3 units)
    #player.send(player.serializePosDelta(hasPos))
    velInfo = {}
    for obj in hasPos
      shortId = player.setShortId(obj.id)
      velInfo[shortId] =_(obj.velEC).map Math.round
    player.send 'j' + JSON.stringify velInfo # TODO compress


#TODO take a closer look at joop's behaviour
joop 30,
  processCommands
  propelEngines
  physicsStep
  broadcastPositions


WEBROOT = path.dirname __filename
server = http.createServer (req, res)->
  paperboy
    .deliver(WEBROOT, req, res)
    .error (statCode, msg)->
      res.writeHead(statCode, 'Content-Type': 'text/plain')
      res.end('Error ' + statCode)
    .otherwise (err)->
      res.writeHead(404, 'Content-Type': 'text/plain')
      res.end('Error 404: File not found')

io = sio.listen server
server.listen 8124
log 'Server running at http://localhost:8124/'

io.sockets.on 'connection', (client)->
  # new player connects, needs a spaceship
  player = new Player 0, 0, client
  player.sendCreate Players #TODO {} serialization, then s/Players/GameObjects/

  #TODO: notify other players about this new player
  for p in Players
    continue if p.id == player.id
    p.sendCreate([player])

  client.on 'message', (msg)->
    player.bitmask = msg.charCodeAt(0)

  client.on 'disconnect', (msg)->
    player.remove()
