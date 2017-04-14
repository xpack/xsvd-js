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
 * The `xsvd convert <options> ...` command implementation.
 */

// ----------------------------------------------------------------------------

const fs = require('fs')
const xml2js = require('xml2js')
const path = require('path')

// TODO: extract to a separate module
const Promisifier = require('../utils/asy.js')

// ES6: `import { CliCommand, CliExitCodes } from 'cli-start-options'
const CliCommand = require('@ilg/cli-start-options').CliCommand
const CliExitCodes = require('@ilg/cli-start-options').CliExitCodes
const CliError = require('@ilg/cli-start-options').CliError

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

class Convert extends CliCommand {
  // --------------------------------------------------------------------------

  /**
   * @summary Constructor, to set help definitions.
   *
   * @param {Object} context Reference to a context.
   */
  constructor (context) {
    super(context)

    // Title displayed with the help message.
    this.title = 'Convert an ARM SVD file from XML to JSON'
    this.optionGroups = [
      {
        title: 'Convert options',
        optionDefs: [
          {
            options: ['--file'],
            action: (context, val) => {
              context.config.inputPath = val
            },
            msg: 'Input file in ARM SVD format',
            param: 'file',
            isMandatory: true
          },
          {
            options: ['--output'],
            action: (context, val) => {
              context.config.outputPath = val
            },
            msg: 'Output file in JSON format',
            param: 'file',
            isMandatory: true
          }
        ]
      }
    ]
  }

