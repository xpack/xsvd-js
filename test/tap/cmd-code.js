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

/**
 * Test `xsvd code`.
 */

// ----------------------------------------------------------------------------

// The `[node-tap](http://www.node-tap.org)` framework.
const test = require('tap').test

const Common = require('../common.js').Common

// ----------------------------------------------------------------------------

test('xsvd code', async (t) => {
  try {
    const { code, stdout, stderr } = await Common.xsvdCli(['code'])
    // Check exit code.
    t.equal(code, 0, 'exit 0')
    // Check preliminary output.
    // Beware, the stdout string has a new line terminator.
    t.equal(stdout, 'code\n', 'ok')
    // There should be no error messages.
    t.equal(stderr, '', 'stderr empty')
  } catch (err) {
    t.fail(err.message)
  }
  t.end()
})

// ----------------------------------------------------------------------------
