var
  fs = require("fs"),
  path = require("path"),

  Rule = require("./rule");

function Gitkeeper (options) {
  var filenames = options.filenames;
  if (!Array.takes(filenames, "*")) {
    if (String.takes(options)) {
      options = {filenames: Array.from(arguments)};
    } else {
      throw new ValueError("'filenames' must be an array");
    }
  } else if (filenames.length <= 0) {
    throw new ValueError("'filenames' must have at least one item");
  }
  options = Object.assign({
    basePath: process.cwd(),
    matchCase: false,
    subPatterns: [],
    topPatterns: []
  }, options);

  var ruleFlags = options.matchCase ? "" : "i";

  var basePath, cache = {}, subRules = [], topRules = [];
  var dirRules = new Rule.Tree();
  [
    [options.subPatterns, subRules],
    [options.topPatterns, topRules]
  ].reel(
    function (patterns, rules) {
      getRules(patterns, rules);
    });

  Object.defineProperty(this, "basePath", {
    enumerable: true,
    get: function () {
      return basePath;
    },
    set: function (value) {
      basePath = path.normalize(value);
      if (!path.isAbsolute(basePath)) {
        basePath = path.normalize([process.cwd(), basePath]);
      }
      basePath += path.sep;
    }
  });

  this.basePath = options.basePath;

  Object.attach(this, [
    function add (patterns, flags) {
      if (String.takes(patterns)) {
        patterns = [patterns];
      }
      if (/!/.test(flags)) {
        getRules(patterns, topRules);
      } else {
        getRules(patterns, subRules);
      }
      return this;
    },

    function bans (filename, flags) {
      filename = path.normalize(filename);
      var ret = cache[filename], index = 0;
      if (Boolean.takes(ret)) {
        return ret;
      }

      ret = basePath.length;
      if (!path.isAbsolute(filename)) {
        var fullPath = path.normalize([basePath, filename]);
        if (fullPath.indexOf(basePath) != 0) {
          filename = fullPath;
          ret = 0;
        }
      } else if (filename.indexOf(basePath) == 0) {
        index = ret;
      } else {
        ret = 0;
      }
      var base = basePath.slice(0, ret);
      var store = ret != 0;
      var array = path.split(filename, index);

      ret = false;
      if (!/s/.test(flags)) {
        test(array, subRules);
      }

      recurse(array, function (chunk, rules, i) {
        if (rules.absent) {
          loadPatternFiles([base, chunk], rules);
        }
        test(array.slice(i), rules);
      });

      if (!/t/.test(flags)) {
        test(array, topRules);
      }

      if (store) {
        cache[filename] = ret;
      }

      return ret;

      function test (parts, rules) {
        if (ret)
          ret = !rules.some(function (rule) {
            return rule.test(parts, "!");
          });
        else
          ret = rules.some(function (rule) {
            return rule.test(parts);
          });
      }
    }
  ]);

  function recurse (parts, take, self) {
    dirRules.for(parts, take, self);
  }

  function loadPatternFiles (dirname, rules) {
    dirname = path.join(dirname);
    filenames.each(function (basename) {
      loadPatterns([dirname, basename], rules);
    });
    return rules;
  }

  function loadPatterns (filename, rules) {
    filename = path.join(filename);
    if (!fs.existsSync(filename)) return rules;
    var text = fs.readFileSync(filename, "utf-8");
    return getRules(text.lines, rules);
  }

  function getRules (patterns, rules) {
    patterns.each(function (pattern) {
      if (/^(#|(\s*$))/.test(pattern)) return;
      rules.push(new Rule(pattern, ruleFlags));
    });
    return rules;
  }
}

module.exports = Gitkeeper;
