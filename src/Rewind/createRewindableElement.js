import {createRewindable} from "./createRewindable.js";
import {EventHandler} from "./EventHandler.js";

// Utilities
import cel from "../lib/celerity/cel.js";

// Type definitions
import './__types__/types.js';

const scheduleNextFrame =
  typeof requestAnimationFrame !== "undefined"
    ? requestAnimationFrame
    : (cb) => setTimeout(cb, 0);

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
      const options = this.constructor.rewindOptions;
      const children = args[0]?.children || new Map();

      this.#setupPropertyHandlers(options.observe, options.debounce);

      // Create the core rewindable instance
      const RewindableClass = createRewindable(TargetClass, {
        ...options,
        propertyHandlers: this.#propertyHandlers,
        host: this,
        restoreCallback: (id, child) => this.addRewindable(id, child)
      });

      // Override recordBaseline method in the Rewindable to handle scenario within the DOM
      RewindableClass.prototype.recordBaseline = function() {
        if (this._getBaselineRecorded()) return;

        const initialize = (attempts = 0) => {
          // Check if all children have completed their initial recording
          const childrenReady = Array.from(this.rewindChildren
            .values())
            .every(child => child.rewindHistory && child.rewindHistory.length > 0);

          if (childrenReady) {
            console.info('All children ready - Recording parent state');
            this.record();
            this._setBaselineRecorded();
          } else if (attempts < 10) {  // Prevent infinite loop
            // Wait a bit and try again
            scheduleNextFrame(() => initialize(attempts + 1));
          } else {
            console.warn('Could not initialize all children after multiple attempts');
            this.record();
            this._setBaselineRecorded();
          }
        }

        // Handle different DOM readiness scenarios
        if (document.readyState === 'loading') {
          window.addEventListener('DOMContentLoaded', initialize);
        } else {
          initialize();
        }
      }

      this.#rewindable = new RewindableClass(...args);

      // Defer intercept to ensure the Rewindable is fully initialized
      this.#rewindable.intercept({...options, propertyHandlers: this.#propertyHandlers, host: this});

      this.#setupChildren(children);
    }

    // Private setup methods

    /**
     * Defines the callback to invoke when a property value changes. If a debounce time is defined for the property,
     * the callback is a debounced record method. Otherwise, the callback is the record method.
     * @param {string[]} observe - Properties to observe
     * @param {Object<string, number>} [debounce] - Debounce times for properties
     */
    #setupPropertyHandlers(observe, debounce= {}) {
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

    /**
     * Sets up event listeners for keyboard shortcuts defined as undo/redo keys
     * @param {UndoKeys} keys
     */
    #setupKeyboardHandlers(keys) {
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

    /**
     * Focuses the element if it is not focus-in
     */
    #refocus() {
      if (typeof this.focus === 'function'
        && typeof document.activeElement === 'object'
        && !this.contains(document.activeElement)) {
        this.focus();
      }
    }

    /**
     * Adds any initial rewindable children to the element
     * @param {Map<string, RewindableElement>} children - Collection of rewindable children
     */
    #setupChildren(children) {
      if (children) {
        for (const [id, child] of children.entries()) {
          // Get the position from the state
          const {position} = this.rewindState.children.get(id);

          // Add the child to the element in the correct position
          this.insertBefore(child, this.children[position]);
        }
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
     * @param {Object} newState - State to set
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

    /**
     * @param {Object[]} newHistory - History to set
     */
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
      this.#setupKeyboardHandlers(options.keys);
    }

    // Public API methods

    // Basic Rewind

    /**
     * Records the current state in history
     * @returns {RewindableElement} this instance for chaining
     */
    record() {
      this.#rewindable.record();
      return this;
    }

    /**
     * Coalesces changes by suspending recording, running the callback,
     * and recording once after the callback is completed
     * @param {Function} fn - Callback to run
     * @returns {RewindableElement} this instance for chaining
     */
    coalesce(fn) {
      this.#rewindable.coalesce(fn);
      return this;
    }

    /**
     * Travels to the given index
     * @param {number} index - Index to travel to
     * @returns {RewindableElement} this instance for chaining
     */
    travel(index) {
      this.#rewindable.travel(index);
      return this;
    }

    /**
     * Drops the state at the given index
     * @param {number} index - Index to drop
     * @returns {RewindableElement} this instance for chaining
     */
    drop(index) {
      this.#rewindable.drop(index);
      return this;
    }

    /**
     * Undoes the last recorded state
     * @returns {RewindableElement} this instance for chaining
     */
    undo() {
      this.#rewindable.undo();
      this.#refocus();
      return this;
    }

    /**
     * Redoes the last undone state
     * @returns {RewindableElement} this instance for chaining
     */
    redo() {
      this.#rewindable.redo();
      this.#refocus();
      return this;
    }

    /**
     * Suspends recording
     * @returns {RewindableElement} this instance for chaining
     */
    suspend() {
      this.#rewindable.suspend();
      return this;
    }

    /**
     * Resumes recording
     * @returns {RewindableElement} this instance for chaining
     */
    resume() {
      this.#rewindable.resume();
      return this;
    }

    // Child Management

    /**
     * Adds a rewindable child
     * @param {string} id - Unique identifier for the child
     * @param {RewindableElement} child - Child to add
     * @returns {RewindableElement} this instance for chaining
     */
    addRewindable(id, child) {
      // Add the child to the state
      this.#rewindable.addRewindable(id, child);

      // Get the position from the state
      const {position} = this.rewindState.children.get(id);

      // Add the child to the element in the correct position
      this.insertBefore(child, this.children[position]);
      return this;
    }

    /**
     * Removes a rewindable child
     * @param {string} id - Child identifier to remove
     * @returns {RewindableElement} this instance for chaining
     */
    removeRewindable(id) {
      // Get the child
      const child = this.rewindChildren.get(id);

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
