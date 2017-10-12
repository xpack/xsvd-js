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
 * The `xsvd validate <options> ...` command implementation.
 */

// ----------------------------------------------------------------------------

const fs = require('fs')
// const xml2js = require('xml2js')
// const path = require('path')

const Promisifier = require('@ilg/es6-promisifier').Promisifier

// ES6: `import { CliCommand, CliExitCodes, CliError } from 'cli-start-options'
const CliCommand = require('@ilg/cli-start-options').CliCommand
const CliExitCodes = require('@ilg/cli-start-options').CliExitCodes
const CliError = require('@ilg/cli-start-options').CliError

// ----------------------------------------------------------------------------

// Promisify functions from the Node.js callbacks library.
// New functions have similar names, but suffixed with `Promise`.
Promisifier.promisifyInPlace(fs, 'readFile')
// Promisifier.promisifyInPlace(fs, 'writeFile')
// Promisifier.promisifyInPlace(fs, 'stat')
// Promisifier.promisifyInPlace(fs, 'mkdir')

// ============================================================================

class Validate extends CliCommand {
  // --------------------------------------------------------------------------

  /**
   * @summary Constructor, to set help definitions.
   *
   * @param {Object} context Reference to a context.
   */
  constructor (context) {
    super(context)

    // Title displayed with the help message.
    this.title = 'Validate a JSON XSVD file'
    this.optionGroups = [
      {
        title: 'Validate options',
        postOptions: '<files>...', // Extra arguments.
        optionDefs: [
        ]
      }
    ]
  }

  /**
   * @summary Execute the `validate` command.
   *
   * @param {string[]} args Command line arguments.
   * @returns {number} Return code.
   *
   * @override
   */
  async doRun (args) {
    const log = this.log
    log.trace(`${this.constructor.name}.doRun()`)

    log.info(this.title)
    // const config = this.context.config

    if (args.length === 0) {
      log.warn('No files to validate, quitting...')
      return CliExitCodes.SUCCESS
    }

    log.info()
    let pass = true
    for (const arg of args) {
      if (!await this.processFile(arg)) {
        pass = false
      }
    }
    this.outputDoneDuration()

    return pass ? CliExitCodes.SUCCESS : CliExitCodes.ERROR.APPLICATION
  }

  async processFile (path) {
    const log = this.log

    const inputAbsolutePath = this.makePathAbsolute(path)
    log.info(`Reading '${inputAbsolutePath}'...`)
    let inputData
    try {
      inputData = await fs.readFilePromise(inputAbsolutePath, 'utf8')
    } catch (err) {
      throw new CliError(err.message, CliExitCodes.ERROR.INPUT)
    }

    this.xsvd = JSON.parse(inputData)
    return this.validate()
  }

  async validate () {
    if (!await this.checkSchemaVersion() || !await this.hasDevices()) {
      return true
    }

    let pass = true
    if (!await this.checkSchema()) {
      pass = false
    }

    return pass
  }

  async checkSchemaVersion () {
    const log = this.log
    log.info('Checking schema...')

    const xsvd = this.xsvd

    if (!xsvd.schemaVersion) {
      log.warn('Has no schemaVersion.')
      return false
    }

    if (xsvd.schemaVersion === '0.2.0') {
      log.info(`schemaVersion '${xsvd.schemaVersion}' supported`)
      return true
    }

    log.warn(`schemaVersion '${xsvd.schemaVersion}' not supported`)
    return false
  }

  async hasDevices () {
    const log = this.log
    log.info('Checking devices property...')

    const xsvd = this.xsvd
    if (xsvd.devices) {
      const keys = Object.keys(xsvd.devices)
      if (keys.length > 0) {
        log.info(`Found devices: ${keys}`)
        return true
      }
      log.warn(`The devices object is empty.`)
      return false
    }

    log.warn(`Mandatory devices property missing.`)
    return false
  }

  async checkSchema () {
    // TODO add code to check objects, according to version
    return true
  }

  // --------------------------------------------------------------------------
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The Validate class is added as a property of this object.
module.exports.Validate = Validate

// In ES6, it would be:
// export class Validate { ... }
// ...
// import { Validate } from 'validate.js'

// ----------------------------------------------------------------------------
