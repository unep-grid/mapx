
# ElementCreator

## Overview
ElementCreator is a JavaScript module designed to simplify the creation and management of DOM and SVG elements. It provides an intuitive API for creating elements, setting properties, attaching event listeners, and handling asynchronous content.

## Features
- Create HTML and SVG elements with ease.
- Manage attributes, classes, and styles.
- Attach event listeners in a structured way.
- Support for asynchronous content.
- Automatic cleanup of event listeners for removed elements.

## Usage
First, import the module:
```javascript
import { el, svg } from 'path/to/ElementCreator';
```

### Creating an HTML Element
```javascript
const div = el('div', { class: 'my-class' }, 'Hello, World!');
```

### Creating an SVG Element
```javascript
const circle = svg('circle', { cx: 20, cy: 20, r: 10 });
```

### Attaching Event Listeners
```javascript
const button = el('button', { on: ['click', () => alert('Clicked!')] });
```

### Asynchronous Content
```javascript
const asyncDiv = el('div', fetchSomeData().then(data => data.text()));
```

## License
This project is licensed under the MIT license.

## Contributions
Contributions are welcome. Please submit a pull request or open an issue for discussion.

---

ElementCreator - Simplifying DOM Manipulation
