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

    // TODO: No need for a separate device object, the Data Model is the json;
    // generate the View Model directly.
    this.prepareDevice(xsvd)
    const device = this.device

    const vm = {}
    const outputFileName = 'device-peripherals.h'
    vm.macroGuard = `${this.toIdentifier(device.vendor.name).toUpperCase()}_` +
      `${this.toIdentifier(device.name).toUpperCase()}_` +
      `${this.toIdentifier(outputFileName).toUpperCase()}_`

    vm.fileVersion = xsvd.json.headerVersion

    vm.deviceKey = device.name
    vm.deviceName = device.displayName

    vm.vendorKey = device.vendor.name
    vm.vendorName = device.vendor.displayName
    if (vm.vendorName.charAt(vm.vendorName.length - 1) === '.') {
      vm.vendorName = vm.vendorName.slice(0, -1)
    }

    vm.inputFileName = path.basename(config.inputPath)
    vm.inputFileVersion = xsvd.json.contentVersion

    vm.toolName = context.programName
    vm.toolVersion = context.package.version

    vm.isoDate = (new Date()).toISOString().substring(0, 10)

    vm.typedefs = []
    for (const typedef of device.typedefs) {
      const name = `${this.headerTypePrefix}${typedef.name}_t`
      // TODO: push dependencies
      vm.typedefs.push({
        name,
        members: typedef.members,
        lastAddress: typedef.lastAddress,
        description: typedef.description
      })
    }

    vm.enums = device.enums

    vm.structs = device.structs

    vm.memDefs = []
    for (const peripheral of device.peripherals) {
      const name = `${this.headerTypePrefix.toUpperCase()}` +
        `${peripheral.name.toUpperCase()}_BASE_ADDRESS`
      vm.memDefs.push({ name, value: peripheral.hexAddress })
    }

    vm.periphDefs = []
    for (const peripheral of device.peripherals) {
      const name = `${peripheral.name.toUpperCase()}`
      const value = `((${this.headerTypePrefix}` +
        `${peripheral.typeName}_t*) ` +
        `${this.headerTypePrefix.toUpperCase()}${name}_BASE_ADDRESS)`
      vm.periphDefs.push({ name, value })
    }

    if (device.interrupts.length > 0) {
      vm.interrupts = device.interrupts
    }

    vm.periphOffsets = device.periphOffsets

    vm.headerInterruptPrefix = this.headerInterruptPrefix
    vm.headerInterruptEnumPrefix = this.headerInterruptEnumPrefix
    vm.headerInterruptEnumPrefixUC =
      this.headerInterruptEnumPrefix.toUpperCase()

    vm.priorityBits = device.priorityBits
    vm.numPriorities = device.numPriorities
    vm.numInterrupts = device.numInterrupts

    const vh = await liquid.renderFile('device-peripherals-h.liquid', {
      vm: vm
    })

    const headerPath = path.resolve(codePath, outputFileName)
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
    // There is only one device per xsvd.
    const [deviceKey, xdevice] = Object.entries(xsvd.json.device)[0]
    this.headerTypePrefix = xdevice.headerTypePrefix || ''
    this.headerInterruptPrefix = xdevice.headerInterruptPrefix || ''
    this.headerInterruptEnumPrefix = xdevice.headerInterruptEnumPrefix || ''

    const device = {}
    this.device = device

    device.name = deviceKey
    device.displayName = xdevice.displayName || deviceKey
    device.vendor = xdevice.vendor

    this.addressWidthBytes = xdevice.busWidth / 8

    const structs = []
    device.structs = structs

    const typedefs = []
    device.typedefs = typedefs

    const enums = []
    device.enums = enums

    const peripherals = []
    device.peripherals = peripherals

    const interrupts = []
    device.interrupts = interrupts

    const periphOffsets = []
    device.periphOffsets = periphOffsets

    device.priorityBits = xdevice.priorityBits
    device.numPriorities = (1 << xdevice.priorityBits) - 1
    device.numInterrupts = xdevice.numInterrupts

    const peripheralKeys = Object.keys(xdevice.peripherals)
    peripheralKeys.sort((a, b) => {
      return xdevice.peripherals[a].absoluteAddress -
        xdevice.peripherals[b].absoluteAddress
    })
    for (const peripheralKey of peripheralKeys) {
      const xperipheral = xdevice.peripherals[peripheralKey]
      const address = xperipheral.absoluteAddress
      let name = xperipheral.displayName || peripheralKey

      this.prepareTypedefs(xperipheral)

      this.prepareStructs(xperipheral)

      this.prepareInterrupts(xperipheral)

      this.prepareOffsets(xperipheral)

      // Peripheral
      const peripheral = { key: peripheralKey, name, address }

      peripheral.description = xperipheral.description

      peripheral.hexAddress = this.toHex(address, this.addressWidthBytes)
      peripheral.typeName = xperipheral.groupName || peripheral.name

      peripherals.push(peripheral)
    }

    peripherals.sort((a, b) => {
      return a.address - b.address
    })

    interrupts.sort((a, b) => {
      return a.value - b.value
    })
  }

  prepareTypedefs (object) {
    assert(object, 'prepareTypedef(object)')

    switch (object.klass) {
      case 'peripheral':
        if (object.registers || object.clusters) {
          const name = object.groupName || object.displayName || object.key
          const typedef = { key: object.key, name }
          typedef.lastAddress = this.toHex(
            object.absoluteAddress + object.size - 1, this.addressWidthBytes)
          typedef.description = object.description

          typedef.members = this.prepareTypedefMembers(object)
          this.device.typedefs.push(typedef)
        }
        break

      case 'cluster':
        if (object.registers || object.clusters) {
          const name = Xsvd.getNameWithParents(object)
          const typedef = { key: object.key, name }
          typedef.lastAddress = this.toHex(
            object.absoluteAddress + object.widthBytes - 1,
            this.addressWidthBytes)
          typedef.description = object.description

          typedef.members = this.prepareTypedefMembers(object)
          this.device.typedefs.push(typedef)
        }
        break
    }
  }

  prepareTypedefMembers (object) {
    let members = []

    if (object.registers) {
      // Add existing registers.
      for (const [key, register] of Object.entries(object.registers)) {
        const member = {}
        member.name = register.displayName || key
        if (register.arraySize) {
          member.arraySize = `[${register.arraySize}]`
        }

        member.absoluteAddress = register.absoluteAddress
        member.address = this.toHex(register.absoluteAddress,
          this.addressWidthBytes)
        const access = Xsvd.getRecursiveValue(register, 'access')
        member.access = this.generateAccess(access)
        member.widthBytes = register.widthBytes
        member.type = `uint${register.regWidth}_t`
        member.description = register.description

        let mfields = []
        if (register.fields) {
          for (const [fkey, field] of Object.entries(register.fields)) {
            const fname = field.displayName || fkey
            const faccess = Xsvd.getRecursiveValue(field, 'access')
            const position = parseInt(field.bitOffset)
            const positionLast = position + parseInt(field.bitWidth) - 1
            mfields.push({
              name: fname,
              access: this.generateAccess(faccess),
              position,
              positionLast,
              width: parseInt(field.bitWidth),
              description: field.description
            })
          }
        }
        if (mfields.length > 0) {
          mfields.sort((a, b) => {
            return parseInt(a.position) - parseInt(b.position)
          })

          const reservedFields = []
          const ctx = {}
          ctx.reservedCount = 1

          const firstField = {}
          firstField.position = 0
          firstField.width = 0

          this.addReservedMemberField(firstField, mfields[0], ctx,
            reservedFields)
          for (let i = 1; i < mfields.length; ++i) {
            this.addReservedMemberField(mfields[i - 1], mfields[i], ctx,
              reservedFields)
          }

          const lastMember = {}
          lastMember.position = parseInt(register.regWidth)

          this.addReservedMemberField(mfields[mfields.length - 1], lastMember,
            ctx, reservedFields)

          if (reservedFields.length) {
            mfields = mfields.concat(reservedFields).sort((a, b) => {
              return parseInt(a.position) - parseInt(b.position)
            })
          }

          member.fields = mfields
        }
        members.push(member)
      }
    }

    if (object.clusters) {
      // Add existing clusters.

      for (const [key, cluster] of Object.entries(object.clusters)) {
        const member = {}
        member.name = cluster.displayName || key
        if (cluster.arraySize) {
          member.arraySize = `[${cluster.arraySize}]`
        }

        member.absoluteAddress = cluster.absoluteAddress
        member.widthBytes = cluster.widthBytes
        member.address = this.toHex(cluster.absoluteAddress,
          this.addressWidthBytes)

        const name = Xsvd.getNameWithParents(cluster)
        member.type = `${this.headerTypePrefix}${name}_t`
        member.access = '    '
        member.description = cluster.description

        members.push(member)

        this.prepareTypedefs(cluster)
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

    const firstMember = {}
    firstMember.absoluteAddress = object.absoluteAddress -
      members[0].widthBytes
    firstMember.widthBytes = members[0].widthBytes
    firstMember.arraySize = 1

    this.addReservedMember(firstMember, members[0], ctx,
      reservedMembers)
    for (let i = 1; i < members.length; ++i) {
      this.addReservedMember(members[i - 1], members[i], ctx, reservedMembers)
    }

    const lastMember = {}
    lastMember.absoluteAddress = object.absoluteAddress + object.size

    this.addReservedMember(members[members.length - 1], lastMember, ctx,
      reservedMembers)

    if (reservedMembers.length) {
      members = members.concat(reservedMembers).sort((a, b) => {
        return a.absoluteAddress - b.absoluteAddress
      })
    }
    return members
  }

  addReservedMemberField (prev, crt, ctx, reservedFields) {
    assert(prev, 'addReservedMemberField(prev)')
    assert(crt, 'addReservedMemberField(crt)')
    assert(ctx, 'addReservedMemberField(ctx)')
    assert(reservedFields, 'addReservedMemberField(reservedFields)')

    const newPosition = prev.position + prev.width
    const delta = crt.position - newPosition
    if (delta > 0) {
      const mfield = {}
      mfield.position = newPosition
      mfield.width = delta
      mfield.positionLast = newPosition + delta - 1

      mfield.access = '    '
      reservedFields.push(mfield)
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
      member.name = `reserved_${ctx.reservedCount}`
      ++ctx.reservedCount
      member.absoluteAddress = newAddr
      // member.address = this.toHex(newAddr, this.addressWidthBytes)

      member.access = '    '
      member.widthBytes = delta
      if ((newAddr % 8) === 0 && (delta % 8) === 0 &&
        prev.widthBytes === 8 && crt.widthBytes === 8) {
        // When surrounded by longs, and long aligned.
        member.type = `uint64_t`
        if ((delta / 8) > 1) {
          member.arraySize = `[${delta / 8}]`
        }
      } else if ((newAddr % 4) === 0 && (delta % 4) === 0) {
        member.type = `uint32_t`
        if ((delta / 4) > 1) {
          member.arraySize = `[${delta / 4}]`
        }
      } else {
        member.type = `uint8_t`
        if (delta > 1) {
          member.arraySize = `[${delta}]`
        }
      }
      // member.description = 'Reserved'
      reservedMembers.push(member)
    }
  }

  prepareStructs (object) {
    assert(object, 'prepareStructs(object)')

    switch (object.klass) {
      case 'peripheral':
      case 'cluster':
        if (object.clusters) {
          for (const cluster of Object.values(object.clusters)) {
            this.prepareStructs(cluster)
          }
        }

        this.prepareStructRegisters(object)
        break
    }
  }

  prepareStructRegisters (object) {
    const sname = Xsvd.getNameWithParents(object)
    const struct = { name: `${this.headerTypePrefix}${sname}_t` }

    struct.members = []
    if (object.registers) {
      for (const register of Object.values(object.registers)) {
        const rname = Xsvd.getNameWithParents(register, '.')
        const rstruct = { name: rname }
        rstruct.defs = this.prepareStructRegisterFields(register)
        if (rstruct.defs.length > 0) {
          struct.members.push(rstruct)
        }
      }
    }
    if (struct.members.length > 0) {
      this.device.structs.push(struct)
    }
  }

  prepareStructRegisterFields (object) {
    const fields = []
    if (object.fields) {
      for (const field of Object.values(object.fields)) {
        const name = this.toIdentifier(this.headerTypePrefix +
          Xsvd.getNameWithParents(field))
        const position = parseInt(field.bitOffset)
        const width = parseInt(field.bitWidth)
        const positionLast = position + width - 1
        const value = (2 ** width) - 1
        const fstruct = {
          name: `${name.toUpperCase()}`,
          position,
          positionLast,
          width,
          mask: `0x${value.toString(16).toUpperCase()}`,
          description: field.description
        }

        const enum_ = {
          name: `${name}_enum_t`,
          members: []
        }
        if (field.enumeration) {
          const enumerations = Object.values(field.enumeration)
          if (enumerations.length > 0) {
            enum_.description = enumerations[0].description
            const values = enumerations[0].values
            if (values) {
              const svalues = []
              for (const [key, value] of Object.entries(values)) {
                if (key !== '*') {
                  const vname = this.toIdentifier(value.displayName)
                    .toUpperCase()
                  svalues.push({
                    name: `${name.toUpperCase()}_${vname}`,
                    value: key,
                    description: value.description
                  })
                  const ename = this.toIdentifier(value.displayName)
                  enum_.members.push({
                    name: `${name}_${ename}`,
                    value: key,
                    description: value.description
                  })
                }
              }
              if (svalues.length > 0) {
                fstruct.values = svalues
              }
            }
          }
        }
        fields.push(fstruct)
        if (enum_.members.length > 0) {
          this.device.enums.push(enum_)
        }
      }
    }
    return fields
  }

  prepareInterrupts (object) {
    if (object.interrupts) {
      for (const [key, interrupt] of Object.entries(object.interrupts)) {
        const member = {
          name: key,
          value: parseInt(interrupt.value),
          description: interrupt.description
        }
        this.device.interrupts.push(member)
      }
    }
  }

  prepareOffsets (object) {
    const periph = {
      name: object.groupName || object.displayName || object.key
    }

    periph.offsets = []

    this.preparePeriphOffsets(object, object.absoluteAddress, periph.offsets)

    if (periph.offsets.length > 0) {
      periph.offsets.sort((a, b) => {
        return a.absoluteAddress - b.absoluteAddress
      })
      this.device.periphOffsets.push(periph)
    }
  }

  preparePeriphOffsets (object, absoluteAddress, offsets) {
    switch (object.klass) {
      case 'peripheral':
      case 'cluster':
        if (object.clusters) {
          for (const cluster of Object.values(object.clusters)) {
            this.preparePeriphOffset(cluster, absoluteAddress, offsets)

            this.preparePeriphOffsets(cluster, absoluteAddress, offsets)
          }
        }

        if (object.registers) {
          for (const register of Object.values(object.registers)) {
            this.preparePeriphOffsets(register, absoluteAddress, offsets)
          }
        }
        break

      case 'register':
        if (object.absoluteAddress) {
          this.preparePeriphOffset(object, absoluteAddress, offsets)
        }
        break
    }
  }

  preparePeriphOffset (object, absoluteAddress, offsets) {
    if (object.absoluteAddress) {
      const name = this.toIdentifier(this.headerTypePrefix +
        Xsvd.getNameWithParents(object)).toUpperCase()
      const delta = object.absoluteAddress - absoluteAddress
      const value = this.toHex(delta)
      const offset = {
        name,
        value,
        address: this.toHex(object.absoluteAddress),
        description: object.description,
        absoluteAddress: object.absoluteAddress
      }
      offsets.push(offset)
    }
  }

  // --------------------------------------------------------------------------

  toIdentifier (str) {
    assert(str, 'toIdentifier()')

    // Replace all non letters or digits by underscore.
    return str.replace(/[^\w]/, '_').replace('.', '_')
  }

  toHex (value, widthBytes = this.addressWidthBytes) {
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

  generateAccess (access) {
    if (access === 'rw') {
      return 'IO__'
    } else if (access === 'r') {
      return 'I__ '
    } else if (access === 'w') {
      return 'O__ '
    } else {
      return '??? '
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
