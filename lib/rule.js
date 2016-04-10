var
  Class = require("./utils"),
  path = require("path");

function Rule (pattern, flags) {
  if (cache[pattern]) {
    return cache[pattern];
  }

  var rule = cache[pattern] = new String(pattern);
  var inverse = /^!/.test(pattern);
  if (inverse) {
    pattern = pattern.slice(1);
  }
  pattern = surrogates.reduce(function (source, union) {
    var surrogate = union[1];
    if (Function.takes(surrogate)) {
      surrogate = surrogate.bind(pattern);
    }
    return source.replace(union[0], surrogate);
  }, pattern);
  pattern = new RegExp(pattern, flags);
  rule.matchCase = !/i/.test(flags);

  return Object.attach(rule, [
    function test (array, flags) {
      if (!/!/.test(flags) && inverse) return false;
      if (Array.takes(array)) {
        array.unshift(".");
      } else {
        array = array.prepend(".");
      }
      return array.each(
          function (part, i) {
            var filename = path.join(array.slice(i));
            if (pattern.test(filename))
              return true;
          }
        ) || false;
    }
  ]);
}

function concat () {
  var array = Array.from(arguments);
  return function concat () {
    var args = arguments;
    args[-1] = this;
    return array.map(function (item) {
      if (Number.takes(item)) {
        return args[item];
      }
      return item;
    }).join("");
  };
}

function pick (item, pattern, yes, no) {
  return function pick () {
    arguments[-1] = this;
    return pattern.test(arguments[item]) ? yes : no;
  };
}

var _match = 0, _this = -1, cache = {};

var surrogates = [
  [/^\\\!/, "!"],
  [/^\\#/, "#"],
  [/\\?\s+$/, pick(_match, /^\\/, " ", "")],
  [/\\\s/g, " "],
  [/[\\\^$.|?*+()\[{]/g, concat("\\", _match)],
  [/^\//, "^"],
  [/\//g, "\\/"],
  [/^\^*\\\*\\\*\\\//, "(?:.*\\/)?"],
  [/(?:[^*\/])$/, concat(_match, "(?=$|\\/)")],
  [/^(?=[^\^])/, pick(_this, /\/(?!$)/, "^", "(?:^|\\/)")],
  [/\\\/\\\*\\\*\\\//g, "(?:\\/[^\\/]+)*\\/"],
  [/(^|[^\\]+)\\\*(?=.+)/g, concat(1, "[^\\/]*")],
  [/\\\*$/, ""],
  [/\\\\\\/g, "\\"]
];

module.exports = Object.attach(Rule, [
  function Tree () {
    var root = [];
    Object.assign(this, {
      for: function (array, take, self) {
        if (!array.directory) {
          array = array.slice(0, -1);
        }
        var chunk = [], node = root, ret;
        if (next(0) !== undefined) {
          return ret;
        }
        return array.each(function (part, i) {
          if (!part.within(node)) {
            node[part] = [];
          }
          node = node[part];
          chunk.push(part);
          return next(i + 1);
        });
        function next (index) {
          var rules = node.rules;
          if (rules) {
            return ret = work();
          }
          rules = Object.bake([], {absent: true});
          ret = work();
          node.rules = new Streak(rules, {absent: false});
          return ret;

          function work () {
            return take.call(self, bake(chunk), rules, index);
          }
        }
      }
    });
  }
]);

function bake (array) {
  return new path.Array(array);
}
