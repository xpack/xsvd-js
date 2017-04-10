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
 * The `xsvd code <options> ...` command implementation.
 */

// ----------------------------------------------------------------------------

// ES6: `import { CliCommand } from 'cli-start-options'
const CliCommand = require('@ilg/cli-start-options').CliCommand

// ----------------------------------------------------------------------------

// Temporary example of an asynchronous function.
const doSomethingAsync = function (n) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(0)
    }, n)
  })
}

// ============================================================================

// export
class Code extends CliCommand {
  // --------------------------------------------------------------------------

  /**
   * @summary Constructor, to set help definitions.
   *
   * @param {Object} context Reference to a context.
   */
  constructor (context) {
    super(context)

    // Title displayed with the help message.
    this.title = 'Generate QEMU peripheral source files for a given family'
    this.optionGroups = [
      {
        title: 'Code options',
        optionDefs: [
          {
            options: ['--file'],
            action: (cfg, val) => {
              cfg.inputFile = val
            },
            msg: 'Input file in JSON format',
            param: 'file',
            isMandatory: true
          },
          {
            options: ['--dest'],
            action: (cfg, val) => {
              cfg.destFolder = val
            },
            msg: 'Destination folder (optional, default SVD device name)',
            param: 'folder'
          },
          {
            options: ['--vendor-prefix'],
            action: (cfg, val) => {
              cfg.vendorPrefix = val
            },
            msg: 'Prefix, like STM32',
            param: 'string'
          },
          {
            options: ['--device-family'],
            action: (cfg, val) => {
              cfg.deviceFamily = val
            },
            msg: 'Family, like F4',
            param: 'string'
          },
          {
            options: ['--device-selector'],
            action: (cfg, val) => {
              cfg.deviceFamily = val
            },
            msg: 'Selector, like 40x',
            param: 'string'
          }
        ]
      }
    ]
  }

  /**
   * @summary Execute the `code` command.
   *
   * @param {string[]} args Command line arguments.
   * @returns {number} Return code.
   *
   * @override
   */
  async doRun (args) {
    return await doSomethingAsync(100)
  }
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The Convert class is added as a property of this object.
module.exports.Code = Code

// In ES6, it would be:
// export class Convert { ... }
// ...
// import { Code } from 'code.js'

// ----------------------------------------------------------------------------
