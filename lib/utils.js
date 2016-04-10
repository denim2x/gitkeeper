var
  fs = require("fs"),
  path = require("path"),
  util = require("util"),

  flagMap = {
    c: "configurable",
    e: "enumerable",
    w: "writable"
  };

flagMap.keys = Object.keys(flagMap);

util._extend(Object, {
  attach: function attach (target, flags, methods) {
    if (typeof flags != "string") {
      methods = flags;
      flags = "";
    }
    if (Array.isArray(methods)) {
      var object = {};
      methods.forEach(function (method) {
        object[method.name] = method;
      });
      methods = object;
    }
    return Object.mixin(target, flags, methods);
  },
  format: JSON.stringify,
  getOwnPropertySymbols: Object.getOwnPropertySymbols
  || function getOwnPropertySymbols () {
    return []
  },
  mixin: function mixin (target, flags) {
    if (target == null) {
      throw Error.null_to_object;
    }
    target = Object(target);
    flags = flags || "";
    var config = {}, len = flags.length;
    for (var i = 0; i < len; i++) {
      var flag = flags[i];
      var loFlag = flag.toLowerCase();
      var key = flagMap[loFlag];
      if (key != null) {
        config[key] = flag == loFlag;
      }
    }

    var flatten = /f/.test(flags);
    var force = /^/.test(flags);       // Should be the first
    var quiet = /~/.test(flags);       // Should be the last
    var total = /\*/.test(flags);      // Should be before '~'
    var len = arguments.length;
    for (var i = 2; i < len; i++) {
      var source = Object(arguments[i]);
      ["Names", "Symbols"].forEach(function (key) {
        Object["getOwnProperty" + key](source).forEach(paste);
      });
    }
    return target;

    function paste (key) {
      "use strict";
      if (target.hasOwnProperty(key) && !force) return;
      var prop = Object.getOwnPropertyDescriptor(source, key);
      if (!prop.enumerable && !total) return;
      util._extend(prop, config);
      try {
        Object.defineProperty(target, key, prop);
      } catch (e) {
        if (!quiet)
          throw e;
      }
    }
  }
});
Object.attach(Object, [
  function assign (target) {
    target = Object(target);
    var sources = Array.slice(arguments, 1);
    sources.each(function (source) {
      Object.mixin(target, "^cfw", source);
    });
    return target;
  }
]);
Object.attach(Object, "^", [
  function bake (target) {
    target = Object(target);
    var len = arguments.length;
    for (var i = 1; i < len; i++) {
      Object.mixin(target, "CfW", arguments[i]);
    }
    return target;
  },
  function build (flags, methods) {
    return Object.attach({}, flags, methods);
  },
  function clone (object, flags) {
    flags = (flags || "") + "*";
    var result = {};
    if (/P/.test(flags)) {
      var prototype = Object.getPrototypeOf(object);
      result = Object.create(prototype);
    }
    return Object.mixin(result, flags, object);
  },
  function extend (target) {
    target = Object(target);
    var sources = Array.slice(arguments, 1);
    sources.each(function (source) {
      Object.mixin(target, "cfw", source);
    });
    return target;
  },
  function gird (target) {
    target = Object(target);
    var sources = Array.slice(arguments, 1);
    sources.each(function (source) {
      Object.mixin(target, "Cfw", source);
    });
    return target;
  }
]);

Object.bake(Error, {
  null_to_object: new TypeError(
    "Cannot convert undefined or null to object")
});

function each (take, args, self) {
  var i, ret, len = this.length;
  args = args || [];
  for (i = 0; i < len; i++) {
    ret = take.apply(self, [this[i]].concat(args, [i, this]));
    if (ret !== undefined) break;
  }
  return ret;
}
function has (object) {
  return this.indexOf(object) >= 0;
}
function within (object) {
  if (object == null) {
    return false;
  }
  return object.hasOwnProperty(this);
}

Object.attach(String, [
  function _slice (string, rest) {
    return String.prototype.slice.apply(string, rest);
  },
  function slice () {
    var array = Array.shift(arguments);
    return String._slice(array, arguments);
  }
]);
Object.attach(String.prototype, [each, has, within]);
Object.defineProperty(String.prototype, "lines", {
  get: function () {
    return this.split(/\r?\n/g);
  }
});

if ("Symbol".within(global)) {
  Object.attach(Symbol.prototype, [within]);
}

Object.attach(Function.prototype, [
  function takes (object, flag) {
    return typeof object == this.name.toLowerCase()
      || (/\*/.test(flag) && object instanceof this);
  }
]);

