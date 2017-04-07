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
// eslint valid-jsdoc: "error"

// ----------------------------------------------------------------------------

const assert = require('assert')
const spawn = require('child_process').spawn
const Console = require('console').Console
const Writable = require('stream').Writable

// ES6: `import { CliHelp } from './utils/cli-helps.js'
const Xsvd = require('../lib/main.js').Xsvd

// ----------------------------------------------------------------------------

/**
 * Test common options, like --version, --help, etc.
 */

// ----------------------------------------------------------------------------

const nodeBin = process.env.npm_node_execpath || process.env.NODE || process.execPath
const executableName = './bin/xsvd.js'
const pgmName = 'xsvd'

/**
 * @class Main
 */
// export
class Common {
  /**
   * Run xsvd in a separate process.
   *
   * @param {string[]} args Command line arguments
   * @param {Object} spawnOpts Optional spawn options.
   * @returns {{code: number, stdout: string, stderr: string}} Exit
   *  code and captured output/error streams.
   *
   * Spawn a separate process to run node with the
   */
  static async xsvdCli (args, spawnOpts = {}) {
    return new Promise((resolve, reject) => {
      spawnOpts.env = spawnOpts.env || process.env

      // Runs in project root.
      // console.log(`Current directory: ${process.cwd()}`)
      let stdout = ''
      let stderr = ''
      const cmd = [executableName]
      const child = spawn(nodeBin, cmd.concat(args), spawnOpts)

      if (child.stderr) {
        child.stderr.on('data', (chunk) => {
          stderr += chunk
        })
      }

      if (child.stdout) {
        child.stdout.on('data', (chunk) => {
          stdout += chunk
        })
      }

      child.on('error', (err) => {
        reject(err)
      })

      child.on('close', (code) => {
        resolve({ code, stdout, stderr })
      })
    })
  }

  /**
   * Run xsvd as a library call.
   *
   * @param {string[]} args Command line arguments
   * @param {Object} ctx Optional context.
   * @returns {{code: number, stdout: string, stderr: string}} Exit
   *  code and captured output/error streams.
   *
   */
  static async xsvdLib (args, ctx = null) {
    assert(Xsvd !== null, 'No application class')
    // Create two streams to local strings.
    let stdout = ''
    const ostream = new Writable({
      write (chunk, encoding, callback) {
        stdout += chunk.toString()
        callback()
      }
    })

    let stderr = ''
    const errstream = new Writable({
      write (chunk, encoding, callback) {
        stderr += chunk.toString()
        callback()
      }
    })

    const _console = new Console(ostream, errstream)
    const context = Xsvd.initialiseContext(ctx, pgmName, _console)
    const app = new Xsvd(context)
    const code = await app.main(args)
    return { code, stdout, stderr }
  }
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The Main class is added as a property to this object.

module.exports.Common = Common

// In ES6, it would be:
// export class Common { ... }
// ...
// import { Common } from 'common.js'

// ----------------------------------------------------------------------------
