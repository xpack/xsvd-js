[![npm (scoped)](https://img.shields.io/npm/v/xsvd.svg)](https://www.npmjs.com/package/xsvd) 
[![license](https://img.shields.io/github/license/xpack/xsvd-js.svg)](https://github.com/xpack/xsvd-js/blob/xpack/LICENSE) 
[![Standard](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com/)
[![Travis](https://img.shields.io/travis/xpack/xsvd-js.svg?label=linux)](https://travis-ci.org/xpack/xsvd-js)

## The xPack SVD manager

A Node.js CLI application to manage [SVD](http://www.keil.com/pack/doc/CMSIS/SVD/html/index.html) files.

## Prerequisites

A recent [Node.js](https://nodejs.org) (>7.x), since the ECMAScript 6 class syntax is used.

If this is the first time you hear about Node.js, download and install the binaries specific for your platform without any concerns, they're just fine.

## Easy install

The module is available as [**xsvd**](https://www.npmjs.com/package/xsvd) from the public repository; use `npm` to install it:

```bash
$ npm install xsvd --global
```

The module provides the `xsvd` executable, which is a possible reason to install it globally.

The development repository is available from the GitHub [xpack/xsvd-js](https://github.com/xpack/xsvd-js) project.

## User info

To get an initial glimpse on the program, ask for help:

```
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

```
$ xsvd convert --help

Convert an ARM SVD file from XML to JSON
Usage: xsvd convert [options...] --file <file> --output <file>

Convert options:
  --file <file>           Input file in ARM SVD format 
  --output <file>         Output file in JSON format 

...
```

Example

```
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

```
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

```
$ xsvd patch -C ${HOME}/tmp --file STM32F0x1.json --patch STM32F0x1-patch.json --output STM32F0x1-qemu.json --remove NVIC --verbose
Modify SVD JSON file using a JSON patch
Reading '/Users/ilg/tmp/STM32F0x1.json'...
Peripherals: ADC CAN CEC COMP CRC CRS DAC DBGMCU DMA1 DMA2 EXTI Flash GPIOA GPIOB GPIOC GPIOD GPIOE GPIOF I2C1 I2C2 IWDG NVIC PWR RCC RTC SPI1 SPI2 SYSCFG TIM1 TIM14 TIM15 TIM16 TIM17 TIM2 TIM3 TIM6 TIM7 TSC USART1 USART2 USART3 USART4 USART5 USART6 USART7 USART8 USB WWDG
Reading '/Users/ilg/tmp/STM32F0x1-patch.json'...
Patching...
Writing '/Users/ilg/tmp/STM32F0x1-qemu.json'...
Done.
```

### Generate QEMU peripheral source files for a given family

To generate the QEMU source files, use the patched xSVD file; the header and source files for all peripherals are written to the destination folder.

For STM32 devices, the vendor/family/device definitions can be derived from the SVD device name, and are optional.

```
$ xsvd code -h

Generate QEMU peripheral source files for a given family
Usage: xsvd code [options...] --file <file> [--dest <folder>]
                 [--vendor-prefix <string>] [--device-family <string>]
                 [--device-selector <string>]

Code options:
  --file <file>               Input file in JSON format 
  --dest <folder>             Destination folder (optional, default SVD device name)
  --vendor-prefix <string>    Prefix, like STM32 (optional)
  --device-family <string>    Family, like F4 (optional)
  --device-selector <string>  Selector, like 40x (optional)

...
```

Example

```
$ xsvd code -C ${HOME}/tmp --file STM32F0x1-qemu.json --verbose
Generate QEMU peripheral source files for a given family
Reading '/Users/ilg/tmp/STM32F0x1-qemu.json'...
Peripherals: ADC CAN CEC COMP CRC CRS DAC DBGMCU DMA(DMA1) EXTI Flash GPIO(GPIOA) GPIO(GPIOF) I2C(I2C1) IWDG PWR RCC RTC SPI(SPI1) SYSCFG TIM1 TIM14 TIM15 TIM16 TIM2 TIM6 TSC USART(USART1) USB WWDG

Header file 'STM32F0x1/adc.h' written.
Source file 'STM32F0x1/adc.c' written.
Header file 'STM32F0x1/can.h' written.
Source file 'STM32F0x1/can.c' written.
Header file 'STM32F0x1/cec.h' written.
Source file 'STM32F0x1/cec.c' written.
Header file 'STM32F0x1/comp.h' written.
Source file 'STM32F0x1/comp.c' written.
Header file 'STM32F0x1/crc.h' written.
Source file 'STM32F0x1/crc.c' written.
Header file 'STM32F0x1/crs.h' written.
Source file 'STM32F0x1/crs.c' written.
Header file 'STM32F0x1/dac.h' written.
Source file 'STM32F0x1/dac.c' written.
Header file 'STM32F0x1/dbgmcu.h' written.
Source file 'STM32F0x1/dbgmcu.c' written.
Header file 'STM32F0x1/dma1.h' written.
Source file 'STM32F0x1/dma1.c' written.
Header file 'STM32F0x1/exti.h' written.
Source file 'STM32F0x1/exti.c' written.
Header file 'STM32F0x1/flash.h' written.
Source file 'STM32F0x1/flash.c' written.
Header file 'STM32F0x1/gpioa.h' written.
Source file 'STM32F0x1/gpioa.c' written.
Header file 'STM32F0x1/gpiof.h' written.
Source file 'STM32F0x1/gpiof.c' written.
Header file 'STM32F0x1/i2c1.h' written.
Source file 'STM32F0x1/i2c1.c' written.
Header file 'STM32F0x1/iwdg.h' written.
Source file 'STM32F0x1/iwdg.c' written.
Header file 'STM32F0x1/pwr.h' written.
Source file 'STM32F0x1/pwr.c' written.
Header file 'STM32F0x1/rcc.h' written.
Source file 'STM32F0x1/rcc.c' written.
Header file 'STM32F0x1/rtc.h' written.
Source file 'STM32F0x1/rtc.c' written.
Header file 'STM32F0x1/spi1.h' written.
Source file 'STM32F0x1/spi1.c' written.
Header file 'STM32F0x1/syscfg.h' written.
Source file 'STM32F0x1/syscfg.c' written.
Header file 'STM32F0x1/tim1.h' written.
Source file 'STM32F0x1/tim1.c' written.
Header file 'STM32F0x1/tim14.h' written.
Source file 'STM32F0x1/tim14.c' written.
Header file 'STM32F0x1/tim15.h' written.
Source file 'STM32F0x1/tim15.c' written.
Header file 'STM32F0x1/tim16.h' written.
Source file 'STM32F0x1/tim16.c' written.
Header file 'STM32F0x1/tim2.h' written.
Source file 'STM32F0x1/tim2.c' written.
Header file 'STM32F0x1/tim6.h' written.
Source file 'STM32F0x1/tim6.c' written.
Header file 'STM32F0x1/tsc.h' written.
Source file 'STM32F0x1/tsc.c' written.
Header file 'STM32F0x1/usart1.h' written.
Source file 'STM32F0x1/usart1.c' written.
Header file 'STM32F0x1/usb.h' written.
Source file 'STM32F0x1/usb.c' written.
Header file 'STM32F0x1/wwdg.h' written.
Source file 'STM32F0x1/wwdg.c' written.
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

The tests use the [`node-tap`](http://www.node-tap.org) framework (_A Test-Anything-Protocol library for Node.js_, written by Isaac Schlueter).

As for any `npm` package, the standard way to run the project tests is via `npm test`:

```bash
$ cd xsvd-js.git
$ npm install
$ npm test
```

A typical test result looks like:

```
$ npm run test

> xsvd@0.1.10 test /Users/ilg/My Files/MacBookPro Projects/xPack/npm-modules/xsvd-js.git
> standard && npm run test-tap -s

test/tap/cmd-code.js ................................ 40/40
test/tap/cmd-convert.js ............................. 43/43
test/tap/cmd-patch.js ............................... 46/46
test/tap/interactive.js ............................. 14/14
test/tap/module-invocation.js ......................... 9/9
test/tap/options-common.js .......................... 24/24
total ............................................. 176/176

  176 passing (12s)

  ok
```

To run a specific test with more verbose output, use `npm run tap`:

```
$ npm run tap test/tap/cmd-convert.js

> xsvd@0.1.10 tap /Users/ilg/My Files/MacBookPro Projects/xPack/npm-modules/xsvd-js.git
> tap --reporter=spec --timeout 300 "test/tap/cmd-convert.js"

test/tap/cmd-convert.js
  xsvd convert
    ✓ exit code
    ✓ has two errors
    ✓ has --file error
    ✓ has --output error
    ✓ has Usage

  xsvd convert -h
    ✓ exit code
    ✓ has enough output
    ✓ has title
    ✓ has Usage
    ✓ has convert options
    ✓ has --file
    ✓ has --output
    ✓ stderr empty

  xsvd con -h
    ✓ exit code
    ✓ has enough output
    ✓ has title
    ✓ has Usage
    ✓ stderr empty

  xsvd con --file xxx --output yyy
    ✓ exit code
    ✓ stdout empty
    ✓ ENOENT

  unpack
    ✓ STM32F0x0-convert.tgz unpacked into /var/folders/n7/kxqjc5zs4qs0nb44v1l2r2j00000gn/T/xsvd-convert
    ✓ chmod
    ✓ mkdir ro
    ✓ chmod ro

  xsvd con --file STM32F0x0.svd --output STM32F0x0.json
    ✓ exit code
    ✓ no output
    ✓ no errors
    ✓ read in
    ✓ json parsed
    ✓ has warning
    ✓ has device

  xsvd con --file STM32F0x0.svd --output STM32F0x0.json -v
    ✓ exit code
    ✓ done message
    ✓ no errors

  xsvd con --file STM32F0x0.svd --output ro/STM32F0x0.json -v
    ✓ exit code
    ✓ up to writing
    ✓ EACCES

  xsvd con -C ... --file STM32F0x0.svd --output ro/STM32F0x0.json -v
    ✓ exit code
    ✓ up to writing
    ✓ EACCES

  cleanup
    ✓ chmod
    ✓ tmpdir removed

  43 passing (4s)
```

### Coverage tests

Coverage tests are a good indication on how much of the source files is exercised by the tests. Ideally all source files should be covered 100%, for all 4 criteria (statements, branches, functions, lines).

To run the coverage tests, use `npm run test-coverage`:

```
$ npm run test-coverage

> xsvd@0.1.10 test-coverage /Users/ilg/My Files/MacBookPro Projects/xPack/npm-modules/xsvd-js.git
> tap --coverage --reporter=classic --timeout 600 "test/tap/*.js"

test/tap/cmd-code.js ................................ 40/40
test/tap/cmd-convert.js ............................. 43/43
test/tap/cmd-patch.js ............................... 46/46
test/tap/interactive.js ............................. 14/14
test/tap/module-invocation.js ......................... 9/9
test/tap/options-common.js .......................... 24/24
total ............................................. 176/176

  176 passing (22s)

  ok
-----------------------|----------|----------|----------|----------|----------------|
File                   |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
-----------------------|----------|----------|----------|----------|----------------|
All files              |    58.01 |     39.2 |     66.3 |    58.01 |                |
 bin                   |      100 |      100 |      100 |      100 |                |
  xsvd.js              |      100 |      100 |      100 |      100 |                |
 lib                   |      100 |      100 |      100 |      100 |                |
  main.js              |      100 |      100 |      100 |      100 |                |
 lib/utils             |    38.98 |    28.57 |       40 |    38.98 |                |
  asy.js               |    51.43 |       40 |    45.45 |    51.43 |... 122,137,147 |
  liquid-extensions.js |    20.83 |    16.67 |       25 |    20.83 |... 192,193,195 |
 lib/xsvd              |    59.03 |    40.69 |    71.05 |    59.03 |                |
  code.js              |    87.37 |    69.44 |    78.57 |    87.37 |... 299,311,314 |
  convert.js           |    54.44 |    36.41 |    63.89 |    54.44 |... 757,761,762 |
  patch.js             |    53.59 |    39.25 |    76.92 |    53.59 |... 494,497,501 |
-----------------------|----------|----------|----------|----------|----------------|
```

### Continuous Integration (CI)

The continuous integration tests are performed with [Travis CI](https://travis-ci.org/xpack/xsvd-js).

### Standard compliance

The module uses ECMAScript 6 class definitions.

As style, it uses the [JavaScript Standard Style](https://standardjs.com/), automatically checked at each commit via Travis CI.

Known and accepted exceptions:

- none.

To manually fix the compliance with the style guide (where possible):

```
$ npm run fix

> xsvd@0.1.10 fix /Users/ilg/My Files/MacBookPro Projects/xPack/npm-modules/xsvd-js.git
> standard --fix

```

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
