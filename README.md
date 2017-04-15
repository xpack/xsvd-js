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

The module is available as [**xsvd**](https://www.npmjs.com/package/xsvd) from the public repository; use `npm` to install it:

```bash
$ npm install xsvd --global
```

The module provides the `xsvd` executable, which is a possible reason to install it globally.

The development repository is available from the GitHub [xpack/xsvd-js](https://github.com/xpack/xsvd-js) project.

## User info

To get an initial glimpse on the program, ask for help:

```bash
$ xsvd --help

The xPack SVD manager
Usage: xsvd <command> [<subcommand>...] [<options> ...] [<args>...]

where <command> is one of
  code, convert, patch

Common options:
  --loglevel <level>      Set log level (silent|warn|info|verbose|debug|trace)
  -s|--silent             Disable all messages (--loglevel silent)
  -q|--quiet              Mostly quiet (--loglevel warn)
  -v|--verbose            Informative verbose (--loglevel info)
  -vv                     Very verbose (--loglevel verbose, or -v -v)
  -d|--debug              Debug messages (--loglevel debug)
  -dd|--trace             Trace messages (--loglevel trace)
  -C <folder>             Set current folder

xsvd -h|--help            Quick help
xsvd <command> -h|--help  Quick help on command

xsvd --version            Show version 
xsvd -i|--interactive     Enter interactive mode 

npm xsvd@0.1.8 '/Users/ilg/My Files/MacBookPro Projects/xPack/npm-modules/xsvd-js.git'
Home page: <https://github.com/xpack/xsvd-js>
Bug reports: <https://github.com/xpack/xsvd-js/issues>
```

As shown, the `xsvd` application has multiple functionality, via several subcommands.

### Convert an ARM SVD file from XML to JSON

```bash
$ xsvd convert --help

Convert an ARM SVD file from XML to JSON
Usage: xsvd convert [options...] --file <file> --output <file>

Convert options:
  --file <file>           Input file in ARM SVD format 
  --output <file>         Output file in JSON format 

...
```

Example

```bash
$ xsvd convert -C ${HOME}/tmp --file STM32F0x1.svd --output STM32F0x1.json --verbose
Convert an ARM SVD file from XML to JSON
Reading '/tmp/STM32F0x1.svd'...
Parsing XML...
Converting to JSON...
Device STM32F0x1 1.0
Writing '/tmp/STM32F0x1.json'...
Done.
```

### Modify SVD JSON file using a JSON patch

```bash
$ xsvd patch -h

Modify SVD JSON file using a JSON patch
Usage: xsvd patch [options...] --file <file> --patch <file> --output <file>
                  [--group-bitfield <name>]* [--remove <name>]*

Patch options:
  --file <file>            Input file in JSON format
  --patch <file>           Patch file in JSON format
  --output <file>          Output file in JSON format
  --group-bitfield <name>  Group bitfields into a larger field (optional, multiple)
  --remove <name>          Remove nodes (optional, multiple)

...
```

Example

```bash
$ xsvd patch -C ${HOME}/tmp --file STM32F0x1.json --patch STM32F0x1-patch.json --output STM32F0x1-out.json --remove NVIC --verbose
Modify SVD JSON file using a JSON patch
Reading '/Users/ilg/tmp/STM32F0x1.json'...
Peripherals: ADC CAN CEC COMP CRC CRS DAC DBGMCU DMA1 DMA2 EXTI Flash GPIOA GPIOB GPIOC GPIOD GPIOE GPIOF I2C1 I2C2 IWDG NVIC PWR RCC RTC SPI1 SPI2 SYSCFG TIM1 TIM14 TIM15 TIM16 TIM17 TIM2 TIM3 TIM6 TIM7 TSC USART1 USART2 USART3 USART4 USART5 USART6 USART7 USART8 USB WWDG
Reading '/Users/ilg/tmp/STM32F0x1-patch.json'...
Patching...
Writing '/Users/ilg/tmp/STM32F0x1-out.json'...
Done.
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
$ npm install
$ npm test
```

The tests use the [`node-tap`](http://www.node-tap.org) framework (_A Test-Anything-Protocol library for Node.js_, written by Isaac Schlueter).

The continuous integration tests are performed with [Travis CI](https://travis-ci.org/xpack/xsvd-js).

### Standard compliance

The module uses ECMAScript 6 class definitions.

As style, it uses the [JavaScript Standard Style](https://standardjs.com/), automatically checked at each commit via Travis CI.

Known and accepted exceptions:

- none.

### Documentation metadata

The documentation metadata follows the [JSdoc](http://usejsdoc.org) tags.

To enforce checking at file level, add the following comments right after the `use strict`:

```
'use strict'
/* eslint valid-jsdoc: "error" */
/* eslint max-len: [ "error", 80, { "ignoreUrls": true } ] */
```

## License

The original content is released under the MIT License, with
all rights reserved to Liviu Ionescu.
