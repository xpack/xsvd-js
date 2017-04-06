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
 * This file implements CLI command support code.
 */

// ----------------------------------------------------------------------------

const assert = require('assert')

// ============================================================================

/**
 * Base class for a CLI application.
 */
// export
class CliCmd {
  // --------------------------------------------------------------------------

  /**
   * @summary Constructor, to remember the context.
   *
   * @param {Object} context Reference to a context.
   */
  constructor (context) {
    this.context = context
  }

  /**
   * @summary Abstract `run()` method.
   *
   * @param {string[]} argv Array of arguments.
   * @returns {promise} Nothing.
   */
  async run (argv) {
    assert(false, 'Abstract CliCmd.run() method, redefine it in your derived class.')
  }
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The CliCmd class is added as a property of this object.
module.exports.CliCmd = CliCmd

// In ES6, it would be:
// export class CliCmd { ... }
// ...
// import { CliCmd } from 'cli-cmd.js'

// ----------------------------------------------------------------------------
