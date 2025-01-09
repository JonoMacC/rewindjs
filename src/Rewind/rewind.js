import {createRewindable} from "./createRewindable.js";
import {createRewindableElement} from "./createRewindableElement.js";

// Utilities
import cel from "../lib/celerity/cel.js";

// Type definitions
import './__types__/types.js';

/**
 * Creates a class that extends a target class with undo/redo functionality.
 *
 * @param {typeof Object} BaseClass - A base class.
 * @param {RewindOptions} [options={}] - Options for the Rewindable class.
 * @returns {typeof Rewindable} A new class extending the target with undo/redo functionality.
 *
 * @example
 * class Counter {
 *  #count = 0;
 *
 *  get count() { return this.#count; }
 *  set count(value) { this.#count = value; }
 * }
 *
 * const RewindableCounter = rewind(Counter, {
 *  observe: ['count']
 * });
 *
 * const counter = new RewindableCounter();
 * counter.count = 5;  // Recorded
 * counter.undo();  // Returns to 0
 * counter.redo();  // Returns to 5
 */
export function rewind(BaseClass, options = {}) {
  return createRewindable(BaseClass, options);
}

/**
 * Creates a class that extends a target web component class with undo/redo functionality.
 *
 * @param {typeof HTMLElement} BaseClass - A web component class.
 * @param {RewindElementOptions} [options={}] - Options for the RewindableElement class.
 * @returns {typeof RewindableElement} A new class extending the target with undo/redo functionality.
 *
 * @example
 * class Counter extends HTMLElement {
 *  #count = 0;
 *
 *  constructor() {
 *    super();
 *    this.tabIndex = 0;
 *  }
 *
 *  get count() { return this.#count; }
 *  set count(value) { this.#count = value; }
 *
 *  connectedCallback() {
 *    this.#render();
 *  }
 *
 *  #render {
 *    this.innerHTML = `<output>${this.#count}</output>`;
 *  }
 * }
 *
 * const RewindableCounter = rewind(Counter, {
 *  observe: ['count']
 * });
 *
 * const counter = new RewindableCounter();
 * document.body.appendChild(counter);
 * counter.count = 5;  // Recorded, displays 5
 * counter.undo();  // Returns to 0, displays 0
 * counter.redo();  // Returns to 5, displays 5
 * counter.dispatchEvent(new KeyboardEvent('keydown', {key: 'z', ctrlKey: true})); // Returns to 0, displays 0
 * counter.dispatchEvent(new KeyboardEvent('keydown', {key: 'y', ctrlKey: true})); // Returns to 5, displays 5
 */
export function rewindElement(BaseClass, options = {}) {
  return createRewindableElement(BaseClass, options);
}

/**
 * Creates a class that extends a native HTML Input Element with undo/redo functionality using an HTML instance as the
 * template. This enables HTML inputs to use rewind functionality despite no access to their class definitions.
 *
 * @param {HTMLElement} template - The HTML element instance to use as the template
 * @param {RewindElementOptions} [options={}] - The options for the Rewindable class
 * @returns {typeof RewindableElement} A new class that extends HTMLElement with undo/redo functionality
 *
 * @example
 * const template = document.createElement('input');
 * template.type = 'text';
 *
 * const RewindTextInput = rewindFromInstance(template, {
 *   observe: ['value']
 *   debounce: {
 *     value: 400
 *   }
 * });
 *
 * customElements.define('rw-text-input', RewindTextInput);
 * const rwTextInput = document.createElement('rw-text-input');
 * rwTextInput.value = 'Hello'; // Recorded
 * rwTextInput.undo(); // Returns to empty string
 * rwTextInput.redo(); // Returns to 'Hello'
 */
export function rewindHTMLInput(template, options = {}) {
  // TODO: Remove need for custom element registration by changing proxyElement if possible
  // Create a custom element class to wrap the template
  const BaseClass = cel.proxyElement(template, options.observe);

  // Register the custom element
  customElements.define(`html-input-${cel.randomId()}`, BaseClass);
  return createRewindableElement(BaseClass, options);
}

export default rewind;
