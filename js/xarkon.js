// TODO:
//  create GameObjects array and use that for render loop
//   Make background rendering more efficient by creating image once on client  with canvas and using a base64-encoded version of that as div background.
//   Procedural generation of backgrounds like this: http://www.news.wisc.edu/newsphotos/images/Nebula_RCW49_04.jpg

var STAR_DENSITY = 0.05;
var Stars = [];
Stars.maxX = Stars.minX = Stars.maxY = Stars.minY = 0;
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
    repel:   1 << 7,
  },
  viewport: {
    x: 0,
    y: 0,
    minX: 0,
    maxX: 0,
    minY: 0,
    maxY: 0,
    width: 1024,
    height: 700,
    changed: false
  }
};

var BlackHole = function(x, y){
  this.posX = x;
  this.posY = y;
  this.image = paper.circle(x, y, 80)
                    .attr({fill: 'rrgba(40,40,60,100)-rgba(10,10,20,20)', stroke: 'none'});
}
BlackHole.prototype = {
  redraw: function(){
    var vp = Game.viewport;
    var posXY = {
      cx: Math.round(this.posX) - vp.x,
      cy: Math.round(this.posY) - vp.y
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
    paper.image("images/spaceship.png", this.posX - 49, this.posY - 22.5, 98, 45),
    paper.text(this.posX - 49, this.posY - 22.5, this.name)
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
  // Relay bitmask of keys pressed down to server
  relayBitmask: function(){
    socket.send(JSON.stringify(this.bitmask));
  }
};

$(document).ready(function(){
  initKeyHandlers();
  paper = Raphael(0, 0, $(window).width(), $(window).height());
  resetViewport();
  //createStars();
  initSocket();
});

function resetViewport(){
  var vp = Game.viewport;
  vp.changed = false;
  vp.width = $(window).width();
  vp.height = $(window).height();
  paper.setSize(vp.width, vp.height);

  if (MyShip === undefined){
    vp.x = 0;
    vp.y = 0;
    vp.maxX = vp.width;
    vp.maxY = vp.height;
  }
  else{
    if (MyShip.posX - vp.x < 200){
      vp.x = MyShip.posX - 200;
      vp.minX = (vp.x < vp.minX) ? vp.x : vp.minX;
      vp.changed = true;
    }
    else if ((vp.x+vp.width) - MyShip.posX < 200){
      vp.x = MyShip.posX + 200 - vp.width;
      vp.maxX = (vp.x + vp.width > vp.maxX) ? vp.x + vp.width : vp.maxX;
      vp.changed = true;
    }
    if (MyShip.posY - vp.y < 150){
      vp.y = MyShip.posY - 150;
      vp.minY = (vp.y < vp.minY) ? vp.y : vp.minY;
      vp.changed = true;
    }
    else if ((vp.y+vp.height) - MyShip.posY < 150){
      vp.y = MyShip.posY + 150 - vp.height;
      vp.maxY = (vp.y + vp.height > vp.maxY) ? vp.y + vp.height : vp.maxY;
      vp.changed = true;
    }
  }
}

function createStars(x,y,width,height){
  if (arguments.length !== 4){
    var vp = Game.viewport;
    var x = vp.x; var y = vp.y;
    var width = vp.width;
    var height = vp.height;
  }
  var area = width * height
  var num_stars = STAR_DENSITY * area / 7000
  for(var i=0;i<num_stars;i++){
    var x2 = x + width * Math.random();
    var y2 = y + height * Math.random();
    var r = 2 + 4 * Math.random();
    var star = paper.circle(x2,y2,r).attr("fill",  "r#fff-#000" ).toBack();
    star.x = x2; star.y = y2;
    Stars.push(star);
  }
}

function moveBackground(){
  var vp = Game.viewport;
  $('body').css('background-position', (-400 - vp.x) + 'px ' + (-400 - vp.y) + 'px');
  _(Stars).each(function(star){
    star.attr({
      cx: star.x - vp.x,
      cy: star.y - vp.y
    });
  });
}

function updateStars(){
  moveBackground();
  /*
  var vp = Game.viewport;
  if (Stars.minX + 200 > vp.minX){
    //console.log('creating stars!')
    createStars(Stars.minX - 200, Stars.minY, 200, Stars.maxY - Stars.minY);
    Stars.minX -= 200;
  }
  else if (Stars.maxX - 200 < vp.maxX){
    //console.log('creating stars!')
    createStars(Stars.maxX, Stars.minY, 200, Stars.maxY - Stars.minY);
    Stars.maxX += 200;
  }
  if (Stars.minY + 200 > vp.minY){
    //console.log('creating stars!')
    createStars(Stars.minX, Stars.minY - 200, Stars.maxX - Stars.minX, 200);
    Stars.minY -= 200;
  }
  else if (Stars.maxY - 200 < vp.maxY){
    //console.log('creating stars!')
    createStars(Stars.minX, Stars.maxY, Stars.maxX - Stars.minX, 200);
    Stars.maxY += 200;
  }
  */
}

// TODO: Change serialization to get rid json cruft '[' and ']'
//       since we can infer these from position with fixed-length arrays
function deserializePositions(positions){
  var temp = lzw_decode(positions);
  /* if (0.03 > Math.random()){
    console.log(
      positions + " - " +
      Math.round(positions.length*100/temp.length) + "%"
    );
  }*/
  return JSON.parse(temp);
}

function updateScreen(){
  resetViewport();
  updateStars();
  // Update position of all spaceships
  _(GameObjects).each(function(obj, id){
    obj.redraw();
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

function notify(msg){
  var t = paper.text($(window).width()/2, $(window).height()/2, msg)
               .attr({'font-size': 60, 'font-family': 'arial', fill: '#ccc'});
  t.animate({opacity: 0.0}, 1000, function(){
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

    if (data.sBirth){
      _(data.sBirth).each(function(ship, id){
        Spaceships[id] = new Spaceship(id, ship.name, ship.x, ship.y);
        GameObjects[id] = Spaceships[id];
      });
    }
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

  socket.on('disconnect', function(){ $('body').prepend('you disconnected!') });
}
