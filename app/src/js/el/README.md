# el

Quick DOM elements creation in js


## Installing

```js
npm install --save el
````

## Usage

```js
import {el} from '@fxi/el';

el('div',
  el('canvas',{
    width: 300,
    height: 300,
    on : { 'click' : console.log }
  })
)

```

## See also

- [crel](https://github.com/KoryNunn/crel) A small, simple, and fast DOM creation utility. 
- [laconic](https://github.com/joestelmach/laconic) Laconic offers a sane solution to generating DOM content in JavaScript.


