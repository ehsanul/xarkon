## Dependencies

  - [Node.js](http://nodejs.org/)
  - [Socket.IO-node](https://github.com/LearnBoost/Socket.IO-node) and 
      [node-paperboy](https://github.com/felixge/node-paperboy) are bundled,
      but make sure to use the --recursive option to download the git submodules

## Run it
 
  In the terminal:

    $ node xarkon-server.js

  Then go to http://localhost:8124/xarkon.html/ in two browser windows.
  Only Chrome really works perfectly for now. Firefox 4 Beta (my version is 4.08b pre) works
  if you first start the web console (ctrl+shift+k), then load (refresh won't work) the page,
  then you can disable the console to avoid the performance hit. Strange bug there.

  Use 'ikjl' to move, spacebar for moving fast, 'a' to move slow, 
  's' to attract and 'd' to repel. There's some very crude
  collision detection and toy "physics".

## About

I'm just playing around with ideas here. The "game" is at an extremely primitive stage now,
but the idea is to have just a few basic commands that allow players to come up with
many interesting and unanticipated strategies for gameplay. This philosophy is inspired by
games like Gish (vs mode) and Portal. I hope to build several mini-games over the base.

EDIT: Check the spaceball branch for a particular mini-game I've made.

Since the client is completely free to modify its source, or use completely different
code client-side, cheating is an important concern. That's why I'm using the authoritative
server model. Clients send just a bitmask of the keys pressed down, and the server runs
the game logic loop and send back the game state (just positions now). The render loop
obviously runs on the client.

Plan to replace the current simple collision detection scheme with a GJK implementation. 
Also interested in rtrees/quadtrees for use in collision detection, but that can wait
till later.

Also need to add client-side prediction to hide latency, and smoothing on the client-side as
well. After client-side prediction, there's a lot more work required to deal with
latency, because high-speed player collisions can seem like non-collisions to some
players if you don't adjust for latency client-side.

Dead-reckoning is the way to go I think, but that still leaves a discrepancy between
the client and server, since commands are processed a few frames late, and the results
sent back even later than that. Networked gaming over the internet is hard. TCP (no UDP
yet for websocket) also means there's a lot of variability in latency, due to packet
loss, but the upside is that delivery and order of messages is guaranteed.

Also have some work on message compression, specialized for text messages consisting
of mostly (or completely) numbers, to minimize bandwidth.

Finally, I'd like to refactor game objects to use an entity-based system, 
for the sake of flexibility. Once that's in place, experimentation with new ideas
will be much easier (hopefully), though this benefit is probably most applicable to static
languages, rather than JS. The only game objects now are the player spaceships,
so the entity system can wait.
