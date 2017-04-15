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
 * The `xsvd patch <options> ...` command implementation.
 */

// ----------------------------------------------------------------------------

const fs = require('fs')
const path = require('path')

// TODO: extract to a separate module
const Promisifier = require('../utils/asy.js')

// ES6: `import { CliCommand, CliExitCodes } from 'cli-start-options'
const CliCommand = require('@ilg/cli-start-options').CliCommand
const CliExitCodes = require('@ilg/cli-start-options').CliExitCodes
const CliError = require('@ilg/cli-start-options').CliError
const CliErrorApplication = require('@ilg/cli-start-options').CliError

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
class Patch extends CliCommand {
  // --------------------------------------------------------------------------

  /**
   * @summary Constructor, to set help definitions.
   *
   * @param {Object} context Reference to a context.
   */
  constructor (context) {
    super(context)

    // Title displayed with the help message.
    this.title = 'Modify SVD JSON file using a JSON patch'
    this.optionGroups = [
      {
        title: 'Patch options',
        optionDefs: [
          {
            options: ['--file'],
            action: (context, val) => {
              context.config.inputPath = val
            },
            msg: 'Input file in JSON format',
            param: 'file',
            isMandatory: true
          },
          {
            options: ['--patch'],
            action: (context, val) => {
              context.config.patchPath = val
            },
            msg: 'Patch file in JSON format',
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
          },
          {
            options: ['--group-bitfield'],
            action: (context, val) => {
              context.config.groupBitFields.push(val)
            },
            msg: 'Group bitfields into a larger field',
            param: 'name',
            isOptional: true,
            isMultiple: true
          },
          {
            options: ['--remove'],
            action: (context, val) => {
              context.config.removeNodes.push(val)
            },
            msg: 'Remove nodes',
            param: 'name',
            isOptional: true,
            isMultiple: true
          }
        ]
      }
    ]

    const config = context.config

    // Initialise empty arrays to receive configuration.
    config.groupBitFields = []
    config.removeNodes = []
  }

