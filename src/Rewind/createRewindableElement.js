import {createRewindable} from "./createRewindable.js";
import {EventHandler} from "./EventHandler.js";

// Utilities
import cel from "../lib/celerity/cel.js";

// Type definitions
import './types.js';

/**
 * Creates a class that adds rewind functionality to a class for a DOM element. Properties in `observe` are
 * automatically recorded when changed, and methods in `coalesce` result in a single recording each time they are
 * called. Use `debounce` to add debounce to auto-recorded properties. Use `accessor` to provide a custom accessor
 * for manual recording.
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
        host: this
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

      this.#rewindable = new RewindableClass(config, ...args.slice(1));

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
      if (typeof this.focus === 'function' && typeof document.activeElement === 'object' && !this.contains(document.activeElement)) {
        this.focus();
      }
    }

    // Public API methods that delegate to core Rewindable

    /**
     * @returns {Object} Current state
     */
    get state() {
      return this.#rewindable.state;
    }

    /**
     * @param {Object} newState - State to restore
     */
    set state(newState) {
      this.#rewindable.state = newState;
    }

    get index() {
      return this.#rewindable.index;
    }

    get history() {
      return this.#rewindable.history;
    }

    set history(newHistory) {
      this.#rewindable.history = newHistory;
    }

    connectedCallback() {
      super.connectedCallback?.();
      const options = this.constructor.rewindOptions;

      // Setup keyboard shortcuts for undo and redo
      this.#setupKeyboardHandlers(options);
    }

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

    // Cleanup

    destroy() {
      this.#eventHandler?.destroy();
    }
  }
}
