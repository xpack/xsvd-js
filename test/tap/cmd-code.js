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
 * Test `xsvd code`.
 */

// ----------------------------------------------------------------------------

// The `[node-tap](http://www.node-tap.org)` framework.
const test = require('tap').test

const Common = require('../common.js').Common

// ----------------------------------------------------------------------------

/**
 * Test if with empty line fails with mandatory error and displays help.
 */
test('xsvd code', async (t) => {
  try {
    const { code, stdout, stderr } = await Common.xsvdCli(['code'])
    // Check exit code.
    t.equal(code, 1, 'exit 1')
    const errLines = stderr.split(/\r?\n/)
    // console.log(errLines)
    t.ok(errLines.length === 2, 'has one error')
    if (errLines.length === 2) {
      t.match(errLines[0], 'Mandatory \'--file\' not found.',
        'has --file error')
    }
    t.match(stdout, 'Usage: xsvd code [options...]', 'has Usage')
  } catch (err) {
    t.fail(err.message)
  }
  t.end()
})

/**
 * Test if help content includes code options.
 */
test('xsvd code -h', async (t) => {
  try {
    const { code, stdout, stderr } = await Common.xsvdCli(['code', '-h'])
    // Check exit code.
    t.equal(code, 0, 'exit 0')
    const outLines = stdout.split(/\r?\n/)
    t.ok(outLines.length > 13, 'has enough output')
    if (outLines.length > 13) {
      t.equal(outLines[1], 'Generate QEMU peripheral source files for ' +
        'a given family', 'has title')
      t.equal(outLines[2], 'Usage: xsvd code [options...] ' +
        '--file <file> --dest <folder>', 'has Usage')
      t.equal(outLines[3], '                 --vendor-prefix <string> ' +
        '--device-family <string>', 'has usage 2nd line')
      t.equal(outLines[4], '                 --device-selector <string>',
        'has usage 3rd line')
      t.match(outLines[6], 'Code options:', 'has code options')
      t.match(outLines[7], '  --file <file>  ', 'has --file')
      t.match(outLines[8], '  --dest <folder>  ', 'has --dest')
      t.match(outLines[9], '  --vendor-prefix <string>  ',
        'has --vendor-prefix')
      t.match(outLines[10], '  --device-family <string>  ',
        'has --device-family')
      t.match(outLines[11], '  --device-selector <string>  ',
        'has --device-selector')
    }
    // There should be no error messages.
    t.equal(stderr, '', 'stderr empty')
  } catch (err) {
    t.fail(err.message)
  }
  t.end()
})

/**
 * Test if partial command recognised and expanded.
 */
test('xsvd cod -h', async (t) => {
  try {
    const { code, stdout, stderr } = await Common.xsvdCli(['cod', '-h'])
    // Check exit code.
    t.equal(code, 0, 'exit 0')
    const outLines = stdout.split(/\r?\n/)
    t.ok(outLines.length > 13, 'has enough output')
    if (outLines.length > 13) {
      t.equal(outLines[1], 'Generate QEMU peripheral source files for ' +
        'a given family', 'has title')
      t.equal(outLines[2], 'Usage: xsvd code [options...] ' +
        '--file <file> --dest <folder>', 'has Usage')
    }
    // There should be no error messages.
    t.equal(stderr, '', 'stderr empty')
  } catch (err) {
    t.fail(err.message)
  }
  t.end()
})

// ----------------------------------------------------------------------------