var _each = each;
Object.attach(Array, [
  function _concat (array, rest) {
    return Array.prototype.concat.apply(array, rest);
  },

  function _map (array, rest) {
    return Array.prototype.map.apply(array, rest);
  },

  function _push (array, rest) {
    return Array.prototype.push.apply(array, rest);
  },

  function _slice (array, rest) {
    return Array.prototype.slice.apply(array, rest);
  },

  function concat () {
    var array = Array.shift(arguments);
    return Array._concat(array, arguments);
  },

  function each () {
    var array = Array.shift(arguments);
    return _each.apply(array, arguments);
  },

  function from (object) {
    if (object == null) {
      return [];
    }
    var len = object.length, array = new Array(len);
    for (var i = 0; i < len; i++) {
      array[i] = object[i];
    }
    return array;
  },

  function push () {
    var array = Array.shift(arguments);
    return Array._push(array, arguments);
  },

  function shift (array) {
    return Array.prototype.shift.call(array);
  },

  function slice () {
    var array = Array.shift(arguments);
    return Array._slice(array, arguments);
  },

  function takes (object, flag) {
    return Array.isArray(object)
      || (/\*/.test(flag) && object instanceof this);
  }
]);
Object.attach(Array.prototype, [
  each,
  function extend () {
    Array.each(arguments, function (array) {
      Array._push(this, array);
    }, [], this);
    return this;
  },
  function filter (flags, take, self) {
    if (Function.takes(flags)) {
      self = take;
      take = flags;
      flags = "";
    }
    var len = this.length;
    var flip = /r/.test(flags);
    var result = [];
    for (var i = 0; i < len; i++) {
      var index = flip ? len - i - 1 : i;
      var item = this[index];
      if (take.call(self, item, index, this)) {
        result.push(item);
      }
    }
    return result;
  },
  has,
  function reel (take, self) {
    var i, ret, len = this.length;
    for (i = 0; i < len; i++) {
      ret = take.apply(self, this[i].concat([i, this[i]]));
      if (ret !== undefined) break;
    }
    return ret;
  }
]);

function Class (spawner, ancestor, methods) {
  var prototype, index;
  if (Function.takes(ancestor)) {
    prototype = Object.create(ancestor.prototype);
    index = 3;
  } else {
    methods = ancestor;
    prototype = {};
    index = 2;
  }
  if (!Function.takes(spawner)) {
    methods = spawner;
    spawner = Function();
    index = 1;
  }
  if (methods == null || String.takes(methods[1])) {
    methods = [];
    --index;
  }
  Object.mixin(prototype, "CEW", {
    constructor: spawner
  });
  Object.attach(prototype, "C", methods);
  Array.slice(arguments, index).each(function (list) {
    var source = list.shift().prototype;
    list.each(function (key) {
      if (key.within(prototype)) return;
      var prop = Object.getOwnPropertyDescriptor(source, key);
      prop.configurable = false;
      Object.defineProperty(prototype, key, prop);
    });
  });
  return Object.mixin(spawner, "^CEW", {
    prototype: prototype
  });
}

function Streak (array) {
  var source = {};
  Array.slice(arguments, 1).each(function (object) {
    Object.bake(source, object);
  });
  Object.attach(this, "CW", [
    function concat () {
      var result = Array.from(arguments);
      result = Array._concat(array, result);
      return new Streak(result, source);
    },
    function prepend () {
      var result = Array.concat(arguments, array);
      return new Streak(result, source);
    },
    function raw () {
      return array.slice();
    },
    function slice () {
      var result = Array._slice(array, arguments);
      return new Streak(result, source);
    }
  ]);
  array = Array.from(array);
  Object.mixin(this, "CfW*", array, source);
}
Class(Streak, Array);

function PathArray (filename, absolute) {
  var array, directory;
  if (String.takes(filename)) {
    filename = filename.toString();
    this.absolute = filename[0] == path.sep;
    if ([path.sep, "", "\\"].has(filename)) {
      array = [];
    } else {
      array = filename.split(path.sep);
      if (this.absolute) {
        array.shift();
      }
    }
    this.value = filename;
  } else {
    array = filename;
    this.absolute = Boolean(absolute);
    filename = null;
    Object.defineProperty(this, "value", {
      enumerable: true,
      get: function () {
        if (filename == null) {
          filename = path.join(array, this.absolute);
        }
        return filename;
      }
    });
  }
  Object.mixin(this, "CfW*", array);
  Object.defineProperty(this, "directory", {
    enumerable: true,
    get: function () {
      if (directory == null) {
        directory = fs.existsSync(filename + path.sep);
      }
      return directory;
    }
  });
}
Class(PathArray, Streak, [
  function concat () {
    var array = Array.from(arguments);
    array = Array._concat(this, array);
    return new PathArray(array, this.absolute);
  },
  function prepend () {
    var array = Array.from(this);
    array = Array.from(arguments).concat(array);
    return new PathArray(array, false);
  },
  function raw () {
    return Array.from(this);
  },
  function slice (start) {
    var array = Array._slice(this, arguments);
    if (0 < start || (-this.length < start && start < 0)) {
      return array;
    }
    return new PathArray(array, this.absolute);
  }
]);

