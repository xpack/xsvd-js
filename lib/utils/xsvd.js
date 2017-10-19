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

const CliErrorApplication = require('@ilg/cli-start-options')
  .CliErrorApplication

// ============================================================================

// export
class Xsvd {
  constructor (json) {
    this.json = json
  }

  validate () {
    if (!this.json.devices) {
      throw new CliErrorApplication(`Mandatory 'devices' missing.`)
    }
  }

  prepareTree (object = this.json, klass = null, parent = null) {
    const Self = this.constructor

    if (parent) {
      object.parent = parent
    }
    if (klass) {
      object.klass = klass
    }
    switch (klass) {
      case null:
        if (object.devices) {
          for (const [key, device] of Object.entries(object.devices)) {
            device.key = key
            this.prepareTree(device, 'device', null)
          }
        }
        break

      case 'device':
        if (object.peripherals) {
          for (const [key, peripheral] of Object.entries(object.peripherals)) {
            peripheral.key = key
            this.prepareTree(peripheral, 'peripheral', object)
          }
        }
        break

      case 'peripheral':
      case 'cluster':
        if (klass === 'peripheral') {
          object.absoluteAddress = Self.parseNonNegative(object.baseAddress)
          if (object.size) {
            object.size = Self.parseNonNegative(object.size)
          }
        } else if (klass === 'cluster') {
          object.absoluteAddress = Self.parseNonNegative(object.addressOffset) +
            parent.absoluteAddress
        }

        let maxAbsoluteAddress = object.absoluteAddress
        if (object.clusters) {
          for (const key of Object.keys(object.clusters)) {
            this.processRepetitions(object.clusters, key)
          }

          for (const [key, cluster] of Object.entries(object.clusters)) {
            cluster.key = key
            this.prepareTree(cluster, 'cluster', object)
          }

          for (const cluster of Object.values(object.clusters)) {
            const endAddress = cluster.absoluteAddress + cluster.widthBytes
            if (endAddress > maxAbsoluteAddress) {
              maxAbsoluteAddress = endAddress
            }
          }
        }

        if (object.registers) {
          for (const key of Object.keys(object.registers)) {
            this.processRepetitions(object.registers, key)
          }

          for (const [key, register] of Object.entries(object.registers)) {
            register.key = key
            this.prepareTree(register, 'register', object)
          }

          for (const register of Object.values(object.registers)) {
            const endAddress = register.absoluteAddress + register.widthBytes
            if (endAddress > maxAbsoluteAddress) {
              maxAbsoluteAddress = endAddress
            }
          }
        }

        let delta = maxAbsoluteAddress - object.absoluteAddress
        if (object.repeatIncrement) {
          if (object.repeatIncrement > delta) {
            delta = object.repeatIncrement
          }
        }

        object.widthBytes = delta
        if (object.arraySize) {
          object.widthBytes *= object.arraySize
        }
        break

      case 'register':
        object.absoluteAddress = Self.parseNonNegative(object.addressOffset) +
          parent.absoluteAddress

        if (object.fields) {
          for (const key of Object.keys(object.fields)) {
            this.processRepetitions(object.fields, key)
          }

          for (const [key, field] of Object.entries(object.fields)) {
            field.key = key
            this.prepareTree(field, 'field', object)
          }
        }
        object.regWidth = Self.parseNonNegative(
          Self.getRecursiveValue(object, 'regWidth', 32))
        object.widthBytes = object.regWidth / 8
        if (object.arraySize) {
          object.widthBytes *= object.arraySize
        }
        // Ignore repeatIncrement for registers.
        break

      case 'field':
        break

      default:
        break
    }
  }

  expandGenerator (str) {
    const arr = str.split(',')
    // TODO process ranges (numbers and letters)
    return arr
  }

  clone (object) {
    return JSON.parse(JSON.stringify(object))
  }

  processRepetitions (parent, key) {
    const Self = this.constructor
    const object = parent[key]

    let displayName = object.displayName || key
    object.typeName = displayName

    if (object.arraySize) {
      object.displayName = displayName
    } else if (object.repeatGenerator) {
      if (!displayName.includes('%s')) {
        displayName = displayName + '%s'
      }
      object.typeName = displayName.replace('%s', '')

      const suffixes = this.expandGenerator(object.repeatGenerator)
      for (const suffix of suffixes) {
        const clone = this.clone(object)

        clone.displayName = displayName.replace('%s', suffix)
        delete clone.repeatGenerator
        parent[clone.displayName] = clone
      }

      delete parent[key]
    }

    if (object.repeatIncrement) {
      // Convert the increment to number, to simplify further processing.
      object.repeatIncrement = Self.parseNonNegative(object.repeatIncrement)
    }
  }

  static parseNonNegative (str) {
    if (str.startsWith('0x') || str.startsWith('0X')) {
      return parseInt(str.substr(2), 16)
    } else {
      return parseInt(str)
    }
  }

  static getRecursiveValue (object, property, default_ = null) {
    const Self = this

    if (object[property]) {
      return object[property]
    }
    if (object.parent) {
      return Self.getRecursiveValue(object.parent, property)
    }

    return default_
  }

  static getNameWithParents (object, joiner = '_') {
    let name = object.typeName || object.groupName || object.displayName ||
      object.key
    if (object.klass === 'peripheral') {
      return name
    }
    do {
      object = object.parent
      name = `${object.typeName || object.groupName || object.displayName ||
        object.key}${joiner}${name}`
    } while (object.klass !== 'peripheral')

    return name
  }
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The Xsvd class is added as a property of this object.
module.exports.Xsvd = Xsvd

// In ES6, it would be:
// export class Xsvd { ... }
// ...
// import { Xsvd } from 'utils/xsvd.js'

// ----------------------------------------------------------------------------
