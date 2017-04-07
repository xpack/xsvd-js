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

// ----------------------------------------------------------------------------

const assert = require('assert')

// ES6: `import { CliCmd } from './utils/cli-app.js'
const CliCmd = require('../utils/cli-cmd.js').CliCmd

// ----------------------------------------------------------------------------

// TODO: support --option=[value]
// TODO: support abbreviations, as long as unique
// (GNU also recommends to support concatenated single letter options)

// ============================================================================

class Node {
  static add (parent, chr, path) {
    assert(parent !== null, 'Null parent.')

    for (let i = 0; i < parent.children.length; ++i) {
      let val = parent.children[i]
      if (val.chr === chr) {
        val.count += 1
        val.path = null
        return val
      }
    }

    const node = new Node(chr, path)
    parent.children.push(node)
    return node
  }

  constructor (chr, path) {
    this.chr = chr ? chr.toLowerCase() : null
    this.count = 1
    this.path = path
    this.children = []
  }
}

// ============================================================================

/**
 * @classdesc
 * Manage CLI options and commands. Keep an array of options and a tree
 * of commands.
 */
class CliOptions {
  // --------------------------------------------------------------------------

  static addCommand (cmds, path) {
    // Explicit upper case to know it is a class.
    const Self = this

    // Be sure the commands end with a space, and
    // multiple spaces are collapsed.
    const cmdsCured = (cmds + ' ').toLowerCase().replace(/\s+/, ' ')
    // With empty parameter, split works at character level.
    const arr = cmdsCured.split('')

    if (!Self._cmdTree) {
      Self._cmdTree = new Node(null, null)
    }

    let node = Self._cmdTree
    arr.forEach((val, index) => {
      node = Node.add(node, val, path)
    })

    if (!Self._cmdFirstArray) {
      Self._cmdFirstArray = []
    }
    Self._cmdFirstArray.push(cmdsCured.split(' ')[0])
  }

  // Preliminary solution with array instead of tree
  static addOptions (opt) {
    // Explicit upper case to know it is a class.
    const Self = this

    if (!Self._commonOptions) {
      Self._commonOptions = []
    }
    if (Array.isArray(opt)) {
      opt.forEach((val, index) => {
        Self._commonOptions.push(val)
      })
    } else {
      Self._commonOptions.push(opt)
    }
  }

  static getCommandsFirstArray () {
    // Explicit upper case to know it is a class.
    const Self = this

    return Self._cmdFirstArray
  }

  static getCommonOptions () {
    // Explicit upper case to know it is a class.
    const Self = this

    return Self._commonOptions
  }

  /**
   * @summary Parse options common to all commands.
   *
   * @param {string[]} argv Array of arguments.
   * @param {Object} config Reference to configuration object
   * @returns {undefined} Nothing.
   *
   * @description
   * Iterate argv, and try to match all known options.
   *
   * Identified options will add/update properties of an
   * existing configuration.
   */
  static parseCommonOptions (argv, config) {
    // Explicit upper case to know it is a class.
    const Self = this

    // Create a local copy of the array, filtering out possible
    // pass through options (after `--`).
    const args = []
    for (let i = 0; i < argv.length && argv[i] !== '--'; ++i) {
      args.push(argv[i])
    }

    // Iterate remaining argvs.
    // TODO: copy non processed options to an output array.
    for (let i = 0; i < args.length; ++i) {
      let arg = args[i]
      if (arg.startsWith('-')) {
        // If it starts with dash, it is an option.
        let processed = false
        // Try to find it in the list of known options.
        for (let j = 0; j < Self._commonOptions.length && !processed; ++j) {
          let opts = Self._commonOptions[j].options
          // Iterate all aliases.
          for (let k = 0; k < opts.length; ++k) {
            if (arg === opts[k]) {
              i += Self.processOption(args, i, Self._commonOptions[j], config)
              processed = true
              break
            }
          }
        }
      }
    }
  }

