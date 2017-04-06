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

const path = require('path')

// ============================================================================

class CliHelp {
  // --------------------------------------------------------------------------

  constructor (ctx) {
    this.context = ctx
  }

  outputCommands (commands) {
    let console = this.context.console
    let pgmName = this.context.pgmName
    // Deep copy
    let cmds = commands.slice()
    cmds.sort()
    let pkgJson = this.context.package

    console.log()
    console.log(`${pkgJson.description}`)
    console.log(`Usage: ${pgmName} <command> [<subcommand>...] [<options> ...] [<args>...]`)
    console.log()
    console.log('where <command> is one of:')
    let buf = null
    for (let i = 0; i < cmds.length; ++i) {
      if (buf === null) {
        buf = '   '
      }
      buf += cmds[i]
      if (i !== (cmds.length - 1)) {
        buf += ', '
      }
      if (buf.length > 70) {
        console.log(buf)
        buf = null
      }
    }
    if (buf != null) {
      console.log(buf)
      buf = null
    }
  }

  static padRight (str, n) {
    str += ' '.repeat(n)
    return str.substr(0, n)
  }

  outputHelpDetails (args, more) {
    let console = this.context.console
    let pgmName = this.context.pgmName

    let s1 = `${pgmName} -h|--help`
    let s2 = `${pgmName} <command> -h|--help`
    if (more.isFirstPass) {
      if (s1.length > more.width) {
        more.width = s1.length
      }
      if (s2.length > more.width) {
        more.width = s2.length
      }
    } else {
      console.log()
      console.log(`${CliHelp.padRight(s1, more.width)} quick help`)
      console.log(`${CliHelp.padRight(s2, more.width)} quick help on command`)
    }
  }

  outputEarlyDetails (args, more) {
    let console = this.context.console
    let pgmName = this.context.pgmName

    if (!more.isFirstPass) {
      console.log()
    }

    args.forEach((val, index) => {
      if (val.msg && val.doProcessEarly) {
        let opt = `${pgmName} `
        val.options.forEach((val2, index2) => {
          opt += val2
          if (index2 < (val.options.length - 1)) {
            opt += '|'
          }
        })
        if (more.isFirstPass) {
          if (opt.length > more.width) {
            more.width = opt.length
          }
        } else {
          if (more.width >= more.limit) {
            console.log(opt)
            opt = ''
          }
          opt += ' '.repeat(more.width)
          let desc = ''
          if (val.msg) {
            desc = val.msg + ' '
          }
          console.log(`${CliHelp.padRight(opt, more.width)} ${desc}`)
        }
      }
    })
  }

  outputCommonOptions (args, more) {
    let console = this.context.console

    if (!more.isFirstPass) {
      console.log()
      console.log('Common options:')
    }

    args.forEach((val, index) => {
      if (val.msg && !val.doProcessEarly && !val.isHelp) {
        let opt = '  '
        val.options.forEach((val2, index2) => {
          opt += val2
          if (index2 < (val.options.length - 1)) {
            opt += '|'
          }
        })
        if (val.hasValue || val.values) {
          if (val.param) {
            opt += ` <${val.param}>`
          } else {
            opt += ' <s>'
          }
        }

        if (more.isFirstPass) {
          if (opt.length > more.width) {
            more.width = opt.length
          }
        } else {
          if (more.width >= more.limit) {
            console.log(opt)
            opt = ''
          }
          opt += ' '.repeat(more.width)
          let desc = ''
          if (val.msg.length > 0) {
            desc = val.msg + ' '
          }
          if (Array.isArray(val.values)) {
            desc += '('
            val.values.forEach((val3, index3) => {
              desc += val3
              if (index3 < (val.values.length - 1)) {
                desc += '|'
              }
            })
            desc += ')'
          }
          console.log(`${CliHelp.padRight(opt, more.width)} ${desc}`)
        }
      }
    })
  }

  outputFooter () {
    let console = this.context.console
    let pkgJson = this.context.package

    // TODO: display package name, version and location
    console.log()
    let pkgPath = path.dirname(__dirname)
    console.log(`npm ${pkgJson.name}@${pkgJson.version} '${pkgPath}'`)
    if (pkgJson.homepage) {
      console.log(`Home page: <${pkgJson.homepage}>`)
    }
    let br = 'Bug reports:'
    if (pkgJson.bugs.url) {
      console.log(`${br} <${pkgJson.bugs.url}>`)
    } else if (pkgJson.author) {
      if (typeof pkgJson.author === 'object') {
        console.log(`${br} ${pkgJson.author.name} <${pkgJson.author.email}>`)
      } else if (typeof pkgJson.author === 'string') {
        console.log(`${br} ${pkgJson.author}`)
      }
    }
  }

  outputMainHelp (cmds, args) {
    this.outputCommands(cmds)

    // The special trick here is how to align the right column.
    // For this two steps are needed, with the first to compute
    // the max width of the first column, and then to output text.

    let more = {
      isFirstPass: true,
      width: 0,
      limit: 40
    }

    this.outputHelpDetails(args, more)
    this.outputEarlyDetails(args, more)
    this.outputCommonOptions(args, more)

    // Second step.
    more.isFirstPass = false
    // One more is implicit, so a total 2 spaces between columns.
    more.width += 1

    if (more.width > more.limit) {
      more.width = more.limit
    }

    // Output various sections.
    this.outputHelpDetails(args, more)
    this.outputEarlyDetails(args, more)
    this.outputCommonOptions(args, more)
    this.outputFooter()
  }
}

// ----------------------------------------------------------------------------
// Node.js specific export definitions.

// By default, `module.exports = {}`.
// The CliHelp class is added as a property of this object.
module.exports.CliHelp = CliHelp

// In ES6, it would be:
// export class CliHelp { ... }
// ...
// import { CliHelp } from 'cli-help.js'

// ----------------------------------------------------------------------------
