# TODO:
# - tests - especially for serialization/deserialization
# - modularize

http = require('http')
url  = require('url')
fs   = require('fs')
sys  = require('sys')
path = require('path')
io   = require('socket.io')
v    = require('./lib/vector2d')
joop = require('./lib/joop')
Grid = require('./lib/grid-lookup')
_    = require('underscore')
paperboy   = require('./lib/node-paperboy')
gcomponent = require('./lib/component').$G
log  = console.log


GameObjects = {}
gcomponent.baseObject = gcomponent(lookup: GameObjects)
grid = new Grid(10000, 10000, 10000/400, 10000/400)


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
    grid.move @id, p[0], p[1], @pos[0], @pos[1], @w, @h


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
  mass: 1
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


hasEngine = []
Engine = gcomponent
  compInit: ->
    @thrustDir = v.create 0,0
  lookup: hasEngine
  thrust: 9
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


SocketIoClient = gcomponent
  compInit: ->
    @sessionId = null # this needs to be set later
    @client = null # this needs to be set later
    @shortId = {top: 1}
    @shortId[@id] = String.fromCharCode(1) # @id was set by CMan's generated init
  setClient: (client)->
    [@client, @sessionId] = [client, client.sessionId]
  send: (msg)->
    @client.send(msg)
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


Serialize = gcomponent
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
      if  n < 0 || n >= 10000
        throw new RangeError 'fixedNumCompress() takes numbers 0..9999'
      out += @numCompress(n) #@numCompress(Math.floor n/100, n % 100)
    return out


SerializePos = gcomponent Serialize,
  serializePos: (objects)->
    [minX, minY] = [Infinity, Infinity]
    for obj in objects
      @setShortId(obj.id)
      minX = obj.pos[0] if obj.pos[0] < minX
      minY = obj.pos[1] if obj.pos[1] < minY

    output = 'p:'
    output += @numCompress(minX) + ':' + @numCompress(minY) + ':'

    for obj in objects
      output += @shortId[obj.id]
      output += @posCompress obj.pos, minX, minY
    return output

  posCompress: (pos, origX, origY)->
    @fixedNumCompress(pos[0] - origX, pos[1] - origY)

  #TODO: 
  # - prematurely optimize this for bandwidth usage
  # - also, just simplify it to use String.fromCharCode directly
  serializePosDelta: (objects)->
    output = 'd:'
    for obj in objects
      @setShortId(obj.id)
      output += @shortId[obj.id]
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


SerializeCreate = gcomponent
  serializeCreate: (objects)->
    output = 'c'
    for obj in objects
      output += @setShortId(obj.id)
      pos = obj.pos
      output += String.fromCharCode p for p in pos
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
Player = gcomponent Physics, Engine, ShipCommand, SerializeCreate, SocketIoClient,
  lookup: Players
  init: (x, y, client)->
    @createPos(x, y)
    @setClient(client)
  remove: ->
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
GameLoop = joop 30,
  processCommands
  propelEngines
  physicsStep
  broadcastPositions
GameLoop()


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
server.listen 8124
log 'Server running at http://localhost:8124/'


socket = io.listen server
socket.on 'connection', (client)->
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
