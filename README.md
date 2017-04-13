[![npm (scoped)](https://img.shields.io/npm/v/xsvd.svg)](https://www.npmjs.com/package/xsvd) 
[![license](https://img.shields.io/github/license/xpack/xsvd-js.svg)](https://github.com/xpack/xsvd-js/blob/xpack/LICENSE) 
[![Standard](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com/)
[![Travis](https://img.shields.io/travis/xpack/xsvd-js.svg?label=linux)](https://travis-ci.org/xpack/xsvd-js)

## The xPack SVD manager

A Node.js CLI application to manage [SVD](http://www.keil.com/pack/doc/CMSIS/SVD/html/index.html) files.

## Prerequisites

A recent [Node.js](https://nodejs.org) (>7.x), since the ECMAScript 6 class syntax is used.

If this is the first time you hear about Node.js, download and install the the binaries specific for your platform without any concerns, they're just fine.

## Easy install

The module is available as [**xsvd**](https://www.npmjs.com/package/xsvd) from the public repository, use `npm` to install it:

```bash
$ npm install xsvd --global
```

The module provides the `xsvd` executable, which is a possible reason to install it globally.

The development repository is available from the GitHub [xpack/xsvd-js](https://github.com/xpack/xsvd-js) project.

## User info

The `xsvd` application has multiple functionality, via several subcommands:

```bash
$ xsvd convert [options...] --file <file> --output <file>
$ xsvd patch [options...] --file <file> --patch <file> --output <file>
             [--group-bitfield <name>]* [--remove <name>]*
$ xsvd code [options...] --file <file> --dest <folder>
             --vendor-prefix <string> --device-family <string>
             --device-selector <string>
```

## Developer info

### Git repo

```bash
$ git clone https://github.com/xpack/xsvd-js.git xsvd-js.git
$ cd xsvd-js.git
$ npm install
```

### Tests

As for any `npm` package, the standard way to run the project tests is via `npm test`:

```bash
$ cd xsvd-js.git
$ npm test
```

The tests use the [`node-tap`](http://www.node-tap.org) framework ('A Test-Anything-Protocol library for Node.js', written by Isaac Schlueter).

The continuous integration tests are performed with [Travis CI](https://travis-ci.org/xpack/xsvd-js).

### Standard compliance

The module uses ECMAScript 6 class definitions.

As style, it uses the [JavaScript Standard Style](https://standardjs.com/), automatically checked at each commit via Travis CI.

Known and accepted exceptions:

- none.

### Documentation metadata

The documentation metadata follows the [JSdoc](http://usejsdoc.org) tags.

To enforce checking at file level, add the following comment to each file:

```
'use strict'
/* eslint valid-jsdoc: "error" */
/* eslint max-len: [ "error", 80, { "ignoreUrls": true } ] */
```

## License

The original content is released under the MIT License, with
all rights reserved to Liviu Ionescu.
