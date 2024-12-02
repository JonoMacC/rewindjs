import {createRewindable} from "./createRewindable.js";
import {createRewindableElement} from "./createRewindableElement.js";

// Utilities
import cel from "../lib/celerity/cel.js";

// Type definitions
import './types.js';

/**
 * Creates a new class that extends BaseClass with undo/redo functionality. BaseClass may be either a simple class or
 * a class that extends HTMLElement (web component). When BaseClass is a web component, the functionality includes
 * DOM-specific features including undo/redo keyboard event listeners and the ability to debounce property changes
 * for automatic recording.
 *
 * @param {typeof Object} BaseClass - The class to be extended with undo/redo functionality
 * @param {RewindOptions | RewindElementOptions} [options={}] - The options for the Rewindable class
 * @returns {typeof BaseClass} A new class that extends BaseClass with undo/redo functionality
 *
 * @example
 * class Counter {
 *  #count = 0;
 *
 *  get count() { return this.#count; }
 *  set count(value) { this.#count = value; }
 * }
 *
 * const RewindableCounter = rewindFromClass(Counter, {
 *  observe: ['count']
 * });
 *
 * const counter = new RewindableCounter();
 * counter.count = 5;  // Recorded
 * counter.undo();  // Returns to 0
 * counter.redo();  // Returns to 5
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
 * const RewindableCounter = rewindFromClass(Counter, {
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
function rewindFromClass(BaseClass, options = {}) {
  // Check if BaseClass is type of HTMLElement
  const isHTMLElement = BaseClass.prototype instanceof HTMLElement;
  console.log('Is HTMLElement:', isHTMLElement);
  return isHTMLElement ? createRewindableElement(BaseClass, options) : createRewindable(BaseClass, options);
}

/**
 * Creates a class that extends HTMLElement with undo/redo functionality using an HTML instance as the template. This
 * enables HTML inputs to use rewind functionality despite there being no access to their class definitions.
 *
 * @param {HTMLElement} template - The HTML element instance to use as the template
 * @param {RewindElementOptions} [options={}] - The options for the Rewindable class
 * @returns {typeof HTMLElement} A new class that extends HTMLElement with undo/redo functionality
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
function rewindFromInstance(template, options = {}) {
  // TODO: Remove need for custom element registration by changing proxyElement if possible
  // Create a custom element class to wrap the template
  const BaseClass = cel.proxyElement(template, options.observe);

  // Register the custom element
  customElements.define(`html-input-${cel.randomId()}`, BaseClass);
  return rewindFromClass(BaseClass, options);
}

/**
 * Creates a class that extends a target class or HTML Element instance with undo/redo functionality. The target may be
 * a simple class, a web component class, or an HTML element instance.
 *
 * @param {typeof Object | HTMLElement} target - The base class to extend or an HTML element instance to use as a template
 * @param {RewindOptions | RewindElementOptions} [options={}] - The options for the Rewindable class
 * @returns {typeof target} A new class that extends target with undo/redo functionality
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
 *
 * @example
 * const template = document.createElement('input');
 * template.type = 'text';
 *
 * const RewindTextInput = rewind(template, {
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
export function rewind(target, options = {}) {
  return target instanceof HTMLElement ? rewindFromInstance(target, options) : rewindFromClass(target, options);
}

export default rewind;
