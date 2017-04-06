/*
 * This file is part of the xPack distribution
 *   (http://xpack.github.io).
 * Copyright (c) 2017 Liviu Ionescu.
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom
 * the Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 */

'use strict'
/* eslint valid-jsdoc: "error" */

// ----------------------------------------------------------------------------

/*
 * This file implements the CLI specific code. It prepares a context
 * and calls the module code.
 */

// ----------------------------------------------------------------------------

const assert = require('assert')
const path = require('path')
const fs = require('fs')

// Warning: log is not reentrant, do not use it in server configurations.
const log = require('npmlog')

const vm = require('vm')
const repl = require('repl')

const os = require('os')
const util = require('util')

const asy = require('./asy.js')

// ES6: `import { WscriptAvoider} from 'wscript-avoider'
const WscriptAvoider = require('wscript-avoider').WscriptAvoider

// ES6: `import { CliOptions } from './utils/cli-options.js'
const CliOptions = require('./cli-options.js').CliOptions

// ----------------------------------------------------------------------------

// Local promisified functions from the Node.js callbacks library.
const readFile = asy.promisify(fs.readFile)

// ----------------------------------------------------------------------------
// Logger
// Use the npm logger, although it is not reentrant.

// https://github.com/npm/npmlog
// Log levels
// log.addLevel('silly', -Infinity, { inverse: true }, 'sill')
// log.addLevel('verbose', 1000, { fg: 'blue', bg: 'black' }, 'verb')
// log.addLevel('info', 2000, { fg: 'green' })
// log.addLevel('http', 3000, { fg: 'green', bg: 'black' })
// log.addLevel('warn', 4000, { fg: 'black', bg: 'yellow' }, 'WARN')
// log.addLevel('error', 5000, { fg: 'red', bg: 'black' }, 'ERR!')
// log.addLevel('silent', Infinity)

// To configure the logger, use same options as npm.
// https://docs.npmjs.com/misc/config
// `-s`, `--silent`: `--loglevel silent`
// `-q`, `--quiet`: `--loglevel warn`
// `-d`: `--loglevel info`
// `-dd`, `--verbose`: `--loglevel verbose`
// `-ddd`: `--loglevel silly`
// `--color true/false`

// ============================================================================

/**
 * Base class for a CLI application.
 */
// export
class CliApp {
  // --------------------------------------------------------------------------

  /**
   * @summary Application start().
   *
   * @returns {undefined} Does not return, it calls exit().
   *
   * Start the CLI application, either in single shot
   * mode or interactive. (similar to _start() in POSIX)
   *
   * Called by the executable script in the bin folder.
   * Not much functionality here, just a wrapper to catch
   * global exceptions and call the CLI start.
   */
  static async start () {
    const Self = this
    let code = 0
    try {
      // Redirect to parent code. After some common inits,
      // it'll call main(). Async, no need to await.
      Self.doStart()
      // Pass through. Do not exit, to allow REPL to run.
    } catch (err) {
      if (err.name === 'Error') {
        // User triggered error. Treat it gently.
        console.error('Error: ' + err.message)
      } else {
        // System error, probably due to a bug.
        // Show the full stack trace.
        console.error(err.stack)
      }
      // Extension: if the `exitCode` property is added to error,
      // it is used as process exit code.
      code = (err.exitCode !== undefined) ? err.exitCode : 1
      process.exit(code)
    }
  }

