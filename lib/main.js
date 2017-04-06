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

/**
 * The Xsvd main module.
 *
 * It is re-exported publicly by `index.js`.
 *
 * To import classes from this module into Node.js applications, use:
 *
 * ```javascript
 * const Main = require('xsvd').Main
 * ```
 */

// ----------------------------------------------------------------------------

// ES6: `import { CliApp } from './utils/cli-app.js'
const CliApp = require('./utils/cli-app.js').CliApp

// ES6: `import { CliOptions } from './utils/cli-options.js'
const CliOptions = require('./utils/cli-options.js').CliOptions

// ES6: `import { CliHelp } from './utils/cli-helps.js'
const CliHelp = require('./utils/cli-help.js').CliHelp

// ----------------------------------------------------------------------------

/**
 * @summary Node.js callback.
 *
 * @callback nodeCallback
 * @param {number} responseCode
 * @param {string} responseMessage
 */

// ============================================================================

/**
 * @class Main
 */
// export
class Main extends CliApp {
  // --------------------------------------------------------------------------

  /**
   * @summary Callback to initialise the class object. Kind of a static constructor.
   *
   * @returns {undefined}.
   *
   * @description
   * It is called by the CliApp code.
   */
  static initialise () {
    const Self = this

    Self._initialiseCommands()
    Self._initialiseCommonOptions()
  }

  /**
   * @summary Callback to initialise the configuration options.
   *
   * @param {object} config The configuration object.
   * @returns {undefined}
   *
   * @description
   * It must be paired with `initOptions()` since it provides
   * defaults for all properties set by options setter.
   *
   * It is called by the CliApp code.
   */
  static initialiseConfiguration (config) {
    // Cool! Call the parent static function.
    super.initialiseConfiguration(config)

    config.isVersion = false
    config.isHelp = false
  }

  // --------------------------------------------------------------------------

  /**
   * @summary Initialise common options.
   *
   * @returns {undefined}
   *
   * @description
   * Common options are options that apply to all commands,
   * like options to set logger level.
   */
  static _initialiseCommonOptions () {
    CliOptions.addOptions(
      [
        {
          options: ['-h', '--help'],
          action: (cfg) => {
            cfg.isHelp = true
          },
          isHelp: true
        },
        {
          options: ['--version'],
          msg: 'show version',
          action: (cfg) => {
            cfg.isVersion = true
          },
          doProcessEarly: true
        },
        {
          options: ['-i', '--interactive'],
          msg: 'enter interactive mode',
          action: (cfg) => {
            cfg.isInteractive = true
          },
          doProcessEarly: true
        },
        {
          options: ['--interactive-server-port'],
          action: (cfg, val) => {
            cfg.interactiveServerPort = val
          },
          hasValue: true,
          doProcessEarly: true
        },
        {
          options: ['--loglevel'],
          msg: 'set log level',
          action: (cfg, val) => {
            cfg.logeLvel = val
          },
          values: ['silent', 'warn', 'info', 'verbose', 'silly'],
          param: 'level'
        },
        {
          options: ['-s', '--silent'],
          msg: '--loglevel silent',
          action: (cfg) => {
            cfg.logLevel = 'silent'
          }
        },
        {
          options: ['-q', '--quiet'],
          msg: '--loglevel quiet',
          action: (cfg) => {
            cfg.logLevel = 'quiet'
          }
        },
        {
          options: ['-d'],
          msg: '--loglevel info',
          action: (cfg) => {
            cfg.logLevel = 'info'
          }
        },
        {
          options: ['-dd', '--verbose'],
          msg: '--loglevel verbose',
          action: (cfg) => {
            cfg.logLevel = 'verbose'
          }
        },
        {
          options: ['-ddd', '--silly'],
          msg: '--loglevel silly',
          action: (cfg) => {
            cfg.logLevel = 'silly'
          }
        },
        {
          options: ['--color', '--colour'],
          msg: 'enable/disable colours',
          action: (cfg, str) => {
            cfg.color = (str.toLowerCase() === 'true')
          },
          values: ['true', 'false'],
          param: 'bool'
        }
      ])
  }

  /**
   * @summary Initialise the tree of known commands.
   *
   * @returns {undefined}
   */
  static _initialiseCommands () {
    CliOptions.addCommand('convert', './xsvd/convert.js')
    CliOptions.addCommand('patch', './xsvd/patch.js')
    CliOptions.addCommand('code', './xsvd/code.js')
  }

  // --------------------------------------------------------------------------

  // Constructor: none required, parent constructor is good enough.

  /**
   * Display the main help page.
   *
   * @returns {undefined}
   */
  help () {
    const help = new CliHelp(this.context)

    help.outputMainHelp(CliOptions.getCommandsFirstArray(),
      CliOptions.getCommonOptions())
  }

  /**
   * @summary The main entry point for the `xsvd` command.
   *
   * @param {string[]} argv_ Arguments array.
   * @returns {number} The exit code.
   */
  async main (argv_) {
    const ctx = this.context

    // TODO: Does this belong here or in Cli?
    if (!ctx.package) {
      ctx.package = await Main.readPackageJson()
    }

    CliOptions.parseCommonOptions(argv_, ctx.config)

    // Early detection of `--version`, since it makes
    // all other irelevant.
    if (ctx.config.isVersion) {
      ctx.console.log(ctx.package.version)
      return 0 // Ok.
    }

    const argv = []
    // Copy relevant args to local array.
    // Start with 0, possibly end with `--`.
    for (let i = 0; i < argv_.length && argv_[i] !== '--'; ++i) {
      argv.push(argv_[i].trim())
    }
    ctx.log.verbose(argv)

    // Isolate commands as words with letters and dashes
    const cmds = []
    for (let i = 0; i < argv.length; ++i) {
      const arg = argv[i].toLowerCase()
      if (arg.match(/^[a-z][a-z-]*/)) {
        cmds.push(arg)
      }
    }

    // If empty line or no commands and -h, output help message.
    if ((argv.length === 0) ||
      (cmds.length === 0 && ctx.config.isHelp)) {
      this.help()
      return 0 // Ok, help explicitly called.
    }

    const CmdDerivedClass = CliOptions.findCommandClass(cmds)
    if (CmdDerivedClass) {
      ctx.log.verbose(`'${ctx.pgmName} ${cmds}' started`)
      const cmd = new CmdDerivedClass(this.context)
      const ret = await cmd.run(argv_)
      ctx.log.verbose(`'${ctx.pgmName} ${cmds}' - done`)
      return ret
    } else {
      ctx.console.log(`Command '${cmds}' not supported.`)
      this.help()
      return 1 // Command not found.
    }
  }
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The Main class is added as a property to this object.

module.exports.Main = Main

// In ES6, it would be:
// export class Main { ... }
// ...
// import { Main } from 'main.js'

// ----------------------------------------------------------------------------
