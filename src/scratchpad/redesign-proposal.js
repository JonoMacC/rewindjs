import {createRewindable} from "../Rewind/createRewindable.js";

// Type definitions
import "./types.js";

// Utilities
import cel from "../lib/celerity/cel.js";




class RewindableCompositeElement {
  #element;
  #rewindable;
  #eventHandler;
  #propertyHandlers = new Map();

  constructor(element, options = {}) {
    this.#element = element;
    this.#rewindable = new RewindableComposite(element, {
      ...options,
      // Custom accessor to handle DOM-specific state
      accessor: {
        get: () => this.#getElementState(),
        set: (state) => this.#setElementState(state)
      }
    });
  }
}

/**
 * Creates a rewindable instance for either a class or an HTML element.
 *
 * @param {typeof Object|HTMLElement} target - The target to make rewindable
 * @param {RewindOptions} options - Configuration options
 * @returns {Rewindable|RewindableElement} A rewindable instance appropriate for the target
 *
 * @example
 * // For a class:
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
 * // For an HTML element:
 * const editor = rewind(document.querySelector('#editor'), {
 *   observe: ['value'],
 *   debounce: { value: 250 },
 *   keys: { undo: ['Ctrl+Z'], redo: ['Ctrl+Y'] }
 * });
 */
export function rewind(target, options = {}) {
  // Check if target is an HTML element
  const isElement = typeof HTMLElement !== 'undefined' &&
    (target instanceof HTMLElement || target.nodeType === 1);

  // targetProxy = cel.proxyElement(target, options.observe);

  return isElement ?
    new RewindableElement(target, options) :
    new Rewindable(target, options);
}
