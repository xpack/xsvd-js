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
 * Test BDD 'should' assertions.
 */

// ----------------------------------------------------------------------------

// The `[node-tap](http://www.node-tap.org)` framework.
// const test = require('tap').test

// The Mocha-like DSL http://www.node-tap.org/mochalike/
require('tap').mochaGlobals()
const should = require('should') // eslint-disable-line no-unused-vars

/* global describe, context, it */

// ----------------------------------------------------------------------------

// Temporary example of an asynchronous function.
const doSomethingAsync = function (n) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(0)
    }, n)
  })
}

// ----------------------------------------------------------------------------

describe('async it()', function () {
  var array = [1, 2, 3]
  context('when item is not found', function () {
    it('does not throw an error', function () {
      array.indexOf(4)
    })
    it('calls async', async function () {
      let ret = await doSomethingAsync(100)
      ret.should.equal(0)
    })
    it('returns -1', function () {
      array.indexOf(4).should.equal(-1)
    })
  })
})

describe('async context()', function () {
  var array = [1, 2, 3]
  context('when item is not found', async function () {
    let ret = await doSomethingAsync(100)
    it('does not throw an error', function () {
      array.indexOf(4)
    })
    it('checks async return', function () {
      ret.should.equal(0)
    })
    it('returns -1', function () {
      array.indexOf(4).should.equal(-1)
    })
  })
})

describe('async describe()', async function () {
  var array = [1, 2, 3]
  let ret = await doSomethingAsync(100)
  context('when item is not found', function () {
    it('does not throw an error', function () {
      array.indexOf(4)
    })
    it('checks async return', function () {
      ret.should.equal(0)
    })
    it('returns -1', function () {
      array.indexOf(4).should.equal(-1)
    })
  })
})

// ----------------------------------------------------------------------------