  /**
   * @summary Execute the `convert` command.
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
    const config = this.context.config
    const inputAbsolutePath = this.makePathAbsolute(config.inputPath)
    log.info(`Reading '${inputAbsolutePath}'...`)
    let inputData
    try {
      inputData = await fs.readFilePromise(inputAbsolutePath, 'utf8')
    } catch (err) {
      throw new CliError(err.message, CliExitCodes.ERROR.INPUT)
    }

    this.inputFileName = path.basename(config.inputPath)

    // xml2js.Parser.prototype.parseStringPromise =
    //  Promisifier.promisify(xml2js.Parser.prototype.parseString)

    log.info('Parsing XML...')

    const parser = new xml2js.Parser()
    parser.parseStringPromise = Promisifier.promisify(parser.parseString)

    // TODO: use a better conversion than substring
    const parsed = await parser.parseStringPromise(
      inputData.substring(0, inputData.length))

    log.info('Converting to JSON...')

    const out = this.createRoot(parsed)
    this.addGenerator(out)

    const json = JSON.stringify(out, null, '\t')

    const outputAbsolutePath = this.makePathAbsolute(config.outputPath)
    const dirPath = path.dirname(outputAbsolutePath)

    if (!await fs.statPromise(dirPath)) {
      await fs.mkdirPromise(dirPath)
    }
    log.info(`Writing '${outputAbsolutePath}'...`)
    await fs.writeFilePromise(outputAbsolutePath, json, 'utf8')

    log.info('Done.')
    return CliExitCodes.ERROR.NONE
  }

  // --------------------------------------------------------------------------

  // This version processes CMSIS-SVD v1.3.3 files
  // http://www.keil.com/pack/doc/CMSIS/SVD/html/svd_Format_pg.html

  createRoot (cnode) {
    // Used for development, to see the initial xml2json tree
    // return cnode
    const node = {}

    node.warning = 'DO NOT EDIT! Automatically generated from ' +
      this.inputFileName
    const generators = []
    node.generators = generators

    node.device = this.createDevice(cnode.device)

    return node
  }

  createDevice (cnode) {
    const log = this.log

    const device = {}

    if (cnode.$) {
      device.xml = cnode.$
    }

    if (cnode.vendor) {
      device.vendor = this.getFirst(cnode.vendor)
    }
    if (cnode.vendorID) {
      device.vendorID = this.getFirst(cnode.vendorID)
    }
    if (cnode.series) {
      device.series = this.getFirst(cnode.series)
    }
    device.name = this.getFirst(cnode.name)
    device.version = this.getFirst(cnode.version)
    device.description =
      this.filterDescription(this.getFirst(cnode.description))

    log.info(`Device ${device.name} ${device.version}`)

    if (cnode.licenseText) {
      device.licenseText = this.getFirst(cnode.licenseText)
    }

    if (cnode.cpu) {
      device.cpu = this.createCpu(this.getFirst(cnode.cpu))
    }

    if (cnode.headerSystemFilename) {
      device.headerSystemFilename = this.getFirst(cnode.headerSystemFilename)
    }

    if (cnode.headerDefinitionsPrefix) {
      device.headerDefinitionsPrefix =
        this.getFirst(cnode.headerDefinitionsPrefix)
    }

    device.addressUnitBits = this.getFirst(cnode.addressUnitBits)
    device.width = this.getFirst(cnode.width)

    this.createPropertiesGroup(device, cnode)

    device.peripherals = []
    this.getFirst(cnode.peripherals).peripheral.forEach((val) => {
      device.peripherals.push(this.createPeripheral(val))
    })

    return device
  }

  createCpu (cnode) {
    const cpu = {}

    cpu.name = this.getFirst(cnode.name)
    cpu.revision = this.getFirst(cnode.revision)
    cpu.endian = this.getFirst(cnode.endian)
    cpu.mpuPresent = this.getFirst(cnode.mpuPresent)
    cpu.fpuPresent = this.getFirst(cnode.fpuPresent)

    if (cnode.fpuDP) {
      cpu.fpuDP = this.getFirst(cnode.fpuDP)
    }

    if (cnode.icachePresent) {
      cpu.icachePresent = this.getFirst(cnode.icachePresent)
    }

    if (cnode.dcachePresent) {
      cpu.dcachePresent = this.getFirst(cnode.dcachePresent)
    }

    if (cnode.itcmPresent) {
      cpu.itcmPresent = this.getFirst(cnode.itcmPresent)
    }

    if (cnode.dtcmPresent) {
      cpu.dtcmPresent = this.getFirst(cnode.dtcmPresent)
    }

    if (cnode.vtorPresent) {
      cpu.vtorPresent = this.getFirst(cnode.vtorPresent)
    }

    if (cnode.nvicPrioBits) {
      cpu.nvicPrioBits = this.getFirst(cnode.nvicPrioBits)
    }

    if (cnode.vendorSystickConfig) {
      cpu.vendorSystickConfig = this.getFirst(cnode.vendorSystickConfig)
    }

    if (cnode.deviceNumInterrupts) {
      cpu.deviceNumInterrupts = this.getFirst(cnode.deviceNumInterrupts)
    }

    if (cnode.sauNumRegions) {
      cpu.sauNumRegions = this.getFirst(cnode.sauNumRegions)
    }

    if (cnode.sauRegionsConfig) {
      cpu.sauRegionsConfig =
        this.createRegionsConfig(this.getFirst(cnode.sauRegionsConfig))
    }

    return cpu
  }

  createRegionsConfig (cnode) {
    const regionsConfig = {}

    if (cnode.$) {
      if (cnode.$.enabled) {
        regionsConfig.enabled = this.getFirst(cnode.$.enabled)
      }
      if (cnode.$.protectionWhenDisabled) {
        regionsConfig.protectionWhenDisabled =
          this.getFirst(cnode.$.protectionWhenDisabled)
      }
    }

    if (cnode.region) {
      regionsConfig.regions = []
      cnode.region.forEach((val) => {
        regionsConfig.regions.push(this.createRegion(val))
      })
    }
    return regionsConfig
  }

  createRegion (cnode) {
    const region = {}

    if (cnode.$) {
      if (cnode.$.enabled) {
        region.enabled = this.getFirst(cnode.$.enabled)
      }
      if (cnode.$.name) {
        region.name = this.getFirst(cnode.$.name)
      }
    }

    region.base = this.getFirst(cnode.base)
    region.limit = this.getFirst(cnode.limit)
    region.access = this.getFirst(cnode.access)

    return region
  }

  createPropertiesGroup (outnode, cnode) {
    if (cnode.size) {
      outnode.size = this.getFirst(cnode.size)
    }
    if (cnode.access) {
      outnode.access = this.getFirst(cnode.access)
    }
    if (cnode.protection) {
      outnode.protection = this.getFirst(cnode.protection)
    }
    if (cnode.resetValue) {
      outnode.resetValue = this.getFirst(cnode.resetValue)
    }
    if (cnode.resetMask) {
      outnode.resetMask = this.getFirst(cnode.resetMask)
    }
  }

  createPeripheral (cnode) {
    const log = this.log

    const peripheral = {}

    peripheral.name = this.getFirst(cnode.name)

    if (cnode.$) {
      if (cnode.$.derivedFrom) {
        peripheral.derivedFrom = cnode.$.derivedFrom
      }
    }

    if (cnode.version) {
      peripheral.version = this.getFirst(cnode.version)
    }

    if (cnode.description) {
      peripheral.description =
        this.filterDescription(this.getFirst(cnode.description))
    }

    if (cnode.alternatePeripheral) {
      peripheral.alternatePeripheral = this.getFirst(cnode.alternatePeripheral)
    }

    if (cnode.groupName) {
      peripheral.groupName = this.getFirst(cnode.groupName)
    }

    if (cnode.prependToName) {
      peripheral.prependToName = this.getFirst(cnode.prependToName)
    }

    if (cnode.appendToName) {
      peripheral.appendToName = this.getFirst(cnode.appendToName)
    }

    if (cnode.headerStructName) {
      peripheral.headerStructName = this.getFirst(cnode.headerStructName)
    }

    if (cnode.disableCondition) {
      peripheral.disableCondition = this.getFirst(cnode.disableCondition)
    }

    if (cnode.baseAddress) {
      peripheral.baseAddress = this.getFirst(cnode.baseAddress)
    }

    log.verbose(`Peripheral ${peripheral.name} ${peripheral.baseAddress}`)

    this.createPropertiesGroup(peripheral, cnode)

    this.createDimElementGroup(peripheral, cnode)

    if (cnode.addressBlock) {
      // Plural
      peripheral.addressBlocks = []
      cnode.addressBlock.forEach((val) => {
        peripheral.addressBlocks.push(this.createAddressBlock(val))
      })
    }

    if (cnode.interrupt) {
      // Plural
      peripheral.interrupts = []
      cnode.interrupt.forEach((val) => {
        peripheral.interrupts.push(this.createInterrupt(val))
      })
    }

    if (cnode.registers) {
      if (cnode.registers[0].register) {
        peripheral.registers = []
        this.getFirst(cnode.registers).register.forEach((val) => {
          peripheral.registers.push(this.createRegister(val))
        })
      } else if (cnode.registers[0].cluster) {
        peripheral.clusters = []
        this.getFirst(cnode.registers).cluster.forEach((val) => {
          peripheral.clusters.push(this.createCluster(val))
        })
      }
    }

    return peripheral
  }

  createDimElementGroup (outnode, cnode) {
    if (outnode.dim) {
      outnode.dim = this.getFirst(cnode.dim)
      outnode.dimIncrement = this.getFirst(cnode.dimIncrement)

      if (cnode.dimIndex) {
        outnode.dimIndex = this.getFirst(cnode.dimIndex)
      }
      if (cnode.dimName) {
        outnode.dimName = this.getFirst(cnode.dimName)
      }
      if (cnode.resetValue) {
        outnode.resetValue = this.getFirst(cnode.resetValue)
      }
      if (cnode.resetMask) {
        outnode.resetMask = this.getFirst(cnode.resetMask)
      }

      if (cnode.dimArrayIndex) {
        outnode.dimArrayIndex =
          this.createDimArrayIndex(this.getFirst(cnode.dimArrayIndex))
      }
    }
  }

  createDimArrayIndex (cnode) {
    const dimArrayIndex = {}

    if (cnode.headerEnumName) {
      dimArrayIndex.headerEnumName = this.getFirst(cnode.headerEnumName)
    }

    // Plural
    dimArrayIndex.enumeratedValues = []
    cnode.enumeratedValue.forEach((val) => {
      dimArrayIndex.enumeratedValues.push(this.createEnumeratedValue(val))
    })

    return dimArrayIndex
  }

  createEnumeratedValue (cnode) {
    const enumeratedValue = {}

    if (cnode.name) {
      enumeratedValue.name = this.getFirst(cnode.name)
    }

    if (cnode.description) {
      enumeratedValue.description =
        this.filterDescription(this.getFirst(cnode.description))
    }

    if (cnode.value) {
      enumeratedValue.value = this.getFirst(cnode.value)
    } if (cnode.isDefault) {
      enumeratedValue.isDefault = this.getFirst(cnode.isDefault)
    }

    return enumeratedValue
  }

  createRegister (cnode) {
    const register = {}

    register.name = cnode.name[0]

    if (cnode.$ && cnode.$.derivedFrom) {
      register.derivedFrom = cnode.$.derivedFrom
    }

    if (cnode.displayName) {
      register.displayName = this.getFirst(cnode.displayName)
    }

    if (cnode.description) {
      register.description =
        this.filterDescription(this.getFirst(cnode.description))
    }

    if (cnode.alternateGroup) {
      register.alternateCluster = this.getFirst(cnode.alternateGroup)
    }

    if (cnode.alternateRegister) {
      register.headerStructName = this.getFirst(cnode.alternateRegister)
    }

    register.addressOffset = this.getFirst(cnode.addressOffset)

    this.createPropertiesGroup(register, cnode)

    if (cnode.dataType) {
      register.dataType = this.getFirst(cnode.dataType)
    }

    if (cnode.modifiedWriteValues) {
      register.modifiedWriteValues = this.getFirst(cnode.modifiedWriteValues)
    }

    if (cnode.writeConstraint) {
      register.writeConstraint = this.getFirst(cnode.writeConstraint)
    }

    if (cnode.readAction) {
      register.readAction = this.getFirst(cnode.readAction)
    }

    if (cnode.fields) {
      register.fields = []
      this.getFirst(cnode.fields).field.forEach((val) => {
        register.fields.push(this.createField(val))
      })
    }

    return register
  }

  createInterrupt (cnode) {
    const interrupt = {}

    interrupt.name = this.getFirst(cnode.name)

    if (cnode.description) {
      interrupt.description =
        this.filterDescription(this.getFirst(cnode.description))
    }

    interrupt.value = this.getFirst(cnode.value)

    return interrupt
  }

  createAddressBlock (cnode) {
    const addressBlock = {}

    addressBlock.offset = this.getFirst(cnode.offset)
    addressBlock.size = this.getFirst(cnode.size)
    addressBlock.usage = this.getFirst(cnode.usage)

    if (addressBlock.protection) {
      addressBlock.protection = this.getFirst(cnode.protection)
    }

    return addressBlock
  }

  createCluster (cnode) {
    const cluster = {}

    cluster.name = this.getFirst(cnode.name)

    if (cnode.$ && cnode.$.derivedFrom) {
      cluster.derivedFrom = cnode.$.derivedFrom
    }

    if (cnode.description) {
      cluster.description =
        this.filterDescription(this.getFirst(cnode.description))
    }

    if (cnode.alternateCluster) {
      cluster.alternateCluster = this.getFirst(cnode.alternateCluster)
    }

    if (cnode.headerStructName) {
      cluster.headerStructName = this.getFirst(cnode.headerStructName)
    }

    cluster.addressOffset = this.getFirst(cnode.addressOffset)

    this.createPropertiesGroup(cluster, cnode)

    this.createDimElementGroup(cluster, cnode)

    if (cnode.cluster) {
      cluster.clusters = []
      cnode.cluster.forEach((val) => {
        cluster.clusters.push(this.createCluster(val))
      })
    }

    if (cnode.register) {
      cluster.registers = []
      cnode.register.forEach((val) => {
        cluster.registers.push(this.createRegister(val))
      })
    }

    return cluster
  }

  createField (cnode) {
    const field = {}

    field.name = cnode.name[0]

    if (cnode.$ && cnode.$.derivedFrom) {
      field.derivedFrom = cnode.$.derivedFrom
    }

    if (cnode.description) {
      field.description =
        this.filterDescription(this.getFirst(cnode.description))
    }

    if (cnode.bitOffset) {
      field.bitOffset = this.getFirst(cnode.bitOffset)

      if (cnode.bitWidth) {
        field.bitWidth = this.getFirst(cnode.bitWidth)
      }
    } else if (cnode.lsb && cnode.msb) {
      // Deviate slightly from the policy of non-intervention,
      // Convert these to offset & width
      const lsb = parseInt(this.getFirst(cnode.lsb), 10)
      const msb = parseInt(this.getFirst(cnode.msb), 10)
      field.bitOffset = this.getFirst(cnode.lsb)
      field.bitWidth = String(msb - lsb + 1)
    } else if (cnode.bitRange) {
      field.bitRange = cnode.bitRange
    }

    if (cnode.access) {
      field.access = this.getFirst(cnode.access)
    }

    if (cnode.modifiedWriteValues) {
      field.modifiedWriteValues = this.getFirst(cnode.modifiedWriteValues)
    }

    if (cnode.writeConstraint) {
      field.writeConstraint = this.getFirst(cnode.writeConstraint)
    }

    if (cnode.readAction) {
      field.readAction = this.getFirst(cnode.readAction)
    }

    if (cnode.enumeratedValues) {
      field.enumeration =
        this.createEnumeratedValuesObject(this.getFirst(cnode.enumeratedValues))
    }

    return field
  }

  createEnumeratedValuesObject (cnode) {
    const enumeratedValuesObject = {}

    if (cnode.name) {
      enumeratedValuesObject.name = this.getFirst(cnode.name)
    }

    if (cnode.usage) {
      enumeratedValuesObject.usage = this.getFirst(cnode.usage)
    }

    enumeratedValuesObject.enumeratedValues = []
    cnode.enumeratedValue.forEach((val) => {
      enumeratedValuesObject.enumeratedValues.push(
        this.createEnumeratedValue(val))
    })

    return enumeratedValuesObject
  }

  // --------------------------------------------------------------------------

  filterDescription (str) {
    if (!str) {
      return undefined
    }

    str = str.replace(/\r\n/g, '\n')

    const arr = str.split('\n')
    if (arr.length > 1) {
      arr.forEach((item, index, arr) => {
        arr[index] = item.trim()
      })
      str = arr.join(' ')
    } else {
      str = str.trim()
    }

    if (str.length > 1) {
      return str.slice(0, 1).toUpperCase() + str.slice(1)
    } else {
      return str.toUpperCase()
    }
  }

  // --------------------------------------------------------------------------

  getFirst (object) {
    if (Array.isArray(object)) {
      if (object.length > 1) {
        this.log.warn(`array length ${object.length}`)
      }
      return object[0]
    }
    this.log.warn(`not an array`)
    return object
  }
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The Convert class is added as a property of this object.
module.exports.Convert = Convert

// In ES6, it would be:
// export class Convert { ... }
// ...
// import { Convert } from 'convert.js'

// ----------------------------------------------------------------------------
