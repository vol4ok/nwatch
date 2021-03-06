// Generated by CoffeeScript 1.3.3

/*!
 * Copyright (c) 2012 Andrew Volkov <hello@vol4ok.net>
*/


(function() {
  var $, AddDirCmd, AddRootCmd, Client, ListDirsCmd, ListRootsCmd, RemoveDirCmd, RemoveRootCmd, RestartServerCmd, Server, StopServerCmd, Watcher, argv, exec, forever, safePath, usage,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  require('colors');

  forever = require("forever");

  exec = require('child_process').exec;

  $ = require('core.js');

  __extends($, require('fs'));

  __extends($, require('path'));

  Watcher = (function() {

    function Watcher(options) {
      this.on_stdout = __bind(this.on_stdout, this);
      this.root = options.root, this.onChange = options.onChange, this.onError = options.onError;
      this.watcher = forever.start(["ruby", "" + __dirname + "/fswatch.rb", this.root], {
        max: 10,
        silent: true
      });
      this.watcher.on("stdout", this.on_stdout);
      this.watcher.on("stderr", this.on_stderr);
    }

    Watcher.prototype.release = function() {
      return this.watcher.stop();
    };

    Watcher.prototype.on_stdout = function(data) {
      var path, paths, _i, _len, _results;
      data = data.toString().trim();
      try {
        paths = JSON.parse("[" + data.replace(/\]\[/g, ",").replace(/[\[\]]/g, "") + "]");
        _results = [];
        for (_i = 0, _len = paths.length; _i < _len; _i++) {
          path = paths[_i];
          path = $.realpathSync(path.toString());
          _results.push((function() {
            var _results1;
            _results1 = [];
            while (path !== '/') {
              this.onChange(path, this.root);
              if (path === this.root) {
                break;
              }
              _results1.push(path = $.dirname(path));
            }
            return _results1;
          }).call(this));
        }
        return _results;
      } catch (error) {
        return this.onError(error);
      }
    };

    Watcher.prototype.on_stderr = function(error) {
      return this.onError(error);
    };

    return Watcher;

  })();

  Server = (function() {

    function Server() {
      this.on_srvRestart = __bind(this.on_srvRestart, this);

      this.on_srvStop = __bind(this.on_srvStop, this);

      this.on_dirLs = __bind(this.on_dirLs, this);

      this.on_dirRm = __bind(this.on_dirRm, this);

      this.on_dirAdd = __bind(this.on_dirAdd, this);

      this.on_execComplete = __bind(this.on_execComplete, this);

      this.on_dirChange = __bind(this.on_dirChange, this);

      this.on_rootLs = __bind(this.on_rootLs, this);

      this.on_rootRm = __bind(this.on_rootRm, this);

      this.on_rootAdd = __bind(this.on_rootAdd, this);
      this.start();
      this.verbose = true;
    }

    Server.prototype.start = function() {
      this.roots = {};
      this.dirs = {};
      this.server = require('hook.io').createHook({
        name: 'server',
        silent: true
      });
      this.server.on('*::root::add', this.on_rootAdd);
      this.server.on('*::root::rm', this.on_rootRm);
      this.server.on('*::root::ls', this.on_rootLs);
      this.server.on('*::dir::add', this.on_dirAdd);
      this.server.on('*::dir::rm', this.on_dirRm);
      this.server.on('*::dir::ls', this.on_dirLs);
      this.server.on('*::srv::stop', this.on_srvStop);
      this.server.on('*::srv::restart', this.on_srvRestart);
      this.server.start();
      return console.log(this._time(), 'server started'.green);
    };

    Server.prototype.release = function() {
      var k, v, _ref;
      console.log(this._time(), 'stop server'.red);
      this.server.stop();
      this.server = void 0;
      _ref = this.roots;
      for (k in _ref) {
        v = _ref[k];
        this.removeWatcher(v.watcher);
        delete this.roots[k];
      }
      delete this.dirs;
      return delete this.roots;
    };

    Server.prototype.createWatcher = function(root) {
      return new Watcher({
        root: root,
        onChange: this.on_dirChange,
        onError: this.on_dirError
      });
    };

    Server.prototype.removeWatcher = function(watcher) {
      return watcher.release();
    };

    Server.prototype._count = function(obj) {
      var i, k;
      i = 0;
      for (k in obj) {
        i++;
      }
      return '' + i;
    };

    Server.prototype._time = function() {
      var now, r;
      now = new Date;
      r = "[";
      r += ('0' + now.getHours()).slice(-2) + ":";
      r += ('0' + now.getMinutes()).slice(-2) + ":";
      r += ('0' + now.getSeconds()).slice(-2) + ".";
      r += ('00' + now.getMilliseconds()).slice(-3);
      r += "]";
      return r.magenta;
    };

    Server.prototype.on_rootAdd = function(root, callback) {
      var k, oldRoot, watcher;
      oldRoot = false;
      for (k in this.roots) {
        if (root === k || $.startsWith(root, k)) {
          return callback(1, 'This directory already in root'.yellow);
        }
        if ($.startsWith(k, root)) {
          this.removeWatcher(this.roots[k].watcher);
          delete this.roots[k];
          oldRoot = k;
        }
      }
      watcher = this.createWatcher(root);
      this.roots[root] = {
        root: root,
        watcher: watcher
      };
      if (oldRoot) {
        console.log(this._time(), 'update root'.cyan, oldRoot.grey, '->'.cyan, root.grey);
        return callback(null, "Watch root ".cyan + oldRoot.grey + " -> ".cyan + root.grey + " updated!\nWatch root count: ".cyan + this._count(this.roots).magenta);
      } else {
        console.log(this._time(), 'add root'.green, root.grey);
        return callback(null, "Watch root ".green + root.grey + " successfully added!\nWatch root count: ".green + this._count(this.roots).magenta);
      }
    };

    Server.prototype.on_rootRm = function(root, callback) {
      console.log("=> on_rootRm".cyan);
      if (!this.roots[root]) {
        return callback(2, 'Watch root not found');
      }
      this.removeWatcher(this.roots[root].watcher);
      delete this.roots[root];
      return callback(null, "Watch root successfully removed!");
    };

    Server.prototype.on_rootLs = function(arg, callback) {
      var k, list;
      list = [];
      for (k in this.roots) {
        list.push(k);
      }
      return callback(null, list);
    };

    Server.prototype.on_dirChange = function(path, root) {
      if (!this.dirs[path]) {
        return;
      }
      console.log(this._time(), "exec".green, $.join($.relative(root, path), 'Watchfile').grey);
      return exec("$SHELL ./Watchfile", {
        cwd: path
      }, this.on_execComplete);
    };

    Server.prototype.on_execComplete = function(err, stdout, stderr) {
      if (err) {
        return console.error(stderr.trim().red);
      } else {
        if (this.verbose) {
          return console.log(stdout.trim());
        }
      }
    };

    Server.prototype.on_dirError = function(err) {
      return console.error(err.red);
    };

    Server.prototype.on_dirAdd = function(dir, callback) {
      if (this.dirs[dir] != null) {
        return callback(1, 'This directory already exists'.yellow);
      }
      this.dirs[dir] = dir;
      console.log(this._time(), 'add dir'.green, dir.grey);
      return callback(null, "Watchfile dir ".green + dir.grey + " successfully added!\nWatchfile dir count: ".green + this._count(this.dirs).magenta);
    };

    Server.prototype.on_dirRm = function(dir, callback) {
      if (!this.dirs[dir]) {
        return callback(2, "Directory ".red + dir.grey + " not found".red);
      }
      this["delete"](this.dirs[dir]);
      return callback(null, "Directory ".magenta + dir.grey + " removed from watch!".magenta);
    };

    Server.prototype.on_dirLs = function(arg, callback) {
      var k, list;
      list = [];
      for (k in this.dirs) {
        list.push(k);
      }
      return callback(null, list);
    };

    Server.prototype.on_srvStop = function() {
      this.release();
      return process.exit(0);
    };

    Server.prototype.on_srvRestart = function() {
      this.release();
      return this.start();
    };

    return Server;

  })();

  Client = (function() {

    Client.prototype.uid = 0;

    function Client() {
      this.on_complete = __bind(this.on_complete, this);

      this.on_ready = __bind(this.on_ready, this);
      this.client = require('hook.io').createHook({
        name: "client-" + (this.uid++),
        silent: true
      });
      this.client.on('hook::ready', this.on_ready);
      this.client.start();
    }

    Client.prototype.release = function(err) {
      if (err == null) {
        err = 0;
      }
      this.client.stop();
      return process.exit(err);
    };

    Client.prototype.on_ready = function() {};

    Client.prototype.on_complete = function(err, msg) {
      if (err === 1) {
        console.warn(msg);
      } else if (err === 2) {
        console.error(msg);
      } else {
        console.log(msg);
      }
      return this.release();
    };

    return Client;

  })();

  AddDirCmd = (function(_super) {

    __extends(AddDirCmd, _super);

    function AddDirCmd(dir) {
      this.dir = dir;
      this.on_ready = __bind(this.on_ready, this);

      AddDirCmd.__super__.constructor.call(this);
    }

    AddDirCmd.prototype.on_ready = function() {
      return this.client.emit('dir::add', this.dir, this.on_complete);
    };

    return AddDirCmd;

  })(Client);

  RemoveDirCmd = (function(_super) {

    __extends(RemoveDirCmd, _super);

    function RemoveDirCmd(dir) {
      this.dir = dir;
      this.on_ready = __bind(this.on_ready, this);

      RemoveDirCmd.__super__.constructor.call(this);
    }

    RemoveDirCmd.prototype.on_ready = function() {
      return this.client.emit('dir::rm', this.dir, this.on_complete);
    };

    return RemoveDirCmd;

  })(Client);

  ListDirsCmd = (function(_super) {

    __extends(ListDirsCmd, _super);

    function ListDirsCmd() {
      this.on_complete = __bind(this.on_complete, this);

      this.on_ready = __bind(this.on_ready, this);
      ListDirsCmd.__super__.constructor.call(this);
    }

    ListDirsCmd.prototype.on_ready = function() {
      return this.client.emit('dir::ls', null, this.on_complete);
    };

    ListDirsCmd.prototype.on_complete = function(err, dirs) {
      var dir, i, _i, _len;
      if (dirs.length > 0) {
        console.log('Watchfile dirs:'.green);
        for (i = _i = 0, _len = dirs.length; _i < _len; i = ++_i) {
          dir = dirs[i];
          console.log(("" + (i + 1) + ". ").cyan, dir.magenta);
        }
      } else {
        console.log('No watchfile dirs'.yellow);
      }
      return this.release();
    };

    return ListDirsCmd;

  })(Client);

  AddRootCmd = (function(_super) {

    __extends(AddRootCmd, _super);

    function AddRootCmd(dir) {
      this.dir = dir;
      this.on_ready = __bind(this.on_ready, this);

      AddRootCmd.__super__.constructor.call(this);
    }

    AddRootCmd.prototype.on_ready = function() {
      return this.client.emit('root::add', this.dir, this.on_complete);
    };

    return AddRootCmd;

  })(Client);

  RemoveRootCmd = (function(_super) {

    __extends(RemoveRootCmd, _super);

    function RemoveRootCmd(dir) {
      this.dir = dir;
      this.on_ready = __bind(this.on_ready, this);

      RemoveRootCmd.__super__.constructor.call(this);
    }

    RemoveRootCmd.prototype.on_ready = function() {
      return this.client.emit('root::rm', this.dir, this.on_complete);
    };

    return RemoveRootCmd;

  })(Client);

  ListRootsCmd = (function(_super) {

    __extends(ListRootsCmd, _super);

    function ListRootsCmd() {
      this.on_complete = __bind(this.on_complete, this);

      this.on_ready = __bind(this.on_ready, this);
      ListRootsCmd.__super__.constructor.call(this);
    }

    ListRootsCmd.prototype.on_ready = function() {
      return this.client.emit('root::ls', null, this.on_complete);
    };

    ListRootsCmd.prototype.on_complete = function(err, dirs) {
      var dir, i, _i, _len;
      if (dirs.length > 0) {
        console.log('Root dirs:'.green);
        for (i = _i = 0, _len = dirs.length; _i < _len; i = ++_i) {
          dir = dirs[i];
          console.log(("" + (i + 1) + ".").cyan, dir.magenta);
        }
      } else {
        console.log('No root dirs'.yellow);
      }
      return this.release();
    };

    return ListRootsCmd;

  })(Client);

  StopServerCmd = (function(_super) {

    __extends(StopServerCmd, _super);

    function StopServerCmd() {
      this.on_ready = __bind(this.on_ready, this);
      StopServerCmd.__super__.constructor.call(this);
    }

    StopServerCmd.prototype.on_ready = function() {
      this.client.emit('srv::stop');
      return this.release();
    };

    return StopServerCmd;

  })(Client);

  RestartServerCmd = (function(_super) {

    __extends(RestartServerCmd, _super);

    function RestartServerCmd() {
      this.on_ready = __bind(this.on_ready, this);
      RestartServerCmd.__super__.constructor.call(this);
    }

    RestartServerCmd.prototype.on_ready = function() {
      this.client.emit('srv::restart');
      return this.release();
    };

    return RestartServerCmd;

  })(Client);

  usage = function() {
    console.log("Usage:");
    console.log("  nwatch ".cyan + "server".green + " — starts server");
    console.log("  nwatch ".cyan + "server stop".green + " — stop server");
    console.log("  nwatch ".cyan + "server restart".green + " — restart server");
    console.log("  nwatch ".cyan + "[DIR]".grey + " — add watchfile directory");
    console.log("  nwatch ".cyan + "(remove|rm)".green + " <DIR>".magenta + " — remove watchfile directory");
    console.log("  nwatch ".cyan + "(list|ls)".green + " — list watch directories");
    console.log("  nwatch ".cyan + "root".green + " [DIR]".grey + " — add watch root");
    console.log("  nwatch ".cyan + "root (remove|rm)".green + " <DIR>".magenta + " — remove watch root");
    return console.log("  nwatch ".cyan + "root (list|ls)".green + " — list all watch roots");
  };

  safePath = function(path) {
    try {
      return $.realpathSync(path != null ? path : '.');
    } catch (e) {
      if ($.isString(path)) {
        console.error('Invalid path!'.red);
        console.log('Type `nwatch ?` for help.'.grey);
      }
      return process.exit(1);
    }
  };

  argv = process.argv.slice(2);

  switch (argv[0]) {
    case 'root':
      switch (argv[1]) {
        case 'add':
        case 'a':
        case '+':
          new AddRootCmd(safePath(argv[2]));
          break;
        case 'remove':
        case 'rm':
        case 'r':
        case '-':
          new RemoveRootCmd(safePath(argv[2]));
          break;
        case 'list':
        case 'ls':
        case 'l':
          new ListRootsCmd();
          break;
        default:
          new AddRootCmd(safePath(argv[1]));
      }
      break;
    case 'server':
      switch (argv[1]) {
        case 'start':
          new Server();
          break;
        case 'restart':
          new RestartServerCmd();
          break;
        case 'stop':
          new StopServerCmd();
          break;
        default:
          new Server();
      }
      break;
    case 'watch':
      switch (argv[1]) {
        case 'add':
        case 'a':
        case '+':
          new AddDirCmd(safePath(argv[2]));
          break;
        case 'remove':
        case 'rm':
        case 'r':
        case '-':
          new RemoveDirCmd(safePath(argv[2]));
          break;
        case 'list':
        case 'ls':
        case 'l':
          new ListDirsCmd();
          break;
        default:
          new AddRootCmd(safePath(argv[1]));
      }
      break;
    case 'stop':
      new StopServerCmd();
      break;
    case 'restart':
      new RestartServerCmd();
      break;
    case 'add':
    case 'a':
    case '+':
      new AddDirCmd(safePath(argv[1]));
      break;
    case 'remove':
    case 'rm':
    case 'r':
    case '-':
      new RemoveDirCmd(safePath(argv[1]));
      break;
    case 'list':
    case 'ls':
    case 'l':
      new ListDirsCmd();
      break;
    case 'h':
    case '-h':
    case 'help':
    case '--help':
      usage();
      break;
    default:
      new AddDirCmd(safePath(argv[0]));
  }

}).call(this);
