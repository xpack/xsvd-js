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
 * Test the direct invocation as a module.
 */

// ----------------------------------------------------------------------------

// The `[node-tap](http://www.node-tap.org)` framework.
const test = require('tap').test
const path = require('path')

// The Mocha-like DSL http://www.node-tap.org/mochalike/
// require('tap').mochaGlobals()
// const should = require('should') // eslint-disable-line no-unused-vars
// /* global describe, context, it */

const Common = require('../common.js').Common

// ES6: `import { CliApplication } from 'cli-start-options.js'
const CliApplication = require('@ilg/cli-start-options').CliApplication

// ----------------------------------------------------------------------------

let pack = null
const rootPath = path.dirname(path.dirname(__dirname))

test('setup', async (t) => {
  // Read in the package.json, to later compare version.
  pack = await CliApplication.readPackageJson(rootPath)
  t.ok(pack, 'package ok')
  t.ok(pack.version.length > 0, 'version length > 0')
  t.pass(`package ${pack.name}@${pack.version}`)
  t.end()
})

test('xsvd --version (module call)', async (t) => {
  try {
    const { code, stdout, stderr } = await Common.xsvdLib(['--version', '-ddd'])
    // Check exit code.
    t.equal(code, 0, 'exit 0')
    // Check if version matches the package.
    // Beware, the stdout string has a new line terminator.
    t.equal(stdout, pack.version + '\n', 'version ok')
    // There should be no error messages.
    t.equal(stderr, '', 'stderr empty')
  } catch (err) {
    t.fail(err.stack)
  }
  t.end()
})

/*
describe('setup', () => {
  context('when reading package.json', async function () {
    // Read in the package.json, to later compare version.
    pack = await CliApplication.readPackageJson()
    it('json object exists', () => { pack.should.not.equal(null) })
    it('version string is not empty', () => { pack.version.should.be.type('string').and.not.be.empty() })
  })
})
*/

// ----------------------------------------------------------------------------
