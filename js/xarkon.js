// TODO:
//   Create image once on client with canvas and using a base64-encoded version of that as div background.
//   Procedural generation of backgrounds like this: http://www.news.wisc.edu/newsphotos/images/Nebula_RCW49_04.jpg

var GameObjects = {};
var Spaceships = {};
var Asteroids = {};
var socket;
var paper;
var MyShip;
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
    repel:   1 << 7
  },
  viewport: {
    x: 0,
    y: 0,
    width: 1024,
    height: 700,
  }
};

var BlackHole = function(x, y){
  this.posX = x;
  this.posY = y;
  this.image =
    paper.circle(x, y, 80)
         .attr({
           fill: 'rrgba(40,40,60,100)-rgba(10,10,20,20)',
           stroke: 'none'
         });
}
BlackHole.prototype = {
  redraw: function(){
    var t = (new Date()).getTime();
    var vp = Game.viewport;
    var posXY = {
      cx: Math.round(this.posX) - vp.x,
      cy: Math.round(this.posY) - vp.y,
      r: 80 / (1 + 0.05*Math.sin(t/360))
    };
    this.image.attr(posXY);
  }
}

var Asteroid = function(id, x, y){
  this.id = id;
  this.name = name;
  if (arguments.length === 3){
    this.posX = x;
    this.posY = y;
  }
  else {
    this.posX = 300;
    this.posY = 300;
  }
  this.image = paper.image("images/asteroid.png", this.posX - 39.5, this.posY - 40.5, 79, 81);
};
Asteroid.prototype = {
  redraw: function(){
    var vp = Game.viewport;
    var posXY = {
      rotation: this.image.attr('rotation') + 1,
      x: Math.round(this.posX) - 39.5 - vp.x,
      y: Math.round(this.posY) - 40.5 - vp.y
    };
    this.image.attr(posXY);
  }
};

var Spaceship = function(id, name, x, y){
  this.id = id;
  this.name = name;
  if (arguments.length === 4){
    this.posX = x;
    this.posY = y;
  }
  else {
    this.posX = 300;
    this.posY = 300;
  }
  this.image = paper.set();
  this.image.push(
    paper.image("images/spaceship.png", this.posX - 50, this.posY - 22.5, 98, 45),
    paper.text(this.posX - 49, this.posY - 22.5, this.name).attr("fill", "white").attr("text-shadow", "#000 1px 1px 1px")
  );
};
Spaceship.prototype = {
  bitmask: 0x0,
  redraw: function(){
    var vp = Game.viewport;
    var posXY = {
      x: Math.round(this.posX) - 49 - vp.x,
      y: Math.round(this.posY) - 22.5 - vp.y
    };
    this.image.attr(posXY);
  },
  // Send bitmask of keys pressed down to server
  relayBitmask: function(){
    socket.send(JSON.stringify(this.bitmask));
  }
};

$(document).ready(function(){
  initKeyHandlers();
  paper = Raphael(
    0, 0,
    $(window).width(),
    $(window).height()
  );
  resetViewport();
  initSocket();
});

function resetViewport(){
  var vp = Game.viewport;
  vp.width = $(window).width();
  vp.height = $(window).height();
  paper.setSize(vp.width, vp.height);

  if (typeof MyShip === 'undefined'){
    vp.x = 0;
    vp.y = 0;
    vp.maxX = vp.width;
    vp.maxY = vp.height;
  }
  else{
    if (MyShip.posX - vp.x < 200){
      vp.x = MyShip.posX - 200;
    }
    else if ((vp.x+vp.width - $('#sidebar').width()) - MyShip.posX < 150){
      vp.x = MyShip.posX + 150 - vp.width + $('#sidebar').width();
    }
    if (MyShip.posY - vp.y < 200){
      vp.y = MyShip.posY - 200;
    }
    else if ((vp.y+vp.height) - MyShip.posY < 200){
      vp.y = MyShip.posY + 200 - vp.height;
    }
  }
}

function updateBackground(){
  var vp = Game.viewport;
  $('#viewport').css('background-position', -vp.x + 'px ' + -vp.y + 'px');
}

// TODO: Change serialization to get rid json cruft '[' and ']'
//       since we can infer these from position with fixed-length arrays.
//       Also, it turns out lzw encoding is useless compressions, because
//       converting bits to characters causes expansion
function deserializePositions(positions){
  var msg = lzw_decode(positions);
  return JSON.parse(msg);
}

function updateScreen(){
  resetViewport();
  updateBackground();
  // Update position of all spaceships
  _(GameObjects).each(function(obj, id){
    obj.redraw();
  });
  // Tell server what buttons are pressed down
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

function notify(msg, time){
  if (typeof time === 'undefined'){ time = 1000 };
  var t = paper.text($(window).width()/2, $(window).height()/2, msg)
               .attr({'font-size': 100, 'font-family': 'arial', fill: '#ccc'});
  t.animate({opacity: 0.0}, time, function(){
    this.remove();
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
    start = (new Date()).getTime();
  });

  socket.on('message', function(message){
    // Hacky way to check if it's an positions array (the most common message)
    // The message looks like this: [[1,22,33],[2,44,55]]
    // Each internal array represents an object. For example, in the first array,
    // 1 is the object id, with x = 22 and y = 33. 
    // TODO: replace with less hackiness, better protocol
    if (message.charAt(0) === "["){
      var positions = deserializePositions(message);
      _(positions).each(function(vals){
        var id = vals[0];
        GameObjects[id].posX = vals[1];
        GameObjects[id].posY = vals[2];
      });
      return null;
    }

    data = JSON.parse(message);
    console.log(message);

    // new spaceships
    if (data.sBirth){
      _(data.sBirth).each(function(ship, id){
        Spaceships[id] = new Spaceship(id, ship.name, ship.x, ship.y);
        GameObjects[id] = Spaceships[id];
      });
    }
    // new asteroids
    if (data.aBirth){
      _(data.aBirth).each(function(asteroid, id){
        Asteroids[id] = new Asteroid(id, asteroid.x, asteroid.y);
        GameObjects[id] = Asteroids[id];
      });
    }
    else if (data.death){
      Spaceships[data.death].image.remove();
      delete Spaceships[data.death];
    }
    else if (data.name){
      var id = data.selfId;
      MyShip = new Spaceship(id, data.name);
      Spaceships[id] = MyShip;
      GameObjects[id] = MyShip;
      setInterval(updateScreen, 30);
    }
    else if (data.points){
      notify(data.score)
    }
  });

  socket.on('disconnect', function(){ notify('You disconnected.\nTry refreshing.', 100000) });
}
