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

var Spaceship = function(name, x, y){
  this.name = name;
  if (arguments.length === 3){
    this.posX = x;
    this.posY = y;
  }
  else {
    this.posX = 0;
    this.posY = 0;
  }
  this.image = paper.set();
  this.image.push(
    paper.image("images/spaceship.png", this.posX - 49, this.posY - 22.5, 98, 45),
    paper.text(this.posX - 49, this.posY - 22.5, this.name)
  );
};
Spaceship.prototype = {
  bitmask: 0x0,
  redraw: function(){
    var posXY = {
      x: Math.round(this.posX) - 49,
      y: Math.round(this.posY) - 22.5
    };
    this.image.attr(posXY);
  },
  // Relay bitmask of keys pressed down to server
  relayBitmask: function(){
    socket.send(JSON.stringify(this.bitmask));
  }
};

var Spaceships = {};
var socket;
var paper;

$(document).ready(function(){
  initKeyHandlers();
  paper = Raphael(0, 0, $(document).width(), $(document).height());
  initSocket();
});

// TODO: Change serialization to get rid json cruft '[' and ']'
//       since we can infer these from position with fixed-length arrays
function deserializePositions(positions){
  var temp = lzw_decode(positions);
  if (0.03 > Math.random()){
    console.log(
      positions + " - " +
      Math.round(positions.length*100/temp.length) + "%"
    );
  }
  return JSON.parse(temp);
}

function updateScreen(){
  // Update position of all spaceships
  $.each(Spaceships, function(id, spaceship){
    spaceship.redraw();
  });
  // Tell server about my bitmask
  MyShip.relayBitmask();
}

function initKeyHandlers(){
  $(document).keydown(function(event){
    if (event.keyCode in Game.keymap){
      var command = Game.keymap[event.keyCode];
      MyShip.bitmask |= Game.flags[command];
    }
  });

  $(document).keyup(function(event){
    if (event.keyCode in Game.keymap){
      var command = Game.keymap[event.keyCode];
      MyShip.bitmask &= ~Game.flags[command];
    }
  });
}

function initSocket(){
  //socket = new io.Socket(null,{port:8124})
  socket = new io.Socket(null,{
    port: 8124,
    transports: [
      'websocket',
      'flashsocket'
    ]
  });
  socket.connect();

  socket.on('connect', function(){
    var name = prompt("Choose a name");
    socket.send(JSON.stringify({
      name: name
    }));
  });

  socket.on('message', function(message){
    // Hacky way to check if it's an positions array (the most common message)
    // The message looks like this: [[1,22,33],[2,44,55]]
    // Each internal array represents an object. For example, in the first array,
    // 1 is the object id, with x = 22 and y = 33. 
    if (message.charAt(0) === "["){
      var positions = deserializePositions(message);
      _(positions).each(function(vals){
        var id = vals[0];
        Spaceships[id].posX = vals[1];
        Spaceships[id].posY = vals[2];
      });
      return null;
    }

    data = JSON.parse(message);

    if (data.birth){
      $.each(data.birth, function(id, ship){
        Spaceships[id] = new Spaceship(ship.name, ship.x, ship.y);
      });
    }
    else if (data.death){
      console.log(message);
      Spaceships[data.death].image.remove();
      delete Spaceships[data.death];
    }
    else if (data.name){
      console.log(message);
      MyShip = new Spaceship(data.name);
      Spaceships[data.selfId] = MyShip;
      setInterval(updateScreen, 30);
    }
  });

  socket.on('disconnect', function(){ $('body').prepend('you disconnected!') });
}
