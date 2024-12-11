import {createRewindable} from "./createRewindable.js";
import {EventHandler} from "./EventHandler.js";

// Utilities
import cel from "../lib/celerity/cel.js";

// Type definitions
import './__types__/types.js';

// TODO: Ensure recordBaseline waits for any children to be ready before recording

/**
 * Creates a class that adds rewind functionality to a class for a DOM element. Properties in `observe` are
 * automatically recorded when changed, and methods in `coalesce` result in a single recording each time they are
 * called. Use `debounce` to add debounce to auto-recorded properties.
 *
 * @param {typeof HTMLElement} TargetClass - The class to extend.
 * @param {RewindElementOptions} rewindOptions - Options for the Rewindable class.
 * @returns {typeof TargetClass} A new class that extends TargetClass with undo/redo functionality.
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
 * const RewindableCounter = createRewindableElement(Counter, {
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
 */
export function createRewindableElement(TargetClass, rewindOptions = {}) {
  return class RewindableElement extends TargetClass {
    static targetClass = TargetClass;
    static rewindOptions = rewindOptions;

    #rewindable;
    #eventHandler;
    #propertyHandlers = new Map();

    /**
     * @param {...any} args - Arguments for the TargetClass constructor.
     */
    constructor(...args) {
      super(...args);

      /**
       * @type {RewindConfig|{}}
       */
      const config = args[0] && typeof args[0] === 'object' ? args[0] : {};

      const options = this.constructor.rewindOptions;

      this.#setupPropertyHandlers(options);

      // Create the core rewindable instance
      const RewindableClass = createRewindable(TargetClass, {
        ...options,
        propertyHandlers: this.#propertyHandlers,
        host: this,
        restoreCallback: (id, child) => this.addRewindable(id, child)
      });

      RewindableClass.prototype.recordBaseline = function() {
        // Record initial state after DOM is ready
        if (document.readyState === 'loading') {
          window.addEventListener('DOMContentLoaded', () => this.record(), {once: true});
        } else {
          this.record();
        }

        // Reassign method so that it can only be called once
        this.recordBaseline = () => {};
      }

      this.#rewindable = new RewindableClass(...args);

      // Defer intercept to ensure the RewindableElement is fully initialized
      this.#rewindable.intercept({...options, propertyHandlers: this.#propertyHandlers, host: this});
    }

    // Private setup methods

    #setupPropertyHandlers(options) {
      const {observe = [], debounce = {}} = options;

      for (const prop of observe) {
        if (prop in debounce) {
          const delay = debounce[prop];
          this.#propertyHandlers.set(
            prop,
            cel.debounce(() => this.record(), delay)
          );
        } else {
          this.#propertyHandlers.set(prop, () => this.record());
        }
      }
    }

    #setupKeyboardHandlers(options) {
      const {keys} = options;

      this.#eventHandler = new EventHandler(this, keys);

      this.addEventListener('undo', (event) => {
        this.undo();
        event.preventDefault();
      });

      this.addEventListener('redo', (event) => {
        this.redo();
        event.preventDefault();
      });
    }

    #refocus() {
      if (typeof this.focus === 'function'
        && typeof document.activeElement === 'object'
        && !this.contains(document.activeElement)) {
        this.focus();
      }
    }

    // Public API methods that delegate to core Rewindable

    /**
     * @returns {Object} Current state
     */
    get rewindState() {
      return this.#rewindable.rewindState;
    }

    /**
     * @param {Object} newState - State to restore
     */
    set rewindState(newState) {
      this.#rewindable.rewindState = newState;
    }

    get rewindIndex() {
      return this.#rewindable.rewindIndex;
    }

    get rewindHistory() {
      return this.#rewindable.rewindHistory;
    }

    set rewindHistory(newHistory) {
      this.#rewindable.rewindHistory = newHistory;
    }

    get rewindChildren() {
      return this.#rewindable.rewindChildren;
    }

    connectedCallback() {
      super.connectedCallback?.();
      const options = this.constructor.rewindOptions;

      // Setup keyboard shortcuts for undo and redo
      this.#setupKeyboardHandlers(options);
    }

    // Public API methods

    // Basic Rewind

    record() {
      this.#rewindable.record();
      return this;
    }

    suspend() {
      this.#rewindable.suspend();
      return this;
    }

    resume() {
      this.#rewindable.resume();
      return this;
    }

    coalesce(fn) {
      this.#rewindable.coalesce(fn);
      return this;
    }

    travel(index) {
      this.#rewindable.travel(index);
      return this;
    }

    drop(index) {
      this.#rewindable.drop(index);
      return this;
    }

    undo() {
      this.#rewindable.undo();
      this.#refocus();
      return this;
    }

    redo() {
      this.#rewindable.redo();
      this.#refocus();
      return this;
    }

    // Child Management

    addRewindable(id, child) {
      // Add the child to the state
      this.#rewindable.addRewindable(id, child);

      // Get the position from the state
      const {position} = this.#rewindable.rewindChildren.get(id);

      // Add the child to the DOM in the correct position
      this.insertBefore(child, this.children[position]);
      return this;
    }

    removeRewindable(id) {
      // Get the child
      const child = this.#rewindable.rewindChildren.get(id);

      // Determine if child is focused
      const focused = document.activeElement === child;

      // Get previous child
      const previousChild = child.previousElementSibling;

      // Remove the child from the state
      this.#rewindable.removeRewindable(id);

      // Remove the child from the DOM
      child.remove();

      // Manage focus if child was focused
      if (focused) {
        // Focus previous child if any, else focus this
        const nextElement = previousChild || this;
        nextElement.focus();
      }

      return this;
    }

    // Cleanup

    destroy() {
      this.#eventHandler?.destroy();
    }
  }
}