  /**
   * @summary Implementation of a CLI starter.
   *
   * @returns {undefined} Nothing.
   *
   * @description
   * As for any CLI application, the main input comes from the
   * command line options, available in Node.js as the
   * `process.argv` array of strings.
   *
   * One important aspect that must not be ignored, is how to
   * differentiate when called from scripts with different names.
   *
   * `process.argv0`
   * On POSIX, it is 'node' (uninteresting).
   * On Windows, it is the node full path (uninteresting as well).
   *
   * `process.argv[0]` is the node full path.
   * On macOS it looks like `/usr/local/bin/node`.
   * On Ubuntu it looks like `/usr/bin/nodejs`
   * On Windows it looks like `C:\Program Files\nodejs\node.exe`.
   *
   * `process.argv[1]` is the full path of the invoking script.
   * On macOS it is either `/usr/local/bin/xsvd` or `.../bin/xsvd.js`.
   * On Ubuntu it is either `/usr/bin/xsvd` or `.../bin/xsvd.js`.
   * On Windows, it is a path inside the `AppData` folder
   * like `C:\Users\ilg\AppData\Roaming\npm\node_modules\xsvd\bin\xsvd.js`
   *
   * To call a program with different names, create multiple
   * executable scripts in the `bin` folder and by processing
   * `argv[1]` it is possible to differentiate between them.
   *
   * The communication with the actual CLI implementation is done via
   * the context object, which includes a console, a configuration
   * object and a few more properties.
   */
  static async doStart () {
    // To differentiate between multiple invocations with different
    // names, extract the name from the last path element; ignore
    // extensions, if any.
    const pgmName = path.basename(process.argv[1]).split('.')[0]

    // Avoid running on WScript. The journey may abruptly end here.
    WscriptAvoider.quitIfWscript(pgmName)

    // ------------------------------------------------------------------------

    // Save the current class to be captured in the callbacks.
    const Self = this

    // Set the application name, to make `ps` output more readable.
    process.title = pgmName

    // Early pause; will be resumed after config is known,
    // and the log level was set.
    log.pause()

    // Dark colours on black background are very hard to see on white
    // screens, like macOS. Remove the background.
    if (os.platform() === 'darwin') {
      Self.fixLogColours(log)
    }

    // These are early messages, not shown immediately,
    // are delayed until the log level is known.
    log.info('it worked if it ends with', 'ok')
    log.silly('but you must be crazy!')
    log.info(`argv0: ${process.argv[1]}`)

    // Initialise the application, including commands and options.
    const context = Self.initialiseContext(null, pgmName, console, log, null)

    const config = context.config

    // Parse the common options, for example the log level.
    CliOptions.parseCommonOptions(process.argv, config)

    log.level = config.logLevel
    log.resume()

    process.argv.forEach((val, index) => {
      log.verbose(`${index}: '${val}'`)
    })

    log.verbose(util.inspect(config))

    /**
     * @summary Callback used by REPL.
     *
     * @param {Object} err Reference to error triggered inside REPL.
     * @returns {undefined} Nothing.
     *
     * @description
     * This is tricky and took some time to find a workaround to avoid
     * displaying the stack trace on error.
     */
    const errorCallback = function errorCallback (err) {
      // if (!(err instanceof SyntaxError)) {
      // System errors deserve their stack trace.
      if (!(err instanceof EvalError) && !(err instanceof SyntaxError) && !(err instanceof RangeError) && !(err instanceof ReferenceError) && !(err instanceof TypeError) && !(err instanceof URIError)) {
        // For regular errors it makes no sense to display the stack trace.
        err.stack = null
        // The error message will be displayed shortly, in the next handler,
        // registered by the REPL server.
      }
    }

    /**
     * @summary REPL callback.
     *
     * @callback replCallback
     * @param {number} responseCode or null
     * @param {string} [responseMessage] If present, the string will be displayed.
     */

    /**
     * @summary Callback used by REPL when a line is entered.
     *
     * @param {string} cmdLine The entire line, unparsed.
     * @param {Object} context Reference to a context.
     * @param {string} filename The name of the file.
     * @param {replCallback} callback Called on completion or error.
     * @returns {undefined} Nothing
     *
     * @description
     * The closure captures `log`, `cmdName` and `config`.
     */
    const replEvaluatorCallback = async function (cmdLine, context, filename, callback) {
      // REPL always sets the console to point to its input/output.
      // Be sure it is so.
      assert(context.console !== undefined)

      let app = null

      // It is mandatory to catch errors, this is an old style callback.
      try {
        // Fill in the given context, created by the REPL interpreter.
        Self.initialiseContext(context, pgmName, null, log, config)

        // Definitely an interactive session.
        context.config.isInteractive = true

        Self.setInvokedFromCli(config)

        app = new Self(context)

        // Split command line and remove any number of spaces.
        const args = cmdLine.trim().split(/\s+/)

        // To visually check if the options were split correctly.
        args.forEach((val, index) => {
          context.log.verbose(`${index}: '${val}'`)
        })

        await app.main(args)

        app = null // Pale attempt to help the GC.

        // Success, but do not return any value, since REPL thinks it
        // is a string that we want to be displayed.
        callback(null)
      } catch (reason) {
        app = null
        // Failure, will display `Error: ${reason.message}`.
        callback(reason)
      }
    }

    const serverPort = config.interactiveServerPort
    if (serverPort == null) {
      if (!config.isInteractive) {
        // Non interactive means single shot (batch mode);
        // execute the command received on the command line
        // and quit. This is the most common usage.

        config.invokedFromCli = true
        // App instances exist only within a given context.
        let app = new Self(context)

        const code = await app.main(process.argv.slice(2))

        app = null
        process.exit(code)
      } else {
        // Interractive mode. Use the REPL (Read-Eval-Print-Loop)
        // to get a shell like prompt to enter sequences of commands.

        const domain = require('domain').create()
        domain.on('error', errorCallback)

        repl.start(
          {
            prompt: pgmName + '> ',
            eval: replEvaluatorCallback,
            completer: Self.replCompleter,
            domain: domain
          }).on('exit', () => {
            console.log('Done.')
            process.exit(0)
          })
        // Pass through...
      }
    } else {
      // --------------------------------------------------------------------
      // Useful during development, to test if everything goes to the
      // correct stream.

      const net = require('net')

      console.log(`Listening on localhost:${serverPort}...`)

      const domainSock = require('domain').create()
      domainSock.on('error', errorCallback)

      net.createServer((socket) => {
        console.log(`Connection opened from ${socket.address().address}.`)

        repl.start({
          prompt: pgmName + '> ',
          input: socket,
          output: socket,
          eval: replEvaluatorCallback,
          completer: Self.replCompleter,
          domain: domainSock
        }).on('exit', () => {
          console.log('Connection closed.')
          socket.end()
        })
      }).listen(serverPort)
      // Pass through...
    }
    // Be sure no exit() is called here, since it'll close the
    // process and prevent interactive usage.
  }