  /**
   * @summary Execute the `patch` command.
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

    const svd = JSON.parse(inputData)

    this.validate(svd)
    this.reorderNodes(svd.device)

    const periphArray = []
    svd.device.peripherals.forEach((periph) => {
      periphArray.push(periph.name)
    })
    log.info(`Peripherals: ${periphArray.join(' ')}`)

    const patchAbsolutePath = this.makePathAbsolute(config.patchPath)
    log.info(`Reading '${patchAbsolutePath}'...`)

    let patchData
    try {
      patchData = await fs.readFilePromise(patchAbsolutePath, 'utf8')
    } catch (err) {
      throw new CliError(err.message, CliExitCodes.ERROR.INPUT)
    }

    const patch = JSON.parse(patchData)

    this.patchSvd(svd, patch)
    this.addGenerator(svd)

    const jsonOutput = JSON.stringify(svd, null, '\t')

    const outputAbsolutePath = this.makePathAbsolute(config.outputPath)
    const folderPath = path.dirname(outputAbsolutePath)

    log.info(`Writing '${outputAbsolutePath}'...`)
    try {
      if (!await fs.statPromise(folderPath)) {
        await fs.mkdirPromise(folderPath)
      }
      await fs.writeFilePromise(outputAbsolutePath, jsonOutput, 'utf8')
    } catch (err) {
      throw new CliError(err.message, CliExitCodes.ERROR.OUTPUT)
    }

    log.info('Done.')
    return CliExitCodes.SUCCESS
  }

  // --------------------------------------------------------------------------

  validate (svd) {
    if (!svd.device) {
      throw new CliErrorApplication(`Mandatory 'device' missing.`)
    }
    if (!svd.device.peripherals) {
      throw new CliErrorApplication(`Mandatory 'device.peripherals' missing.`)
    }
  }

  reorderNodes (node) {
    if (node.peripherals) {
      node.peripherals.sort((f1, f2) => {
        // Return a negative value if f1 < f2; compare names.
        if (f1.name < f2.name) {
          return -1
        } else if (f1.name > f2.name) {
          return 1
        } else {
          return 0
        }
      })
      node.peripherals.forEach(peripheral => {
        this.reorderNodes(peripheral)
      })
    }
    if (node.registers) {
      node.registers.forEach(reg => {
        this.reorderNodes(reg)
      })
    }
    if (node.fields) {
      node.fields.sort((f1, f2) => {
        // Return a negative value if f1 < f2; compare bit offsets.
        return parseInt(f1.bitOffset, 10) - parseInt(f2.bitOffset, 10)
      })
    }
  }

  patchSvd (svd, patch) {
    const log = this.log
    const config = this.context.config

    if (!svd.device || !svd.device.name || !svd.generators) {
      throw new CliErrorApplication('Input file not a SVD.')
    }
    if (!patch.device || !patch.device.name) {
      throw new CliErrorApplication('Patch file not a SVD.')
    }

    if (svd.device.name !== patch.device.name) {
      throw new CliErrorApplication('Patch refer to different device.')
    }

    log.info('Patching...')
    log.verbose()
    log.verbose('Changes:')

    config.removeNodes.forEach(path => {
      const [element, index, array] = this.findObject(svd, path.split('/'))
      if (element) {
        log.verbose(`- node '${path}' removed`)
        array.splice(index, 1)
      }
    })

    if (patch.device.cpu) {
      // Possibly patch the cpu object.
      if (!svd.device.cpu) {
        // It is not present at all, copy entirely object.
        svd.device.cpu = patch.device.cpu
        log.verbose(`- 'cpu' added from patch`)
      } else {
        for (let key in patch.device.cpu) {
          if (!svd.device.cpu[key]) {
            // Copy only missing properties.
            svd.device.cpu[key] = patch.device.cpu[key]
            log.verbose(`cpu.${key} added.`)
          }
        }
      }
    }

    this.compareAndUpdate(patch.device, svd.device)

    for (let i = 0; i < config.groupBitFields.length; ++i) {
      this.doGroupBitfield(svd, config.groupBitFields[i])
    }
  }

  doGroupBitfield (svd, path) {
    const log = this.log

    const pa = path.split('/')
    if (pa.length < 2) {
      log.warn(`Path ${path} must be at least two levels deep.`)
      return null
    }
    const bitfieldName = pa.pop()
    const pathPrefix = pa.join('/') + '/'

    const [ register, , ] = this.findObject(svd, pa.slice())

    if (register.fields) {
      let minOffset = 32
      let maxOffset = 0
      let preservedField = null

      for (let i = 0; i < register.fields.length; ++i) {
        const field = register.fields[i]
        const re = new RegExp(bitfieldName + '[0-9]+')
        if (field.name.match(re)) {
          const fullName = pathPrefix + field.name

          // ctx.console.log(field.name)
          if (field.bitWidth !== '1') {
            log.warn(`Field ${field} has bitWidth != 1.`)
            return null
          }

          if (preservedField) {
            if (field.access !== preservedField.access) {
              log.warn(`Field ${fullName} has different access.`)
            }
          }

          const offset = parseInt(field.bitOffset, 10)
          if (offset < minOffset) {
            minOffset = offset
          }
          if (offset > maxOffset) {
            maxOffset = offset
          }

          if (preservedField) {
            // Remove subsequent fields in the same group

            register.fields.splice(i, 1)
            i--
          } else {
            preservedField = field
          }
        }
      }
      // const prevName = pathPrefix + preservedField.name
      preservedField.name = bitfieldName
      preservedField.bitOffset = minOffset.toString()
      preservedField.bitWidth = (maxOffset - minOffset + 1).toString()
      const name = pathPrefix + bitfieldName
      // ctx.console.log(`- field ${prev_name} renamed ${name} and
      // grouped from ${maxOffset - minOffset + 1 } single bit fields`)
      log.verbose(`- field ${name} grouped from ${maxOffset - minOffset + 1} ` +
        `single bit fields`)
    } else {
      return null
    }
  }

  // Find peripherals, register, bitfields.
  // Return a triplet [value, index, array] or null
  findObject (svdNode, pathArray, depth = 0) {
    const name = pathArray[0]
    pathArray.splice(0, 1)

    if (svdNode.device && svdNode.device.peripherals) {
      // Search peripherals
      const peripherals = svdNode.device.peripherals
      for (let i = 0; i < peripherals.length; ++i) {
        const peripheral = peripherals[i]
        if (peripheral.name === name) {
          if (pathArray.length === 0) {
            return [peripheral, i, peripherals]
          } else {
            return this.findObject(peripheral, pathArray, depth + 1)
          }
        }
      }
    }

    if (svdNode.registers) {
      for (let i = 0; i < svdNode.registers.length; ++i) {
        const register = svdNode.registers[i]
        if (register.name === name) {
          if (pathArray.length === 0) {
            return [register, i, svdNode.registers]
          } else {
            return this.findObject(register, pathArray, depth + 1)
          }
        }
      }
    }

    if (svdNode.fields) {
      for (let i = 0; i < svdNode.fields.length; ++i) {
        const field = svdNode.fields[i]
        if (field.name === name) {
          if (pathArray.length === 0) {
            return [field, i, svdNode.fields]
          } else {
            return this.findObject(field, pathArray, depth + 1)
          }
        }
      }
    }
    return [null]
  }

  // Compare trees and update.
  // Only qemuAlignment and qemuGroupName are processed.

  compareAndUpdate (patchNode, svdNode, depth = 0) {
    const log = this.log
    if (patchNode.qemuAlignment && !svdNode.qemuAlignment) {
      svdNode.qemuAlignment = patchNode.qemuAlignment
      log.verbose(`- qemuAlignment: '${patchNode.qemuAlignment}' ` +
        `added to ${patchNode.name}`)
    }

    if (patchNode.qemuGroupName && !svdNode.qemuGroupName) {
      svdNode.qemuGroupName = patchNode.qemuGroupName
      log.verbose(`- qemuGroupName: '${patchNode.qemuGroupName}' ` +
        `added to ${patchNode.name}`)
    }

    if (patchNode.peripherals) {
      if (svdNode.peripherals) {
        // Search peripherals
        const peripherals = patchNode.peripherals
        for (let i = 0; i < peripherals.length; ++i) {
          const peripheral = peripherals[i]
          const periphName = peripheral.name
          if (periphName) {
            const svdPeriph = svdNode.peripherals.find(periph => {
              return periph.name === periphName
            })
            if (svdPeriph) {
              this.compareAndUpdate(peripheral, svdPeriph, depth + 1)
            }
          } else {
            log.info(`* peripheral node has no name.`)
          }
        }
      } else {
        log.info(`* node ${patchNode.name} has no peripherals.`)
      }
    }

    if (patchNode.registers) {
      if (svdNode.registers) {
        // Search peripherals
        const registers = patchNode.registers
        for (let i = 0; i < registers.length; ++i) {
          const register = registers[i]
          const registerName = register.name
          if (registerName) {
            const svdRegister = svdNode.registers.find((register) => {
              return register.name === registerName
            })
            if (svdRegister) {
              this.compareAndUpdate(register, svdRegister, depth + 1)
            }
          } else {
            log.info(`* register node has no name.`)
          }
        }
      } else {
        log.info(`* node ${patchNode.name} has no registers.`)
      }
    }
  }
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The Convert class is added as a property of this object.
module.exports.Patch = Patch

// In ES6, it would be:
// export class Patch { ... }
// ...
// import { Patch } from 'patch.js'

// ----------------------------------------------------------------------------
