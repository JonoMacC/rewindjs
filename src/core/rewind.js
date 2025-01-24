import {createRewindable} from "./createRewindable.js";
import {createRewindableElement} from "./createRewindableElement.js";

// Utilities
import cel from "../lib/celerity/cel.js";

// Type definitions
import '../__types__/types.js';

/**
 * @template T
 * @typedef {T extends HTMLElement
 *   ? RewindableElementConstructor<T>
 *   : T extends {prototype: HTMLElement}
 *     ? RewindableElementConstructor<T>
 *     : RewindableConstructor<T>
 * } RewindConstructor
 */

/**
 * Creates a rewindable class constructor with undo/redo functionality.
 *
 * @template T
 * @param {function(new: T) | T} Base - The base class or element to make rewindable
 * @param {RewindOptions | RewindElementOptions} [options] - Configuration options for rewind functionality
 * @returns {RewindConstructor<T>} A constructor for a rewindable version of the base class
 *
 * @example
 * // Basic
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