  /**
   * @summary Process an option.
   *
   * @param {string[]} args All input args.
   * @param {number} index Index of the current arg.
   * @param {Object} optionDef Reference to the current option definition.
   * @param {Object} config Reference to an output configuration.
   * @returns {number} 1 if the next arg should be skipped.
   *
   * @description
   * Processing the option means calling a function, that most probably
   * will add or update something in the configuration object.
   *
   * If the option has a separae value, it consumes it and informs
   * the caller to skip the next option.
   *
   * @todo process --opt=value syntax.
   */
  static processOption (args, index, optionDef, config) {
    const arg = args[index]
    let value = null
    // Values can be only an array, or null.
    // An array means the option takes a value.
    if (optionDef.hasValue || Array.isArray(optionDef.values)) {
      if (index < (args.length - 1)) {
        // Not the last option; engulf the next arg.
        value = args[index + 1]
        // args[index + 1].processed = true
      } else {
        // Error, expected option value not available.
        throw (new Error(`'${arg}' expects a value`))
      }
      if (Array.isArray(optionDef.values)) {
        // If a list of allowed values is present,
        // the option value must be validated.
        for (let i = 0; i < optionDef.values.length; ++i) {
          let allowedValue = optionDef.values[i]
          if (value === allowedValue) {
            // If allowed, call the action to set the
            // configuration value
            optionDef.action(config, value)
            // arg.processed = true
            return 1
          }
        }
        // Error, illegal option value
        throw (new Error(`Value '${value}' not allowed for '${arg}'`))
      } else {
        // Call the action to set the configuration value
        optionDef.action(config, value)
        // arg.processed = true
        return 1
      }
    } else {
      // No list of allowed values defined, call the action
      // to update the configuration.
      optionDef.action(config)
      // arg.processed = true
      return 0
    }
  }

  /**
   * @summary Get the base class of a class.
   *
   * @param {class} aClass Reference to a class object.
   * @returns {class|null} The base class or null.
   */
  static getBaseClass (aClass) {
    if (aClass instanceof Function) {
      let baseClass = aClass

      while (baseClass) {
        const newBaseClass = Object.getPrototypeOf(baseClass)

        if (newBaseClass && newBaseClass !== Object && newBaseClass.name) {
          baseClass = newBaseClass
        } else {
          break
        }
      }

      return baseClass
    }
    return null
  }

  /**
   * @summary Find a class that implements the commands.
   *
   * @param {string[]} cmds The commands, as entered.
   * @returns {class} A class that implements the given command.
   *
   * @description
   * Walk down the commands tree and return the first module path encountered.
   * This means when a substring is deemed unique.
   */
  static findCommandClass (cmds) {
    // Explicit upper case to know it is a class.
    const Self = this

    assert((Self._cmdFirstArray.length !== 0) && (Self._cmdTree !== null),
      'No commands defined yet.')

    // TODO: walk the tree.
    const str = cmds.join(' ')
    let modPath = null
    let node = Self._cmdTree
    for (let i = 0; i < str.length; ++i) {
      let chr = str.charAt(i)
      let found = null
      for (let j = 0; j < node.children.length; ++j) {
        if (chr === node.children[j].chr) {
          found = node.children[j]
          break
        }
      }
      if (!found) {
        return null
      }
      node = found
      if (node.path) {
        modPath = node.path
        break
      }
    }
    if (!modPath) {
      return null
    }
    let modex = null
    try {
      modex = require(`../${modPath}`)
    } catch (err) {
      // Module not found
      return null
    }

    // Return the first exported class derived from `CliCmd`.
    for (let prop in modex) {
      let obj = modex[prop]
      // Cannot use `instanceof` since we are not checking an instance,
      // but a class, the question would be `derivedfrom`, which does
      // not exist. A small loop to climb the hierarchy can do the job.
      while (obj) {
        if (obj === CliCmd) {
          return modex[prop]
        }
        obj = Self.getBaseClass(obj)
      }
    }
    return null
  }
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The CliOptions class is added as a property of this object.
module.exports.CliOptions = CliOptions

// In ES6, it would be:
// export class CliOptions { ... }
// ...
// import { CliOptions } from 'cli-options.js'

// ----------------------------------------------------------------------------
