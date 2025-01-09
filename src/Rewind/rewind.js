import {createRewindable} from "./createRewindable.js";
import {createRewindableElement} from "./createRewindableElement.js";

// Utilities
import cel from "../lib/celerity/cel.js";

// Type definitions
import './__types__/types.js';

/**
 * Creates a rewindable class with undo/redo functionality.
 *
 * @param {typeof Object | typeof HTMLElement | HTMLElement} Base - The base class or instance to extend:
 *   - JavaScript class (e.g., `MyClass`)
 *   - Web Component class (e.g., `MyComponent`)
 *   - HTML element instance (e.g., `document.createElement('input')`)
 * @param {RewindOptions & RewindElementOptions} options - Configuration options
 * @returns {typeof Rewindable | typeof RewindableElement} A new class with undo/redo functionality
 *
 * @example
 * // Basic class
 * class Counter { ... }
 * const RewindableCounter = rewind(Counter, { observe: ['count'] });
 *
 * // Web component
 * class MyComponent extends HTMLElement { ... }
 * const RewindableComponent = rewind(MyComponent, {
 *   observe: ['value'],
 *   debounce: { value: 400 }
 * });
 *
 * // HTML input
 * const template = document.createElement('input');
 * const RewindableInput = rewind(template, {
 *   observe: ['value'],
 *   debounce: { value: 400 }
 * });
 */
export function rewind(Base, options = {}) {
  // Handle HTML element instance
  // TODO: Remove need for custom element registration by changing proxyElement if possible
  if (Base instanceof HTMLElement) {
    const BaseClass = cel.proxyElement(Base, options.observe);
    const id = `html-input-${cel.randomId()}`;
    customElements.define(id, BaseClass);
    return createRewindableElement(BaseClass, options);
  }

  // Handle web component
  if (Base.prototype instanceof HTMLElement) {
    return createRewindableElement(Base, options);
  }

  // Handle regular class
  return createRewindable(Base, options);
}

export default rewind;
