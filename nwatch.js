// Generated by CoffeeScript 1.3.3
var $, cmd, hook, hookio, server, usage,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

require('colors');

$ = {};

__extends($, require('path'));

__extends($, require('fs'));

__extends($, require('util'));

hookio = require('hook.io');

usage = function() {
  return console.log('Usage: nwatch [add|rm|ls|server]');
};

server = function(root) {
  var child, dirs, forever, hook,
    _this = this;
  forever = require("forever");
  hook = hookio.createHook({
    name: 'server',
    silent: true
  });
  root = $.realpathSync(root);
  dirs = {};
  child = forever.start(["ruby", "" + __dirname + "/fswatch.rb", root], {
    max: 10,
    silent: true
  });
  child.on("stdout", function(data) {
    var path, paths, _i, _len, _results;
    data = data.toString().trim();
    try {
      paths = JSON.parse("[" + data.replace(/\]\[/g, ",").replace(/[\[\]]/g, "") + "]");
      _results = [];
      for (_i = 0, _len = paths.length; _i < _len; _i++) {
        path = paths[_i];
        path = $.realpathSync(path.toString());
        console.log(path.green);
        if (dirs[path]) {
          _results.push(require(dirs[path])());
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    } catch (error) {
      return console.error(error.toString().red);
    }
  });
  child.on("stderr", function(data) {
    return console.error(data.toString());
  });
  hook.on('*::add', function(data) {
    console.log(("" + this.event + " (" + ($.inspect(data, false, null, true)) + ")").cyan);
    __extends(dirs, data);
    return hook.emit('print', dirs);
  });
  hook.on('*::rm', function(data) {
    console.log(("" + this.event + " (" + data.green + ")").cyan);
    delete dirs[data];
    return hook.emit('print', dirs);
  });
  hook.on('*::ls', function() {
    console.log(("" + this.event).cyan);
    return hook.emit('print', dirs);
  });
  forever.startServer(child);
  return hook.start();
};

cmd = process.argv[2];

if (cmd === 'server') {
  if (process.argv < 4) {
    usage();
  } else {
    server(process.argv[3]);
  }
} else if (cmd) {
  hook = hookio.createHook({
    name: 'client',
    silent: true
  });
  hook.on('hook::ready', function() {
    var arg1, arg2, obj;
    switch (cmd) {
      case 'add':
        if (process.argv < 5) {
          return usage();
        } else {
          arg1 = $.realpathSync(process.argv[3]);
          arg2 = $.realpathSync(process.argv[4]);
          obj = {};
          obj[arg1] = arg2;
          return hook.emit('add', obj);
        }
        break;
      case 'rm':
        if (process.argv < 4) {
          return usage();
        } else {
          arg1 = $.realpathSync(process.argv[3]);
          return hook.emit('rm', arg1);
        }
        break;
      case 'ls':
        return hook.emit('ls');
      default:
        usage();
        return process.exit(0);
    }
  });
  hook.on('*::print', function(data) {
    var k, v;
    console.log('\nWatch list:'.cyan);
    for (k in data) {
      v = data[k];
      if (k === 'prototype') {
        continue;
      }
      console.log(" * " + k.green + ": " + v.magenta);
    }
    console.log("");
    return hook.stop(function() {
      return process.exit(0);
    });
  });
  hook.start();
} else {
  usage();
}