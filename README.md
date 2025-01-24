<picture>
  <source srcset="./static/logo_dark.svg" media="(prefers-color-scheme: dark)">
  <source srcset="./static/logo_light.svg" media="(prefers-color-scheme: light)">
  <img src="./static/logo_light.svg" alt="Rewind JS">
</picture>

[![0 dependencies!](https://0dependencies.dev/0dependencies.svg)](https://0dependencies.dev)

Rewind is a library for adding undo/redo functionality to JavaScript classes and Web Components.

**Try it** at [Rewind JS](https://rewindjs.netlify.app)

## Features

### Auto Recording

Rewind automatically records changes to a specified set of properties in a component. Properties to be recorded are specified in the `observe` options parameter. Property changes made as part of a method call can also be tracked – these are specified in the `coalesce` options parameter.

### Multiple Undo Models

Rewind supports `linear` and `history` undo models. 

- `linear` overwrites future states when a change is made from a past state – this is the behavior typical in most applications. 
- `history` preserves all changes as part of an immutable tree.

### Debouncing

Recorded properties and methods can be debounced so that only one state is recorded in a given block when many changes occur. This is useful for users who may make many small changes to a property but would find it tedious to undo each of these incremental updates.

### Event Handling

`Ctrl+Z` (`⌘+Z`) and `Ctrl+Y` or `Ctrl+Shift+Z` (`⌘+Shift+Z`) will undo and redo changes for Web Components out-of-the-box.

### Custom Undo Keys

Supports user-supplied custom keys for undo and redo events.

### Composite Components

Supports nested rewindable components with independent undo/redo histories. The adding/removal of children is automatically recorded and syncing histories is handled.

### Rewindable HTML Inputs

Rewindable HTML input elements are included out-of-the-box. They can be used as custom element replacements for HTML inputs but gain their own undo/redo history.

## Installation

```bash
npm install rewind
```

## Importing

```javascript
// Import from CDN
import rewind from 'https://cdn.skypack.dev/rewind';

// Import from npm
import rewind from 'rewind';

// Import rewindable HTML input elements
import { RewindCheckbox, RewindTextBox } from 'rewind';
```

## Usage

### Example: Defining a Custom Component
Define the rewindable class in JavaScript:
```javascript
import rewind from 'rewind';

// Import or define the base component class
import Counter from './counter.js';

// Create the rewindable class
const RewindableCounter = rewind(Counter, {
    observe: ['count']
});

// Define the component as a custom element
customElements.define('rw-counter', RewindableCounter);
```

Use the component as a custom element in HTML:
```html
<rw-counter></rw-counter>
```
### Example: Using Rewindable HTML Inputs

```html
<script>
import { RewindCheckbox, RewindSelect } from 'rewind';
</script>

<rw-checkbox id="hints" checked></rw-checkbox>
<label for="hints">Show hints</label>

<label for="theme">Theme</label>
<rw-select id="theme">
    <option value="light">Light</option>
    <option value="dark">Dark</option>
    <option value="system">System</option>
</rw-select>
```

| Class Name             | Tag Name              | HTML Input                   |
|------------------------|-----------------------|------------------------------|
| RewindCheckbox         | rw-checkbox           | input[type="checkbox"]       |
| RewindSelect           | rw-select             | select                       |
| RewindTextBox          | rw-text-box           | input[type="text"]           |
| RewindTextarea         | rw-textarea           | textarea                     |
| RewindNumberBox        | rw-number-box         | input[type="number"]         |
| RewindColorBox         | rw-color-box          | input[type="color"]          |
| RewindDateBox          | rw-date-box           | input[type="date"]           |
| RewindDateTimeLocalBox | rw-datetime-local-box | input[type="datetime-local"] |
| RewindMonthBox         | rw-month-box          | input[type="month"]          |
| RewindTimeBox          | rw-time-box           | input[type="time"]           |
| RewindWeekBox          | rw-week-box           | input[type="week"]           |
| RewindTelBox           | rw-tel-box            | input[type="tel"]            |
| RewindUrlBox           | rw-url-box            | input[type="url"]            |
| RewindPasswordBox      | rw-password-box       | input[type="password"]       |
| RewindSearchBox        | rw-search-box         | input[type="search"]         |
| RewindRange            | rw-range              | input[type="range"]          |
| RewindRadioGroup       | rw-radio-group        | input[type="radio"]          |

For `rw-radio-group`, use conventional radio buttons inside the `rw-radio-group` element.

```html
<rw-radio-group>
    <div>
        <input type="radio" name="h-policy" id="h-fill" value="fill">
        <label for="h-fill">Fill</label>
    </div>
    <div>
        <input type="radio" name="h-policy" id="h-fit" value="fit">
        <label for="h-fit">Fit</label>
    </div>
    <div>
        <input type="radio" name="h-policy" id="h-fixed" value="fixed" checked>
        <label for="h-fixed">Fixed</label>
    </div>
</rw-radio-group>
```

## ⚙️ Advanced Usage

With the rewindable class created, you can use it in the same way as the base class. In addition, the rewindable class has new methods for undo and redo:

| Method          | Description                                   |
|-----------------|-----------------------------------------------|
| `undo()`        | Undo the last change                          |
| `redo()`        | Redo the last undone change                   |
| `suspend()`     | Suspend recording                             |
| `resume()`      | Resume recording                              |
| `travel(index)` | Travel to the given index in the undo history |
| `drop(index)`   | Drop the state at the given index             |

These can be used to build more complex undo/redo functionality by creating logic on top of the rewindable class.

## API

```javascript
rewind(
  base, // The base class to make rewindable
  {
    model: 'linear', // ? 'linear' | 'history' The undo model
    observe: [], // ? string[] Properties to record when they change
    coalesce: [], // ? string[] Methods to record when they are called
    debounce: {}, // ? { [property: string]: number } Properties to debounce and debounce time in milliseconds
    keys: {}, // ? { undo: string[], redo: string[] } Custom undo and redo keys (e.g. { undo: ["Ctrl+U"], redo: ["Ctrl+R"] })
  }
)
```

## Limitations

- **No frameworks** – The library is for use with plain JavaScript classes and Web Components. Frameworks are unsupported.

- **No side effects** – When an `undo` or `redo` is triggered, the component simply sets its properties back to their state at that point in history. Side effects (e.g. network requests) are not handled.

- **Limitations on supported properties** – Element properties that can be changed without a setter (e.g. `clientWidth`) are unsupported for auto-recording.

## ⚠️ Caution

Rewind is not optimized for performance; it is intended for prototyping and proof of concepts.

## Motivation

This library came about to enable experimentation and prototyping around undo/redo functionality. 

Most literature on undo/redo treats the functionality as solved, with the focus on technical considerations, however, there is plenty of under-explored territory in the UX space. Selective undo mechanisms aim to give the user granular undo/redo on a per-object basis – Rewind makes this possible and offers a more intuitive control to object-specific history panels: the object that is focused is the one that experiences undo/redo. History undo models are discussed but rarely seen in practice – with Rewind the model can be easily changed for comparison testing.

Users take undo/redo for granted, so much so that its absence even in a crude prototype can become a distraction. Adding undo/redo takes non-trivial effort and generally involves writing non-portable code specific to the commands in your application. Rewind simplifies this with a drop-in enhancement.

## 📚 Learn

- [A Selective Undo Mechanism for Graphical User Interfaces Based on Command Objects](https://dl.acm.org/doi/pdf/10.1145/196699.196721)
- [You Don't Know Undo/Redo](https://dev.to/isaachagoel/you-dont-know-undoredo-4hol)