Object.assign(path, {
  Array: PathArray,
  sep: "/"
});

var pathCache = {};
Object.attach(path, "^", [
  function isAbsolute (filePath) {
    if (!filePath.within(pathCache)) {
      filePath = path.normalize(filePath);
    }
    return pathCache[filePath];
  },
  function join (array, absolute) {
    if (arguments.length === 0)
      return '.';

    var joined;
    if (String.takes(array)) {
      if (String.takes(absolute)) {
        array = Array.from(arguments);
      } else {
        array = [array];
      }
    } else {
      if (Boolean.takes(array.absolute)) {
        absolute = array.absolute;
      } else if (array.length > 0) {
        var value = array[0].absolute;
        if (Boolean.takes(value)) {
          absolute = value;
        }
      }
    }

    var firstPart, len = array.length;
    for (var i = 0; i < len; i++) {
      var arg = array[i];
      if (arg.length > 0) {
        if (!String.takes(arg)) {
          arg = arg.join(path.sep);
        }
        if (joined === undefined)
          joined = firstPart = arg;
        else
          joined += path.sep + arg;
      }
    }

    if (joined === undefined)
      return '.';

    if (absolute) {
      joined = path.sep + joined;
    }

    // Make sure that the joined path doesn't start with two slashes, because
    // normalize() will mistake it for an UNC path then.
    //
    // This step is skipped when it is very clear that the user actually
    // intended to point at an UNC path. This is assumed when the first
    // non-empty string parts starts with exactly two slashes followed by
    // at least one more non-slash character.
    //
    // Note that for normalize() to treat a path as an UNC path it needs to
    // have at least 2 components, so we don't filter for that here.
    // This means that the user can use join to construct UNC paths from
    // a server name and a share name; for example:
    //   path.join('//server', 'share') -> '\\\\server\\share\\')
    //var firstPart = paths[0];
    var needsReplace = true;
    var slashCount = 0;
    var code = firstPart.charCodeAt(0);
    if (code === 47/*/*/ || code === 92/*\*/) {
      ++slashCount;
      const firstLen = firstPart.length;
      if (firstLen > 1) {
        code = firstPart.charCodeAt(1);
        if (code === 47/*/*/ || code === 92/*\*/) {
          ++slashCount;
          if (firstLen > 2) {
            code = firstPart.charCodeAt(2);
            if (code === 47/*/*/ || code === 92/*\*/)
              ++slashCount;
            else {
              // We matched a UNC path in the first part
              needsReplace = false;
            }
          }
        }
      }
    }
    if (needsReplace) {
      // Find any more consecutive slashes we need to replace
      for (; slashCount < joined.length; ++slashCount) {
        code = joined.charCodeAt(slashCount);
        if (code !== 47/*/*/ && code !== 92/*\*/)
          break;
      }

      // Replace the slashes if needed
      if (slashCount >= 2)
        joined = path.sep + joined.slice(slashCount);
    }

    return joined;
  },
  function normalize (filePath, absolute) {
    filePath = path.join(filePath, absolute);
    const len = filePath.length;
    var isAbsolute = false;
    if (len === 0)
      return save('.');
    var rootEnd = 0;
    var code = filePath.charCodeAt(0);
    var device;

    // Try to match a root
    if (len > 1) {
      if (code === 47/*/*/ || code === 92/*\*/) {
        // Possible UNC root

        // If we started with a separator, we know we at least have an absolute
        // path of some kind (UNC or otherwise)
        isAbsolute = true;

        code = filePath.charCodeAt(1);
        if (code === 47/*/*/ || code === 92/*\*/) {
          // Matched double path separator at beginning
          var j = 2;
          var last = j;
          // Match 1 or more non-path separators
          for (; j < len; ++j) {
            code = filePath.charCodeAt(j);
            if (code === 47/*/*/ || code === 92/*\*/)
              break;
          }
          if (j < len && j !== last) {
            const firstPart = filePath.slice(last, j);
            // Matched!
            last = j;
            // Match 1 or more path separators
            for (; j < len; ++j) {
              code = filePath.charCodeAt(j);
              if (code !== 47/*/*/ && code !== 92/*\*/)
                break;
            }
            if (j < len && j !== last) {
              // Matched!
              last = j;
              // Match 1 or more non-path separators
              for (; j < len; ++j) {
                code = filePath.charCodeAt(j);
                if (code === 47/*/*/ || code === 92/*\*/)
                  break;
              }
              if (j === len) {
                // We matched a UNC root only
                // Return the normalized version of the UNC root since there
                // is nothing left to process

                return save('\\\\' + firstPart + '\\' + filePath.slice(last) + '\\');
              } else if (j !== last) {
                // We matched a UNC root with leftovers

                device = '\\\\' + firstPart + '\\' + filePath.slice(last, j);
                rootEnd = j;
              }
            }
          }
        } else {
          rootEnd = 1;
        }
      } else if ((code >= 65/*A*/ && code <= 90/*Z*/) ||
        (code >= 97/*a*/ && code <= 122/*z*/)) {
        // Possible device root

        code = filePath.charCodeAt(1);
        if (filePath.charCodeAt(1) === 58/*:*/) {
          device = filePath.slice(0, 2);
          rootEnd = 2;
          if (len > 2) {
            code = filePath.charCodeAt(2);
            if (code === 47/*/*/ || code === 92/*\*/) {
              // Treat separator following drive name as an absolute path
              // indicator
              isAbsolute = true;
              rootEnd = 3;
            }
          }
        }
      }
    } else if (code === 47/*/*/ || code === 92/*\*/) {
      // `path` contains just a path separator, exit early to
      // avoid unnecessary work
      return save(path.sep);
    }

    var tail;
    if (rootEnd < len)
      tail = normalizeStringPosix(filePath.slice(rootEnd), !isAbsolute);
    else
      tail = '';
    if (tail.length === 0 && !isAbsolute)
      tail = '.';
    if (device === undefined) {
      if (isAbsolute) {
        if (tail.length > 0)
          return save(path.sep + tail);
        else
          return save(path.sep);
      } else if (tail.length > 0) {
        return save(tail);
      } else {
        return save('');
      }
    } else {
      if (isAbsolute) {
        if (tail.length > 0)
          return save(device + path.sep + tail);
        else
          return save(device + path.sep);
      } else if (tail.length > 0) {
        return save(device + tail);
      } else {
        return save(device);
      }
    }

    function save (filePath) {
      pathCache[filePath] = isAbsolute;
      return filePath;
    }
  },
  function split () {
    var filename = Array.shift(arguments);
    return new PathArray(String._slice(filename, arguments));
  }
]);