  /**
   * @summary Default initialiser for the class object. Kind of a static constructor.
   *
   * @returns {undefined}.
   *
   * @description
   * Must override it in the derived implementation.
   */
  static initialise () {
    assert(false, 'Must override in derived implementation!')
  }

  /**
   * @summary Default initialiser for the configuration options.
   *
   * @param {object} config The configuration object.
   * @returns {undefined}
   *
   * @description
   * To be useful, override it in the derived implementation.
   */
  static initialiseConfiguration (config) {
    config.isInteractive = false
    config.interactiveServerPort = null
  }

  /**
   * @summary Initialise a minimal context object.
   *
   * @param {Object} ctx Reference to a context, or null to create an empty context.
   * @param {string} pgmName The invocation name of the program.
   * @param {Object} console_ Reference to a node console.
   * @param {Object} log_ Reference to a npm log instance.
   * @param {Object} config Reference to a configuration.
   * @returns {Object} Reference to context.
   */
  static initialiseContext (ctx, pgmName, console_ = null, log_ = null, config = null) {
    // Make uppercase explicit, to know it is a static method.
    const Self = this

    // Call the application initialisation callback, to prepare
    // the structure needed to manage the commands and option.
    if (!Self.isInitialised) {
      Self.initialise()

      Self.isInitialised = true
    }

    // Use the given context, or create an empty one.
    const context = ctx || vm.createContext()

    // REPL should always set the console, be careful not to
    // overwrite it.
    if (!context.console) {
      // Cannot use || because REPL context has only a getter.
      context.console = console_ || console
    }

    context.pgmName = pgmName

    context.log = log_ || log
    // console.log(log)

    context.config = config || {}
    Self.initialiseConfiguration(context.config)

    // Default log level: warn
    context.config.logLevel = context.config.logLevel || 'warn'

    context.cmdPath = process.argv[1]
    context.cwd = process.cwd()
    context.env = process.env
    context.argv = process.argv

    return context
  }

  /**
   * @summary Fix log colours.
   *
   * @param {Object} log Reference to a npm log instance.
   * @returns {undefined} Nothing.
   *
   * @description
   * A small kludge to fix the ugly black backrounds
   * when running on a white screen, like macOS.
   */
  static fixLogColours (log) {
    for (let key in log.style) {
      if (log.style[key]) {
        // Basically remove the background property.
        delete log.style[key].bg
      }
    }
  }

  static async readPackageJson () {
    const fileContent = await readFile(path.join(__dirname, '../../package.json'))
    return JSON.parse(fileContent.toString())
  }

  /**
   * @summary A REPL completer.
   *
   * @param {string} linePartial The incomplete line.
   * @param {nodeCallback} callback Called on completion or error.
   * @returns {undefined} Nothing.
   *
   * @description
   * TODO: Add code.
   */
  static replCompleter (linePartial, callback) {
    // callback(null, [['babu', 'riba'], linePartial])
    // console.log(linePartial)
    // If no completion available, return error (an empty string does it too).
    // callback(null, [[''], linePartial])
    callback(new Error('no completion'))
  }

  // --------------------------------------------------------------------------

  /**
   * Constructor, to remember the context.
   *
   * @param {Object} context Reference to a context.
   */
  constructor (context) {
    this.context = context
  }
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The CliApp class is added as a property of this object.
module.exports.CliApp = CliApp

// In ES6, it would be:
// export class CliApp { ... }
// ...
// import { CliApp } from 'cli-app.js'

// ----------------------------------------------------------------------------
