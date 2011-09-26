/*
  glMatrix.js - High performance matrix and vector operations for WebGL
  version 0.9.5
*/
/*
  Copyright (c) 2010 Brandon Jones
  
  This software is provided 'as-is', without any express or implied
  warranty. In no event will the authors be held liable for any damages
  arising from the use of this software.
  
  Permission is granted to anyone to use this software for any purpose,
  including commercial applications, and to alter it and redistribute it
  freely, subject to the following restrictions:
  
     1. The origin of this software must not be misrepresented; you must not
     claim that you wrote the original software. If you use this software
     in a product, an acknowledgment in the product documentation would be
     appreciated but is not required.
  
     2. Altered source versions must be plainly marked as such, and must not
     be misrepresented as being the original software.
  
     3. This notice may not be removed or altered from any source
     distribution.
*/var glMatrixArrayType, vec2d;
if (typeof Float32Array !== "undefined" && Float32Array !== null) {
  glMatrixArrayType = Float32Array;
} else if (typeof WebGLFloatArray !== "undefined" && WebGLFloatArray !== null) {
  glMatrixArrayType = WebGLFloatArray;
} else {
  glMatrixArrayType = Array;
}
/*
  vec2d - 2 Dimensional Vector
*/
vec2d = {};
/*
  vec2d.create
  Creates a new instance of a vec2d using the default array type
  Any javascript array containing at least 3 numeric elements can serve as a vec2d
  
  Params:
  x and y, to initialize the vector
  
  Returns:
  New vec2d
*/
vec2d.create = function(x, y) {
  var dest;
  dest = new glMatrixArrayType(2);
  dest[0] = x;
  dest[1] = y;
  return dest;
};
/*
  vec2d.set
  Set the values of the vec2d
  
  Params:
  dest - vec2d receiving values
  x and y - values to set to
  
  Returns:
  dest
*/
vec2d.set = function(dest, x, y) {
  dest[0] = x;
  dest[1] = y;
  return dest;
};
/*
  vec2d.add
  Performs a vector addition
  
  Params:
  vec - vec2d, first operand
  vec2 - vec2d, second operand
  dest - Optional, vec2d receiving operation result. If not specified result is written to vec
  
  Returns:
  dest if specified, vec otherwise
*/
vec2d.add = function(vec, vec2, dest) {
  if (!dest || vec === dest) {
    vec[0] += vec2[0];
    vec[1] += vec2[1];
    return vec;
  }
  dest[0] = vec[0] + vec2[0];
  dest[1] = vec[1] + vec2[1];
  return dest;
};
/*
  vec2d.subtract
  Performs a vector subtraction
  
  Params:
  vec - vec2d, first operand
  vec2 - vec2d, second operand
  dest - Optional, vec2d receiving operation result. If not specified result is written to vec
  
  Returns:
  dest if specified, vec otherwise
*/
vec2d.subtract = function(vec, vec2, dest) {
  if (!dest || vec === dest) {
    vec[0] -= vec2[0];
    vec[1] -= vec2[1];
    return vec;
  }
  dest[0] = vec[0] - vec2[0];
  dest[1] = vec[1] - vec2[1];
  return dest;
};
/*
  vec2d.negate
  Negates the components of a vec2d
  
  Params:
  vec - vec2d to negate
  dest - Optional, vec2d receiving operation result. If not specified result is written to vec
  
  Returns:
  dest if specified, vec otherwise
*/
vec2d.negate = function(vec, dest) {
  if (!dest) {
    dest = vec;
  }
  dest[0] = -vec[0];
  dest[1] = -vec[1];
  return dest;
};
/*
  vec2d.scale
  Multiplies the components of a vec2d by a scalar value
  
  Params:
  vec - vec2d to scale
  val - Numeric value to scale by
  dest - Optional, vec2d receiving operation result. If not specified result is written to vec
  
  Returns:
  dest if specified, vec otherwise
*/
vec2d.scale = function(vec, val, dest) {
  if (!dest || vec === dest) {
    vec[0] *= val;
    vec[1] *= val;
    return vec;
  }
  dest[0] = vec[0] * val;
  dest[1] = vec[1] * val;
  return dest;
};
/*
  vec2d.normalize
  Generates a unit vector of the same direction as the provided vec2d
  If vector length is 0, returns [0, 0, 0]
  
  Params:
  vec - vec2d to normalize
  dest - Optional, vec2d receiving operation result. If not specified result is written to vec
  
  Returns:
  dest if specified, vec otherwise
*/
vec2d.normalize = function(vec, dest) {
  var len, x, y;
  if (!dest) {
    dest = vec;
  }
  x = vec[0], y = vec[1];
  len = Math.sqrt(x * x + y * y);
  if (!len) {
    dest[0] = 0;
    dest[1] = 0;
    return dest;
  } else if (len === 1) {
    dest[0] = x;
    dest[1] = y;
    return dest;
  }
  len = 1 / len;
  dest[0] = x * len;
  dest[1] = y * len;
  return dest;
};
/*
  vec2d.crossZ
  Generates the cross product of two vec2ds.
  It returns just the Z, as that is all there will be
  
  Params:
  vec - vec2d, first operand
  vec2 - vec2d, second operand
  
  Returns:
  dest if specified, vec otherwise
*/
vec2d.crossZ = function(vec, vec2) {
  var x, x2, y, y2, z;
  x = vec[0], y = vec[1];
  x2 = vec2[0], y2 = vec2[1];
  z = x * y2 - y * x2;
  return z;
};
/*
  vec2d.length
  Caclulates the length of a vec2d
  
  Params:
  vec - vec2d to calculate length of
  
  Returns:
  Length of vec
*/
vec2d.length = function(vec) {
  var x, y;
  x = vec[0], y = vec[1];
  return Math.sqrt(x * x + y * y);
};
/*
  vec2d.dot
  Caclulates the dot product of two vec2ds
  
  Params:
  vec - vec2d, first operand
  vec2 - vec2d, second operand
  
  Returns:
  Dot product of vec and vec2
*/
vec2d.dot = function(vec, vec2) {
  return vec[0] * vec2[0] + vec[1] * vec2[1];
};
/*
  vec2d.direction
  Generates a unit vector pointing from one vector to another
  
  Params:
  vec - origin vec2d
  vec2 - vec2d to point to
  dest - Optional, vec2d receiving operation result. If not specified result is written to vec
  
  Returns:
  dest if specified, vec otherwise
*/
vec2d.direction = function(vec, vec2, dest) {
  var len, x, y;
  if (!dest) {
    dest = vec;
  }
  x = vec[0] - vec2[0];
  y = vec[1] - vec2[1];
  len = Math.sqrt(x * x + y * y);
  if (!len) {
    dest[0] = 0;
    dest[1] = 0;
    return dest;
  }
  len = 1 / len;
  dest[0] = x * len;
  dest[1] = y * len;
  return dest;
};
/*
  vec2d.str
  Returns a string representation of a vector
  
  Params:
  vec - vec2d to represent as a string
  
  Returns:
  string representation of vec
*/
vec2d.str = function(vec) {
  return '[' + vec[0] + ', ' + vec[1] + ']';
};
if ((typeof module !== "undefined" && module !== null ? module.exports : void 0) != null) {
  module.exports = vec2d;
}