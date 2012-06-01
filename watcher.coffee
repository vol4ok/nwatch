require 'colors'
forever = require("forever")
$ = {}
$ extends require 'path'
$ extends require 'fs'

ROOT = '/Volumes/RAM'
dirs = {}

dirs[$.realpathSync(__dirname)] = $.join(__dirname, 'example.coffee')
console.log dirs

child = forever.start ["ruby", "#{__dirname}/fswatch.rb", ROOT],
  max:    10
  silent: true

child.on "stdout", (data) =>
  data = data.toString().trim()
  try
    path = JSON.parse("[" + data.replace(/\]\[/g, ",").replace(/[\[\]]/g, "") + "]")
    path = $.realpathSync(path.toString())
    console.log path.green
    require(dirs[path])() if dirs[path]
  catch error
    console.error error.toString().red

child.on "stderr", (data) ->
  console.error data.toString()

forever.startServer(child)