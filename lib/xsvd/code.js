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
 * The `xsvd code <options> ...` command implementation.
 */

// ----------------------------------------------------------------------------

const fs = require('fs')
const path = require('path')

// https://www.npmjs.com/package/shopify-liquid
const Liquid = require('shopify-liquid')

const LiquidExtension = require('../utils/liquid-extensions.js')
  .LiquidExtension

// TODO: extract to a separate module
const Promisifier = require('../utils/asy.js')

// ES6: `import { CliCommand, CliExitCodes, CliError, CliErrorApplication }
//   from 'cli-start-options'
const CliCommand = require('@ilg/cli-start-options').CliCommand
const CliExitCodes = require('@ilg/cli-start-options').CliExitCodes
const CliError = require('@ilg/cli-start-options').CliError
const CliErrorApplication = require('@ilg/cli-start-options')
  .CliErrorApplication

// ----------------------------------------------------------------------------

// Promisify functions from the Node.js library.
if (!fs.readFilePromise) {
  fs.readFilePromise = Promisifier.promisify(fs.readFile)
}

if (!fs.statPromise) {
  fs.statPromise = Promisifier.promisify(fs.stat)
}

if (!fs.mkdirPromise) {
  fs.mkdirPromise = Promisifier.promisify(fs.mkdir)
}

if (!fs.writeFilePromise) {
  fs.writeFilePromise = Promisifier.promisify(fs.writeFile)
}

// ============================================================================

// export
class Code extends CliCommand {
  // --------------------------------------------------------------------------

  /**
   * @summary Constructor, to set help definitions.
   *
   * @param {Object} context Reference to a context.
   */
  constructor (context) {
    super(context)

    // Title displayed with the help message.
    this.title = 'Generate QEMU peripheral source files for a given family'
    this.optionGroups = [
      {
        title: 'Code options',
        optionDefs: [
          {
            options: ['--file'],
            action: (context, val) => {
              context.config.inputPath = val
            },
            init: (context) => {
              context.config.inputPath = undefined
            },
            msg: 'Input file in JSON format',
            param: 'file',
            isMandatory: true
          },
          {
            options: ['--dest'],
            action: (context, val) => {
              context.config.destFolder = val
            },
            init: (cfg) => {
              cfg.config.destFolder = undefined
            },
            msg: 'Destination folder',
            msgDefault: 'SVD device name',
            param: 'folder',
            isOptional: true
          },
          {
            options: ['--vendor-prefix'],
            action: (context, val) => {
              context.config.vendorPrefix = val.toUpperCase()
            },
            init: (context) => {
              context.config.vendorPrefix = undefined
            },
            msg: 'Prefix, like STM32',
            param: 'string',
            isOptional: true
          },
          {
            options: ['--device-family'],
            action: (context, val) => {
              context.config.deviceFamily = val.toUpperCase()
            },
            init: (context) => {
              context.config.deviceFamily = undefined
            },
            msg: 'Family, like F4',
            param: 'string',
            isOptional: true
          },
          {
            options: ['--device-selector'],
            action: (context, val) => {
              context.config.deviceSelector = val.toUpperCase()
            },
            init: (context) => {
              context.config.deviceSelector = undefined
            },
            msg: 'Selector, like 40x',
            param: 'string',
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

    const svd = JSON.parse(inputData)

    this.validate(svd)

    if (!config.destFolder) {
      // Default destination folder to the device name.
      config.destFolder = svd.device.name
    }

    // List the peripherals existing in the input file.
    var periphArray = []
    svd.device.peripherals.forEach((peripheral) => {
      if (peripheral.registers) {
        if (peripheral.qemuGroupName) {
          periphArray.push(`${peripheral.qemuGroupName}(${peripheral.name})`)
        } else {
          periphArray.push(`${peripheral.name}`)
        }
      }
    })
    log.info(`Peripherals: ${periphArray.join(' ')}\n`)

    // Defaults for STM32 devices.
    if (svd.device.name.startsWith('STM32')) {
      config.vendorPrefix = config.vendorPrefix || 'STM32'
      config.deviceFamily = config.deviceFamily ||
        svd.device.name.substr(5, 2).toUpperCase()
      config.deviceSelector = config.deviceSelector ||
        svd.device.name.substr(6).toLowerCase()
    }

    if (!config.vendorPrefix) {
      throw new CliErrorApplication('Missing --vendor-prefix ' +
        '(defaults for STM32 only)')
    }

    if (!config.deviceFamily) {
      throw new CliErrorApplication('Missing --device-family ' +
        '(defaults for STM32 only)')
    }

    if (!config.deviceSelector) {
      throw new CliErrorApplication('Missing --device-selector ' +
        '(defaults for STM32 only)')
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
    const engine = Liquid({
      root: templatesPath,
      extname: '.liquid',
      cache: false,
      strict_filters: true,       // default: false
      strict_variables: true,     // default: false
      trim_right: true            // default: false
    })

    // Usage: {{ name | c_reserved }}
    engine.registerFilter('c_reserved', LiquidExtension.tagCKeywords)
    // Usage: {{ name | to_uint }}
    engine.registerFilter('to_uint', LiquidExtension.tagToUint)
    // Usage: {{ name | to_hex }}
    engine.registerFilter('to_hex', LiquidExtension.tagToHex)
    // Usage: {{ name | rw_bits }}
    engine.registerFilter('rw_bits', LiquidExtension.tagRwBits)

    for (let [, peripheral] of svd.device.peripherals.entries()) {
      if (peripheral.registers) {
        const pnam = `${peripheral.name.toLowerCase()}`

        const vh = await engine.renderFile('qemu-peripherals-h.liquid', {
          vendorPrefix: config.vendorPrefix, // Uppercase
          deviceFamily: config.deviceFamily, // Uppercase
          deviceName: svd.device.name,
          deviceSelector: config.deviceSelector, // Lowercase
          peripherals: svd.device.peripherals,
          peripheral: peripheral
        })
        const headerPath = path.resolve(codePath, `${pnam}.h`)
        try {
          await fs.writeFilePromise(headerPath, vh, 'utf8')
        } catch (err) {
          throw new CliError(err.message, CliExitCodes.ERROR.OUTPUT)
        }
        log.info(`Header file '${config.destFolder}/${pnam}.h' written.`)

        const vc = await engine.renderFile('qemu-peripherals-c.liquid', {
          vendorPrefix: config.vendorPrefix, // Uppercase
          deviceFamily: config.deviceFamily, // Uppercase
          deviceName: svd.device.name,
          deviceSelector: config.deviceSelector, // Lowercase
          peripheral: peripheral
        })

        const sourcePath = path.resolve(codePath, `${pnam}.c`)
        try {
          await fs.writeFilePromise(sourcePath, vc, 'utf8')
        } catch (err) {
          throw new CliError(err.message, CliExitCodes.ERROR.OUTPUT)
        }
        log.info(`Source file '${config.destFolder}/${pnam}.c' written.`)
      }
    }

    log.info('Done.')
    return CliExitCodes.SUCCESS
  }

  validate (svd) {
    if (!svd.device) {
      throw new CliErrorApplication(`Mandatory 'device' missing.`)
    }
    if (!svd.device.peripherals) {
      throw new CliErrorApplication(`Mandatory 'device.peripherals' missing.`)
    }
  }
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The Code class is added as a property of this object.
module.exports.Code = Code

// In ES6, it would be:
// export class Code { ... }
// ...
// import { Code } from 'code.js'

// ----------------------------------------------------------------------------
