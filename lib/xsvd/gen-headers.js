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
 * The `xsvd generate header <options> ...` command implementation.
 */

// ----------------------------------------------------------------------------

const fs = require('fs')
const path = require('path')

// https://www.npmjs.org/package/liquidjs
const Liquid = require('liquidjs')

// const LiquidExtension = require('../utils/liquid-extensions.js')
//  .LiquidExtension

const Promisifier = require('@ilg/es6-promisifier').Promisifier

// ES6: `import { CliCommand, CliExitCodes, CliError, CliErrorApplication }
//   from 'cli-start-options'
const CliCommand = require('@ilg/cli-start-options').CliCommand
const CliExitCodes = require('@ilg/cli-start-options').CliExitCodes
const CliError = require('@ilg/cli-start-options').CliError
const CliErrorApplication = require('@ilg/cli-start-options')
  .CliErrorApplication

// ----------------------------------------------------------------------------

// Promisify functions from the Node.js callbacks library.
// New functions have similar names, but suffixed with `Promise`.
Promisifier.promisifyInPlace(fs, 'readFile')
Promisifier.promisifyInPlace(fs, 'writeFile')
Promisifier.promisifyInPlace(fs, 'stat')
Promisifier.promisifyInPlace(fs, 'mkdir')

// ============================================================================

// export
class GenerateHeaders extends CliCommand {
  // --------------------------------------------------------------------------

  /**
   * @summary Constructor, to set help definitions.
   *
   * @param {Object} context Reference to a context.
   */
  constructor (context) {
    super(context)

    // Title displayed with the help message.
    this.title = 'Generate device peripheral header files from an XSVD file'
    this.optionGroups = [
      {
        title: 'Generate headers options',
        optionDefs: [
          {
            options: ['--file'],
            init: (context) => {
              context.config.inputPath = undefined
            },
            action: (context, val) => {
              context.config.inputPath = val
            },
            msg: 'Input XSVD file in JSON format',
            param: 'file',
            isMandatory: true
          },
          {
            options: ['--dest'],
            init: (cfg) => {
              cfg.config.destFolder = undefined
            },
            action: (context, val) => {
              context.config.destFolder = val
            },
            msg: 'Destination folder',
            msgDefault: 'XSVD device name',
            param: 'folder',
            isOptional: true
          }
        ]
      }
    ]
  }

  /**
   * @summary Execute the `code` command.
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

    const context = this.context
    const config = context.config

    const inputAbsolutePath = this.makePathAbsolute(config.inputPath)
    log.info(`Reading '${inputAbsolutePath}'...`)
    let inputData
    try {
      inputData = await fs.readFilePromise(inputAbsolutePath, 'utf8')
    } catch (err) {
      throw new CliError(err.message, CliExitCodes.ERROR.INPUT)
    }

    const xsvd = JSON.parse(inputData)

    this.validate(xsvd)

    if (!config.destFolder) {
      // Default destination folder to the device name.
      config.destFolder = 'default-folder'
    }

    const codePath = this.makePathAbsolute(config.destFolder)

    try {
      const stat = await fs.statPromise(codePath)
      if (!stat.isDirectory()) {
        throw new CliError(`'${codePath}' exists and is not a folder.`)
      }
    } catch (err) {
      await fs.mkdirPromise(codePath)
    }

    const templatesPath = path.resolve(context.rootPath, 'assets/templates')
    const liquid = Liquid({
      root: templatesPath,
      extname: '.liquid',
      cache: false,
      strict_filters: true,       // default: false
      strict_variables: true      // default: false
    })

    const vm = {}
    vm.macroGuard = 'SIFIVE_FREEDOM_E310_DEFINES_H_'

    vm.deviceName = 'FE310-G000'
    vm.vendorName = 'SiFive'

    vm.inputFileName = path.basename(config.inputPath)
    vm.inputFileVersion = '7.6.5'

    vm.toolName = 'xsvd'
    vm.toolVersion = '1.2.3'
    
    vm.isoDate = '2017-10-11'

    const tm = []
    tm.push({
      access: '__IO',
      type: 'uint32_t',
      name: 'MOFCR',
      address: '0x48015000',
      description: 'Message Object Function Control Register'
    })
    tm.push({
      access: '__IO',
      type: 'uint32_t',
      name: 'MOFGPR',
      address: '0x48015004',
      description: 'Message Object FIFO/Gateway Pointer Register'
    })

    const t = {
      name: 'CAN_MO_TypeDef',
      members: tm,
      description: 'CAN Message Object'
    }

    vm.typedefs = []
    vm.typedefs.push(t)

    const sd = []
    sd.push({ name: 'PPB_ACTLR_DISMCYCINT_Pos', value: '0UL' })
    sd.push({ name: 'PPB_ACTLR_DISMCYCINT_Msk', value: '0x1UL' })

    const sm = []
    sm.push({ name: 'PPB_ACTLR', defs: sd })

    vm.structs = []
    vm.structs.push({ name: 'PPB', members: sm })

    vm.memDefs = []
    vm.memDefs.push({ name: 'PPB_BASE', value: '0xE000E000UL' })

    vm.periphDefs = []
    vm.periphDefs.push({ name: 'PPB', value: '((PPB_Type*) PPB_BASE)' })
    
    const vh = await liquid.renderFile('device-peripherals-h.liquid', {
      vm: vm
    })

    const headerPath = path.resolve(codePath, 'device-peripherals.h')
    try {
      await fs.writeFilePromise(headerPath, vh, 'utf8')
    } catch (err) {
      throw new CliError(err.message, CliExitCodes.ERROR.OUTPUT)
    }
    log.info(`Header file '${config.destFolder}/device-peripherals.h' written.`)

    this.outputDoneDuration()
    return CliExitCodes.SUCCESS
  }

  validate (xsvd) {
    if (!xsvd.devices) {
      throw new CliErrorApplication(`Mandatory 'devices' missing.`)
    }
  }
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The GenerateHeaders class is added as a property of this object.
module.exports.GenerateHeaders = GenerateHeaders

// In ES6, it would be:
// export class GenerateHeaders { ... }
// ...
// import { GenerateHeaders } from 'generate-headers.js'

// ----------------------------------------------------------------------------