/**
 * This function was actually 'normalizeStringWin32', but
 * uses '/' instead of '\' so it's Posix compliant.
 * @param path
 * @param allowAboveRoot
 * @returns {string}
 **/
function normalizeStringPosix (filename, allowAboveRoot) {
  var res = '';
  var lastSlash = -1;
  var dots = 0;
  var code;
  for (var i = 0; i <= filename.length; i++) {
    if (i < filename.length)
      code = filename.charCodeAt(i);
    else if ([47, 92].has(code))
      break;
    else
      code = 47/*/*/;
    if ([47, 92].has(code)) {
      if (lastSlash === i - 1 || dots === 1) {
        // NOOP
      } else if (lastSlash !== i - 1 && dots === 2) {
        if (res.length < 2 ||
          res.charCodeAt(res.length - 1) !== 46/*.*/ ||
          res.charCodeAt(res.length - 2) !== 46/*.*/) {
          if (res.length > 2) {
            const start = res.length - 1;
            var j = start;
            for (; j >= 0; --j) {
              if ([47, 92].has(res.charCodeAt(j)))
                break;
            }
            if (j !== start) {
              if (j === -1)
                res = '';
              else
                res = res.slice(0, j);
              lastSlash = i;
              dots = 0;
              continue;
            }
          } else if (res.length === 2 || res.length === 1) {
            res = '';
            lastSlash = i;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          if (res.length > 0)
            res += path.sep + ".."
          else
            res = '..';
        }
      } else {
        if (res.length > 0)
          res += path.sep + filename.slice(lastSlash + 1, i);
        else
          res = filename.slice(lastSlash + 1, i);
      }
      lastSlash = i;
      dots = 0;
    } else if (code === 46/*.*/ && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}

Object.attach(global, [
  function ValueError (msg) {
    this.message = msg;
  }
]);
Object.attach(global, "^", [
  function attempt (ensue, mend, settle) {
    var result;
    try {
      result = ensue();
    } catch (e) {
      mend && (result = mend(e));
    } finally {
      settle && (result = settle(result));
    }
    return result;
  },
  Streak
]);

module.exports = Class;
