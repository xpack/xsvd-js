#!/usr/bin/env node
// Mandatory shebang must point to `node` and this file must be executable.

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

/*
 * This file implements the CLI specific code. It prepares a context
 * and calls the module code.
 *
 * On POSIX platforms, a symbolic link named `xsvd` is created when
 * installing this package; for the shell to run it, this file
 * must have executable rights.
 * On Windows, two forwarders are automatically created in the
 * `C:\Program Files\nodejs\` folder: `xsvd.cmd` for native use and
 * `xsvd` (a shell script) for optional POSIX environments like minGW.
 */

// ES6: `import { WscriptAvoider} from 'wscript-avoider'
const WscriptAvoider = require('wscript-avoider').WscriptAvoider

const cmd = 'xsvd'

// Avoid running on WScript.
WscriptAvoider.quitIfWscript(cmd)

// Set the application name, to make `ps` output more readable.
process.title = cmd

// On POSIX, `process.argv0` is 'node' (uninteresting).
console.log('argv0=' + process.argv0)
// On POSIX, `process.argv[0]` is the node full path,
// like `/usr/local/bin/node`.
console.log('argv[0]=' + process.argv[0])
// On POSIX, `process.argv[1]` is the full path of the invoking script,
// either `/usr/local/bin/xsvd` or `.../cli.js`.
console.log('argv[1]=' + process.argv[1])

console.log(cmd + ' started')
setTimeout(() => {
  console.log(cmd + ' stopped')
  process.exit(0)
}, 5 * 1000)

// const Xsvd = require('./module.js').Xsvd

// ----------------------------------------------------------------------------
