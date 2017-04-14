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
/* eslint max-len: [ "error", 80, { "ignoreUrls": true } ] */

// ----------------------------------------------------------------------------

/**
 * The Xsvd main module.
 *
 * It is re-exported publicly by `index.js`.
 *
 * To import classes from this module into Node.js applications, use:
 *
 * ```javascript
 * const Xsvd = require('xsvd').Xsvd
 * ```
 */

// ----------------------------------------------------------------------------

const path = require('path')

// ES6: `import { CliApplication, CliOptions } from 'cli-start-options'
const CliApplication = require('@ilg/cli-start-options').CliApplication
const CliOptions = require('@ilg/cli-start-options').CliOptions

// ============================================================================

// export
class Xsvd extends CliApplication {
  // --------------------------------------------------------------------------

  /**
   * @summary Initialise the application class object.
   *
   * @returns {undefined} Nothing.
   *
   * @description
   * Initialise the options manager with application
   * specific commands and common options.
   *
   * @override
   */
  static doInitialise () {
    const Self = this

    // ------------------------------------------------------------------------
    // Mandatory, must be set here, not in the library, since it takes
    // the shortcut of using `__dirname` of the main file.
    Self.rootPath = path.dirname(__dirname)

    // ------------------------------------------------------------------------
    // Initialise the tree of known commands.
    // Paths should be relative to the package root.
    CliOptions.addCommand('convert', 'xsvd/convert.js')
    CliOptions.addCommand('patch', 'xsvd/patch.js')
    CliOptions.addCommand('code', 'xsvd/code.js')

    // ------------------------------------------------------------------------
    // Initialise the common options, that apply to all commands,
    // like options to set logger level, to display help, etc.
    CliOptions.addOptionGroups(
      [
        {
          title: 'Common options',
          optionDefs: [
            {
              options: ['-h', '--help'],
              action: (cfg) => {
                cfg.isHelpRequest = true
              },
              isHelp: true
            },
            {
              options: ['--version'],
              msg: 'Show version',
              action: (cfg) => {
                cfg.isVersionRequest = true
              },
              doProcessEarly: true
            },
            {
              options: ['-i', '--interactive'],
              msg: 'Enter interactive mode',
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
              msg: 'Set log level',
              action: (cfg, val) => {
                cfg.logeLvel = val
              },
              values: ['silent', 'warn', 'info', 'verbose', 'debug', 'trace'],
              param: 'level'
            },
            {
              options: ['-s', '--silent'],
              msg: 'Disable all messages (--loglevel silent)',
              action: (cfg) => {
                cfg.logLevel = 'silent'
              }
            },
            {
              options: ['-q', '--quiet'],
              msg: 'Mostly quiet (--loglevel warn)',
              action: (cfg) => {
                cfg.logLevel = 'warn'
              }
            },
            {
              options: ['-v', '--verbose'],
              msg: 'Informative (--loglevel info)',
              action: (cfg) => {
                if (cfg.logLevel === 'info') {
                  cfg.logLevel = 'verbose'
                } else {
                  cfg.logLevel = 'info'
                }
              }
            },
            {
              options: ['-vv'],
              msg: 'Verbose (--loglevel verbose, or --verbose --verbose)',
              action: (cfg) => {
                cfg.logLevel = 'verbose'
              }
            },
            {
              options: ['-d', '--debug'],
              msg: 'Debug messages (--loglevel debug)',
              action: (cfg) => {
                cfg.logLevel = 'debug'
              }
            },
            {
              options: ['-dd', '--trace'],
              msg: 'Trace messages (--loglevel trace)',
              action: (cfg) => {
                cfg.logLevel = 'trace'
              }
            },
            {
              options: ['-C'],
              msg: 'Set current folder',
              action: (cfg, val) => {
                if (path.isAbsolute(val)) {
                  cfg.cwd = val
                } else if (cfg.cwd) {
                  cfg.cwd = path.resolve(cfg.cwd, val)
                } else {
                  cfg.cwd = path.resolve(val)
                }
                console.log(cfg.cwd)
              },
              param: 'folder'
            }
          ]
        }
      ]
    )
  }

  // --------------------------------------------------------------------------

  // Constructor: use parent definition.
  // main(): use parent definition
  // help(): use parent definition.

  // (isn't object oriented code reuse great?)
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The Xsvd class is added as a property to this object.

module.exports.Xsvd = Xsvd

// In ES6, it would be:
// export class Xsvd { ... }
// ...
// import { Xsvd } from 'xsvd.js'

// ----------------------------------------------------------------------------
