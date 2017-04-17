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

const path = require('path')
const os = require('os')
const fs = require('fs')

// The `[node-tap](http://www.node-tap.org)` framework.
const test = require('tap').test

const Common = require('../common.js').Common
const Promisifier = require('../../lib/utils/asy.js')

// ES6: `import { CliExitCodes } from 'cli-start-options'
const CliExitCodes = require('@ilg/cli-start-options').CliExitCodes

// ----------------------------------------------------------------------------

const fixtures = path.resolve(__dirname, '../fixtures')
const workFolder = path.resolve(os.tmpdir(), 'xsvd-convert')
const rimraf = Promisifier.promisify(require('rimraf'))
const mkdirp = Promisifier.promisify(require('mkdirp'))

// Promisified functions from the Node.js callbacks library.
if (!fs.chmodPromise) {
  fs.chmodPromise = Promisifier.promisify(fs.chmod)
}

// ----------------------------------------------------------------------------

/**
 * Test if with empty line fails with mandatory error and displays help.
 */
test('xsvd convert',
  async (t) => {
    try {
      const { code, stdout, stderr } = await Common.xsvdCli([
        'convert'
      ])
      // Check exit code.
      t.equal(code, CliExitCodes.ERROR.SYNTAX, 'exit code')
      const errLines = stderr.split(/\r?\n/)
      // console.log(errLines)
      t.ok(errLines.length === 3, 'has two errors')
      if (errLines.length === 3) {
        t.match(errLines[0], 'Mandatory \'--file\' not found.',
        'has --file error')
        t.match(errLines[1], 'Mandatory \'--output\' not found.',
        'has --output error')
      }
      t.match(stdout, 'Usage: xsvd convert [options...]', 'has Usage')
    } catch (err) {
      t.fail(err.message)
    }
    t.end()
  })

/**
 * Test if help content includes convert options.
 */
test('xsvd convert -h',
  async (t) => {
    try {
      const { code, stdout, stderr } = await Common.xsvdCli([
        'convert',
        '-h'
      ])
      // Check exit code.
      t.equal(code, 0, 'exit code')
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

/**
 * Test if partial command recognised and expanded.
 */
test('xsvd con -h',
  async (t) => {
    try {
      const { code, stdout, stderr } = await Common.xsvdCli([
        'con',
        '-h'
      ])
      // Check exit code.
      t.equal(code, 0, 'exit code')
      const outLines = stdout.split(/\r?\n/)
      t.ok(outLines.length > 9, 'has enough output')
      if (outLines.length > 9) {
        // console.log(outLines)
        t.equal(outLines[1], 'Convert an ARM SVD file from XML to JSON',
        'has title')
        t.equal(outLines[2], 'Usage: xsvd convert [options...] ' +
        '--file <file> --output <file>', 'has Usage')
      }
      // There should be no error messages.
      t.equal(stderr, '', 'stderr empty')
    } catch (err) {
      t.fail(err.message)
    }
    t.end()
  })

/**
 * Test missing input file.
 */
test('xsvd con --file xxx --output yyy',
  async (t) => {
    try {
      const { code, stdout, stderr } = await Common.xsvdCli([
        'con',
        '--file',
        'xxx',
        '--output',
        'yyy'
      ])
      // Check exit code.
      t.equal(code, CliExitCodes.ERROR.INPUT, 'exit code')
      // There should be no output.
      t.equal(stdout, '', 'stdout empty')
      t.match(stderr, 'ENOENT: no such file or directory', 'ENOENT')
    } catch (err) {
      t.fail(err.message)
    }
    t.end()
  })

test('unpack',
  async (t) => {
    const tgzPath = path.resolve(fixtures, 'STM32F0x0-convert.tgz')
    try {
      await Common.extractTgz(tgzPath, workFolder)
      t.pass('STM32F0x0-convert.tgz unpacked into ' + workFolder)
      await fs.chmodPromise(filePath, 0o444)
      t.pass('chmod')
      await mkdirp(readOnlyFolder)
      t.pass('mkdir ro')
      await fs.chmodPromise(readOnlyFolder, 0o444)
      t.pass('chmod ro')
    } catch (err) {
      t.fail(err)
    }
    t.end()
  })

const filePath = path.resolve(workFolder, 'STM32F0x0.svd')
const readOnlyFolder = path.resolve(workFolder, 'ro')

test('xsvd con --file STM32F0x0.svd --output STM32F0x0.json',
  async (t) => {
    try {
      const outPath = path.resolve(workFolder, 'STM32F0x0.json')
      const { code, stdout, stderr } = await Common.xsvdCli([
        'con',
        '--file',
        filePath,
        '--output',
        outPath
      ])
      // Check exit code.
      t.equal(code, 0, 'exit code')
      t.equal(stdout, '', 'no output')
      // console.log(stdout)
      t.equal(stderr, '', 'no errors')
      // console.log(stderr)

      const fileContent = await fs.readFilePromise(outPath)
      t.ok(fileContent, 'read in')
      const json = JSON.parse(fileContent.toString())
      t.ok(json, 'json parsed')
      t.match(json.warning, 'DO NOT EDIT!', 'has warning')
      t.ok(json.device, 'has device')
    } catch (err) {
      t.fail(err.message)
    }
    t.end()
  })

test('xsvd con --file STM32F0x0.svd --output STM32F0x0.json -v',
  async (t) => {
    try {
      const outPath = path.resolve(workFolder, 'STM32F0x0.json')
      const { code, stdout, stderr } = await Common.xsvdCli([
        'con',
        '--file',
        filePath,
        '--output',
        outPath,
        '-v'
      ])
      // Check exit code.
      t.equal(code, 0, 'exit code')
      t.match(stdout, 'Done.', 'done message')
      // console.log(stdout)
      t.equal(stderr, '', 'no errors')
      // console.log(stderr)
    } catch (err) {
      t.fail(err.message)
    }
    t.end()
  })

test('xsvd con --file STM32F0x0.svd --output ro/STM32F0x0.json -v',
  async (t) => {
    try {
      const outPath = path.resolve(workFolder, 'ro', 'STM32F0x0.json')
      const { code, stdout, stderr } = await Common.xsvdCli([
        'con',
        '--file',
        filePath,
        '--output',
        outPath,
        '-v'
      ])
      // Check exit code.
      t.equal(code, CliExitCodes.ERROR.OUTPUT, 'exit code')
      // Output should go up to Writing...
      // console.log(stdout)
      t.match(stdout, 'Writing ', 'up to writing')
      // console.log(stderr)
      t.match(stderr, 'EACCES: permission denied', 'EACCES')
    } catch (err) {
      t.fail(err.message)
    }
    t.end()
  })

test('xsvd con -C ... --file STM32F0x0.svd --output ro/STM32F0x0.json -v',
  async (t) => {
    try {
      const { code, stdout, stderr } = await Common.xsvdCli([
        'con',
        '-C',
        workFolder,
        '--file',
        filePath,
        '--output',
        'ro/STM32F0x0.json',
        '-v'
      ])
      // Check exit code.
      t.equal(code, CliExitCodes.ERROR.OUTPUT, 'exit code')
      // Output should go up to Writing...
      // console.log(stdout)
      t.match(stdout, 'Writing ', 'up to writing')
      // console.log(stderr)
      t.match(stderr, 'EACCES: permission denied', 'EACCES')
    } catch (err) {
      t.fail(err.message)
    }
    t.end()
  })

test('cleanup', async (t) => {
  await fs.chmodPromise(filePath, 0o666)
  t.pass('chmod')
  await rimraf(workFolder)
  t.pass('tmpdir removed')
})

// ----------------------------------------------------------------------------
