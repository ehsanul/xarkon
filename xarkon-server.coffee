#TODO:
# - position/geometry/size/physics components

Component = ->
Component.prototype =
  extend: (components...) ->
    for component in components
      for key, val of component
        this[key] = val
  new: (args...) ->
    F = ->
    F.prototype = this
    obj = new F
    obj.init(args...) if obj.init?
    return obj

$C = (components...) ->
  comp = new Component
  comp.extend components...
  return comp
