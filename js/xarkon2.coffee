$(document).ready ->
  initKeyHandlers()
  initSocket()

GameObjects = {}

Game =
  keymap:
    37: 'left'    # left arrow
    38: 'up'      # up arrow
    39: 'right'   # right arrow
    40: 'down'    # down arrow
    73: 'up'      # i
    74: 'left'    # j
    75: 'down'    # k
    76: 'right'   # l
    32: 'fast'    # spacebar
    65: 'slow'    # a
    83: 'attract' # s
    68: 'repel'   # d
  flags:
    up:      1 << 0
    down:    1 << 1
    left:    1 << 2
    right:   1 << 3
    fast:    1 << 4
    slow:    1 << 5
    attract: 1 << 6
    repel:   1 << 7

MyShip = bitmask : 0

initKeyHandlers = ->
  $(document).keydown (event)->
    if Game.keymap[event.keyCode]?
      command = Game.keymap[event.keyCode]
      MyShip.bitmask |= Game.flags[command]

  $(document).keyup (event)->
    if Game.keymap[event.keyCode]?
      command = Game.keymap[event.keyCode]
      MyShip.bitmask &= ~Game.flags[command]

#TODO set transports allowed?
socket = new io.Socket(null, {port: 8124, rememberTransport: false})

#TODO figure out how reconnections work and how to "intercept" them
#TODO selector cache for html-based rendering
initSocket = ->
  socket.connect()
  socket.on 'message', (msg)->
    protocol = msg[0]
    msg = msg.slice(1, msg.length)
    processMessage[protocol] msg

  x = setInterval( (->
    socket.send String(MyShip.bitmask)
  ), 30)

  socket.on 'disconnect', -> x.stop() #TODO replace with reconnection code?

processMessage =

  # creating objects
  c: (msg)->
    if msg.length % 3 != 0
      throw new Error "msg fixed-formatting prob (must be mult of 3): #{msg}"
    until msg.length == 0
      l = msg.length
      obj = msg.slice(l-3, l)
      msg = msg.slice(0, l-3)

      id = obj.charCodeAt(0)
      x  = obj.charCodeAt(1)
      y  = obj.charCodeAt(2)
      
      #TODO create an object instead here; abstract away rendering
      $('body').append("<div id='#{id}'></div>")
      $("##{id}")
        .css(left: x, top: y)

  d: (msg)->
    until msg.length == 0
      l = msg.length
      obj = msg.slice(l-1, l)
      msg = msg.slice(0, l-1)

      id = obj.charCodeAt(0)

      $("##{id}").remove()


  # updating positions via velocities
  j: (msg)->
    for id, vel of JSON.parse(msg)
      id = id.charCodeAt(0)
      [l, t] = [$("##{id}").css('left'), $("##{id}").css('top')] #TODO replace
      $("##{id}")
        .css(left: parseInt(l)+vel[0], top: parseInt(t)+vel[1])

