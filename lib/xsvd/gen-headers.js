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
const assert = require('assert')

// https://www.npmjs.org/package/liquidjs
const Liquid = require('liquidjs')

// const LiquidExtension = require('../utils/liquid-extensions.js')
//  .LiquidExtension

const Xsvd = require('../utils/xsvd.js').Xsvd

const Promisifier = require('@ilg/es6-promisifier').Promisifier

// ES6: `import { CliCommand, CliExitCodes, CliError, CliErrorApplication }
//   from 'cli-start-options'
const CliCommand = require('@ilg/cli-start-options').CliCommand
const CliExitCodes = require('@ilg/cli-start-options').CliExitCodes
const CliError = require('@ilg/cli-start-options').CliError
// const CliErrorApplication = require('@ilg/cli-start-options')
//  .CliErrorApplication

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

    const xsvd = new Xsvd(JSON.parse(inputData))

    xsvd.validate()

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

    xsvd.prepareTree()

    const device = this.prepareDevice(xsvd)

    const vm = {}

    vm.macroGuard = `${this.toIdentifier(device.vendor.name).toUpperCase()}_` +
      `${this.toIdentifier(device.name).toUpperCase()}_PERIPHERALS_H_`

    vm.deviceName = device.displayName
    vm.vendorName = device.vendor.fullName
    if (vm.vendorName.charAt(vm.vendorName.length - 1) === '.') {
      vm.vendorName = vm.vendorName.slice(0, -1)
    }

    vm.inputFileName = path.basename(config.inputPath)
    vm.inputFileVersion = xsvd.json.version

    vm.toolName = context.programName
    vm.toolVersion = context.package.version

    vm.isoDate = (new Date()).toISOString().substring(0, 10)

    vm.typedefs = []
    for (const typedef of device.typedefs) {
      const name = `riscv_device_${typedef.name}_t`
      // TODO: push dependencies
      vm.typedefs.push({
        name,
        members: typedef.members,
        lastAddress: typedef.lastAddress,
        description: typedef.description
      })
    }

    const sd = []
    sd.push({ name: 'PPB_ACTLR_DISMCYCINT_Pos', value: '0UL' })
    sd.push({ name: 'PPB_ACTLR_DISMCYCINT_Msk', value: '0x1UL' })

    const sm = []
    sm.push({ name: 'PPB_ACTLR', defs: sd })

    vm.structs = [] // device.structs
    vm.structs.push({ name: 'PPB', members: sm })

    vm.memDefs = []
    for (const peripheral of device.peripherals) {
      const name = `${peripheral.name.toUpperCase()}_BASE`
      vm.memDefs.push({name, value: peripheral.hexAddress})
    }

    vm.periphDefs = []
    for (const peripheral of device.peripherals) {
      const name = `${peripheral.name.toUpperCase()}`
      const value = `((riscv_device_${peripheral.typeName}_t*) ${name}_BASE)}`
      vm.periphDefs.push({name, value})
    }

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

  prepareDevice (xsvd) {
    // Get the first device
    // TODO: get by name?
    const dkey = Object.keys(xsvd.json.devices)[0]
    const xdevice = xsvd.json.devices[dkey]

    const device = {}
    device.name = dkey
    device.displayName = xdevice.displayName
    device.vendor = xdevice.vendor

    const addressWidthBytes = xdevice.busWidth / 8

    const structs = []
    const peripherals = []
    const typedefs = []
    for (const pkey of Object.keys(xdevice.peripherals)) {
      const xperipheral = xdevice.peripherals[pkey]
      // Add reference to parent device
      xperipheral.parent = xdevice
      const address = xperipheral.absoluteAddress
      let name = xperipheral.displayName || pkey

      this.prepareTypedef(xperipheral, 'peripheral', typedefs)

      if (xperipheral.registers) {
        // Struct
        name = xperipheral.groupName || name
        const struct = { key: pkey, name }
        struct.description = xperipheral.description

        structs.push(struct)
      }

      // Peripheral
      const peripheral = { key: pkey, name, address }

      peripheral.description = xperipheral.description

      peripheral.hexAddress = this.toHex(address, addressWidthBytes)
      peripheral.typeName = xperipheral.groupName || peripheral.name

      peripherals.push(peripheral)
    }
    const orderedPeripherals = peripherals.sort((a, b) => {
      return a.address - b.address
    })

    device.typedefs = typedefs
    device.structs = structs

    device.peripherals = orderedPeripherals
    return device
  }

  prepareTypedef (object, type, typedefs) {
    assert(object, 'prepareTypedef(object)')
    assert(type, 'prepareTypedef(type)')
    assert(typedefs, 'prepareTypedef(typedefs)')

    switch (type) {
      case 'peripheral':
        if (object.registers) {
          const busWidth = Xsvd.getRecursiveValue(object, 'busWidth')

          const name = object.groupName || object.displayName || object.key
          const typedef = { key: object.key, name }
          typedef.lastAddress = this.toHex(
            object.absoluteAddress + object.size - 1, busWidth / 8)
          typedef.description = object.description

          let members = []

          if (object.registers) {
            // Add existing registers.
            for (const [key, register] of Object.entries(object.registers)) {
              const member = {}
              member.name = register.displayName || key
              member.arraySize = register.arraySize || 1

              member.absoluteAddress = register.absoluteAddress
              member.address = this.toHex(register.absoluteAddress,
                busWidth / 8)
              const access = Xsvd.getRecursiveValue(register, 'access')
              if (access === 'rw') {
                member.access = '__IO'
              } else if (access === 'r') {
                member.access = '__I '
              } else if (access === 'w') {
                member.access = '__O '
              }
              member.widthBytes = register.widthBytes
              member.type = `uint${register.regWidth}_t`
              member.description = register.description

              members.push(member)
            }
          }

          if (object.clusters) {
            // Add existing clusters.
            let parentName = object.displayName || object.key
            let obj = object
            while (obj.klass !== 'peripheral') {
              parentName = (obj.displayName || obj.key) + parentName
              obj = obj.parent
            }
            for (const [key, cluster] of Object.entries(object.clusters)) {
              const member = {}
              member.name = cluster.displayName || key
              member.arraySize = cluster.arraySize || 1

              member.absoluteAddress = cluster.absoluteAddress
              member.widthBytes = cluster.widthBytes
              member.address = this.toHex(cluster.absoluteAddress,
                busWidth / 8)
              const typeName = cluster.typeName || cluster.displayName || key
              member.type = `riscv_device_${parentName}_${typeName}_t`
              member.description = cluster.description

              members.push(member)
            }
          }

          // Order members by address.
          members.sort((a, b) => {
            return a.absoluteAddress - b.absoluteAddress
          })

            // Turn group members with identical addresses int unions
          for (let i = 0; i < members.length; ++i) {
            const unionMembers = []
            unionMembers.push(JSON.parse(JSON.stringify(members[i])))
            for (let j = i + 1; j < members.length; ++j) {
              if (members[i].absoluteAddress === members[j].absoluteAddress) {
                unionMembers.push(members[j])
                members.splice(j--, 1)
              }
            }
            if (unionMembers.length > 1) {
              members.unionMembers = unionMembers
            }
          }

          // Identify holes and generate reserved members.
          const reservedMembers = []
          const ctx = {}
          ctx.reservedCount = 1
          ctx.busWidth = busWidth

          const firstMember = {}
          firstMember.absoluteAddress = object.absoluteAddress -
              members[0].widthBytes
          firstMember.widthBytes = members[0].widthBytes
          firstMember.arraySize = 1

          this.addReservedMember(firstMember, members[0], ctx,
              reservedMembers)
          for (let i = 1; i < members.length; ++i) {
            this.addReservedMember(members[i - 1], members[i], ctx,
                reservedMembers)
          }

          const lastMember = {}
          lastMember.absoluteAddress = object.absoluteAddress +
            object.size

          this.addReservedMember(members[members.length - 1], lastMember, ctx,
              reservedMembers)

          if (reservedMembers.length) {
            members = members.concat(reservedMembers).sort((a, b) => {
              return a.absoluteAddress - b.absoluteAddress
            })
          }

          typedef.members = members
          typedefs.push(typedef)
        }
    }
  }

  addReservedMember (prev, crt, ctx, reservedMembers) {
    assert(prev, 'addReservedMember(prev)')
    assert(crt, 'addReservedMember(crt)')
    assert(ctx, 'addReservedMember(ctx)')
    assert(reservedMembers, 'addReservedMember(reservedMembers)')

    const newAddr = prev.absoluteAddress + prev.widthBytes
    const delta = crt.absoluteAddress - newAddr
    if (delta > 0) {
      const member = {}
      member.name = `__reserved_${ctx.reservedCount}`
      ++ctx.reservedCount
      member.absoluteAddress = newAddr
      member.address = this.toHex(newAddr, ctx.busWidth / 8)

      member.access = '__I '
      member.widthBytes = delta
      if ((newAddr % 8) === 0 && (delta % 8) === 0 &&
        prev.widthBytes === 8 && crt.widthBytes === 8) {
        // When surrounded by longs, and long aligned.
        member.type = `uint64_t`
        if ((delta / 8) > 1) {
          member.name += `[${delta / 8}]`
        }
      } else if ((newAddr % 4) === 0 && (delta % 4) === 0) {
        member.type = `uint32_t`
        if ((delta / 4) > 1) {
          member.name += `[${delta / 4}]`
        }
      } else {
        member.type = `uint8_t`
        if (delta > 1) {
          member.name += `[${delta}]`
        }
      }
      member.description = 'Reserved'
      reservedMembers.push(member)
    }
  }

  toIdentifier (str) {
    assert(str, 'toIdentifier()')

    // Replace all non letters or digits by underscore.
    return str.replace(/[^\w]/, '_')
  }

  toHex (value, widthBytes) {
    assert(value, 'toHex()')

    const s = ('0'.repeat(16) + value.toString(16)).toUpperCase()
    return `0x${s.slice(-(widthBytes * 2))}`
  }

  parseNonNegative (str) {
    assert(str, 'parseNonNegative()')

    if (str.startsWith('0x') || str.startsWith('0X')) {
      return parseInt(str.substr(2), 16)
    } else {
      return parseInt(str)
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
