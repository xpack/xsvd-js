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
const workFolder = path.resolve(os.tmpdir(), 'xsvd-patch')
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
test('xsvd patch',
  async (t) => {
    try {
      const { code, stdout, stderr } = await Common.xsvdCli([
        'patch'
      ])
      // Check exit code.
      t.equal(code, CliExitCodes.ERROR.SYNTAX, 'exit 1')
      const errLines = stderr.split(/\r?\n/)
      // console.log(errLines)
      t.ok(errLines.length === 4, 'has three errors')
      if (errLines.length === 4) {
        t.match(errLines[0], 'Mandatory \'--file\' not found.',
        'has --file error')
        t.match(errLines[1], 'Mandatory \'--patch\' not found.',
        'has --patch error')
        t.match(errLines[2], 'Mandatory \'--output\' not found.',
        'has --output error')
      }
      t.match(stdout, 'Usage: xsvd patch [options...]', 'has Usage')
    } catch (err) {
      t.fail(err.message)
    }
    t.end()
  })

/**
 * Test if help content includes patch options.
 */
test('xsvd patch -h',
  async (t) => {
    try {
      const { code, stdout, stderr } = await Common.xsvdCli([
        'patch',
        '-h'
      ])
      // Check exit code.
      t.equal(code, 0, 'exit code')
      const outLines = stdout.split(/\r?\n/)
      t.ok(outLines.length > 12, 'has enough output')
      if (outLines.length > 12) {
        // console.log(outLines)
        t.equal(outLines[1], 'Modify SVD JSON file using a JSON patch',
        'has title')
        t.equal(outLines[2], 'Usage: xsvd patch [options...] ' +
        '--file <file> --patch <file> --output <file>', 'has Usage')
        t.equal(outLines[3], '                  [--group-bitfield <name>]* ' +
        '[--remove <name>]*', 'has usage 2nd line')
        t.match(outLines[5], 'Patch options:', 'has patch options')
        t.match(outLines[6], '  --file <file>  ', 'has --file')
        t.match(outLines[7], '  --patch <file>  ', 'has --patch')
        t.match(outLines[8], '  --output <file>  ', 'has --output')
        t.match(outLines[9], '  --group-bitfield <name>  ',
        'has --group-bitfield')
        t.match(outLines[10], '  --remove <name>  ',
        'has --remove')
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
test('xsvd p -h',
  async (t) => {
    try {
      const { code, stdout, stderr } = await Common.xsvdCli([
        'p',
        '-h'
      ])
      // Check exit code.
      t.equal(code, 0, 'exit code')
      const outLines = stdout.split(/\r?\n/)
      t.ok(outLines.length > 12, 'has enough output')
      if (outLines.length > 12) {
        // console.log(outLines)
        t.equal(outLines[1], 'Modify SVD JSON file using a JSON patch',
        'has title')
        t.equal(outLines[2], 'Usage: xsvd patch [options...] ' +
        '--file <file> --patch <file> --output <file>', 'has Usage')
      }
      // There should be no error messages.
      t.equal(stderr, '', 'stderr empty')
    } catch (err) {
      t.fail(err.message)
    }
    t.end()
  })

const filePath = path.resolve(workFolder, 'STM32F0x0-xsvd.json')
const patchPath = path.resolve(workFolder, 'STM32F0x0-patch.json')
const readOnlyFolder = path.resolve(workFolder, 'ro')

test('unpack',
  async (t) => {
    const tgzPath = path.resolve(fixtures, 'STM32F0x0-patch.tgz')
    try {
      await Common.extractTgz(tgzPath, workFolder)
      t.pass('STM32F0x0-patch.tgz unpacked into ' + workFolder)
      await fs.chmodPromise(filePath, 0o444)
      t.pass('chmod xsvd')
      await fs.chmodPromise(patchPath, 0o444)
      t.pass('chmod patch')
      await mkdirp(readOnlyFolder)
      t.pass('mkdir ro')
      await fs.chmodPromise(readOnlyFolder, 0o444)
      t.pass('chmod ro')
    } catch (err) {
      t.fail(err)
    }
    t.end()
  })

/**
 * Test if mising input file.
 */
test('xsvd p --file xxx --patch yyy --output zzz',
  async (t) => {
    try {
      const { code, stdout, stderr } = await Common.xsvdCli([
        'p',
        '--file',
        'xxx',
        '--patch',
        'yyy',
        '--output',
        'zzz'
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

/**
 * Test if mising patch file.
 */
test('xsvd p --file STM32F0x0-xsvd.json --patch yyy --output zzz',
  async (t) => {
    try {
      const { code, stdout, stderr } = await Common.xsvdCli([
        'p',
        '--file',
        filePath,
        '--patch',
        'yyy',
        '--output',
        'zzz'
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

/**
 * Test if output file is generated.
 */
test('xsvd p --file STM32F0x0-xsvd.json --patch STM32F0x0-patch.json ' +
  '--output STM32F0x0-qemu.json',
  async (t) => {
    try {
      const outPath = path.resolve(workFolder, 'STM32F0x0-qemu.json')
      const { code, stdout, stderr } = await Common.xsvdCli([
        'p',
        '--file',
        filePath,
        '--patch',
        patchPath,
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

/**
 * Test output error.
 */
test('xsvd p --file STM32F0x0-xsvd.json --patch STM32F0x0-patch.json ' +
  '--output ro/STM32F0x0-qemu.json',
  async (t) => {
    try {
      const outPath = path.resolve(workFolder, 'ro', 'STM32F0x0-qemu.json')
      const { code, stdout, stderr } = await Common.xsvdCli([
        'p',
        '--file',
        filePath,
        '--patch',
        patchPath,
        '--output',
        outPath,
        '-v'
      ])
      // Check exit code.
      t.equal(code, CliExitCodes.ERROR.OUTPUT, 'exit code')
      // Output should go up to Writing...
      t.match(stdout, 'Writing ', 'up to writing')
      // console.log(stderr)
      t.match(stderr, 'EACCES: permission denied', 'EACCES')
    } catch (err) {
      t.fail(err.message)
    }
    t.end()
  })

/**
 * Test output error.
 */
test('xsvd p -C ... --file STM32F0x0-xsvd.json --patch STM32F0x0-patch.json ' +
  '--output ro/STM32F0x0-qemu.json',
  async (t) => {
    try {
      const { code, stdout, stderr } = await Common.xsvdCli([
        'p',
        '-C',
        workFolder,
        '--file',
        filePath,
        '--patch',
        patchPath,
        '--output',
        'ro/STM32F0x0-qemu.json',
        '-v'
      ])
      // Check exit code.
      t.equal(code, CliExitCodes.ERROR.OUTPUT, 'exit code')
      // Output should go up to Writing...
      t.match(stdout, 'Writing ', 'up to writing')
      // console.log(stderr)
      t.match(stderr, 'EACCES: permission denied', 'EACCES')
    } catch (err) {
      t.fail(err.message)
    }
    t.end()
  })

test('cleanup',
  async (t) => {
    await fs.chmodPromise(filePath, 0o666)
    t.pass('chmod xsvd')
    await fs.chmodPromise(patchPath, 0o666)
    t.pass('chmod patch')
    await rimraf(workFolder)
    t.pass('tmpdir removed')
  })

// ----------------------------------------------------------------------------
