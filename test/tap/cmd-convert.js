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
 * Test `xsvd convert`.
 */

// ----------------------------------------------------------------------------

// The `[node-tap](http://www.node-tap.org)` framework.
const test = require('tap').test

const Common = require('../common.js').Common

// ----------------------------------------------------------------------------

/**
 * Test if with empty line fails with mandatory error and displays help.
 */
test('xsvd convert', async (t) => {
  try {
    const { code, stdout, stderr } = await Common.xsvdCli(['convert'])
    // Check exit code.
    t.equal(code, 1, 'exit 1')
    const errLines = stderr.split(/\r?\n/)
    // console.log(errLines)
    t.ok(errLines.length === 3, 'has two errors')
    t.equal(errLines[0], 'Mandatory \'--file\' not found.',
      'has --file error')
    t.equal(errLines[1], 'Mandatory \'--output\' not found.',
      'has --output error')
    t.match(stdout, 'Usage: xsvd convert [options...]', 'has Usage')
  } catch (err) {
    t.fail(err.message)
  }
  t.end()
})

/**
 * Test if help content includes convert options.
 */
test('xsvd code -h', async (t) => {
  try {
    const { code, stdout, stderr } = await Common.xsvdCli(['convert', '-h'])
    // Check exit code.
    t.equal(code, 0, 'exit 0')
    const outLines = stdout.split(/\r?\n/)
    t.ok(outLines.length > 9, 'has enough output')
    if (outLines.length > 9) {
      // console.log(outLines)
      t.equal(outLines[1], 'Convert an ARM SVD file from XML to JSON',
        'has title')
      t.equal(outLines[2], 'Usage: xsvd convert [options...] ' +
        '--file <file> --output <file>', 'has Usage')
      t.match(outLines[4], 'Convert options:', 'has convert options')
      t.match(outLines[5], '  --file <file>  ', 'has --file')
      t.match(outLines[6], '  --output <file>  ', 'has --output')
    }
    // There should be no error messages.
    t.equal(stderr, '', 'stderr empty')
  } catch (err) {
    t.fail(err.message)
  }
  t.end()
})

// ----------------------------------------------------------------------------
