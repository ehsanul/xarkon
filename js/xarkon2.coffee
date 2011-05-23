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

initSocket = ->
  socket.connect()
  socket.on 'message', (msg)->
    pos = JSON.parse(msg)
    $('#ship').css(left: pos[0], top: pos[1])

  setInterval( (->
    socket.send String(MyShip.bitmask)
  ), 30)
