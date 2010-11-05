I'm just playing around with ideas here. The "game" is at an extremely primitive stage,
and really has nothing besides control and movement right now. Use 'ikjl' to move, spacebar
for moving fast and 's' to move slow.

Plan to add collision detection, a simple one first then a GJK implementation. 
Also interested in rtrees/quadtrees for use in collision detection, but that can wait
till later.

Also need to add client-side prediction to hide latency and smoothing on the client-side as
well. After client-side prediction, there's a lot more work required to deal with
latency, because high-speed player collisions can seem like non-collisions to some
players if you don't adjust for latency client-side.
