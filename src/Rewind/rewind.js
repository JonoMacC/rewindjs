import {HistoryManager} from "./HistoryManager.js";
import {StateManager} from "./StateManager.js";
import {EventHandler} from "./EventHandler.js";

// Utilities
import cel from "../lib/celerity/cel.js";

/**
 * @typedef {Object} UndoKeys
 * @property {string[]} undo - The undo keys.
 * @default ["Ctrl+Z", "Meta+Z"]
 * @property {string[]} redo - The redo keys.
 * @default ["Ctrl+Y", "Ctrl+Shift+Z", "Shift+Meta+Z"]
 */

/**
 * @typedef {("linear" | "history")} UndoModel
 * @default "linear"
 */

/**
 * @typedef {Object} Accessor
 * @property {Function} get - A function to get the state of the target.
 * @property {Function} set - A function to set the state of the target.
 */

/**
 * Creates a class that adds undo/redo functionality to a target class. Properties in the `observe` option
 * are automatically recorded when they are changed. For changing multiple properties at once that should be recorded
 * as a single change rather than multiple separate changes, use the `coalesce` option, passing in the method name
 * where the changes occur. For properties that should be debounced, use the `debounce` option, passing in an object
 * where the key is the property name and the value is the debounce time in milliseconds.
 *
 * @param {typeof Object} target - The class to extend.
 * @param {Object} options - Configuration options.
 * @param {UndoModel} [options.model="linear"] - The undo/redo model to use.
 * @param {string[]} [options.observe=[]] - Properties to automatically record on change.
 * @param {string[]} [options.coalesce=[]] - Methods to wrap with coalescing behavior.
 * @param {Accessor} [options.accessor={}] - Custom accessor for manual property recording.
 * @param {Object<string, number>} [options.debounce={}] - Debounce configuration for observed properties.
 * @param {UndoKeys} [options.keys={}] - Custom key bindings for undo/redo actions.
 * @param {Object[]} [options.history=[]] - Initial history for the target.
 * @param {number} [options.index=undefined] - Initial index for the target. Defaults to the last index in the initial history if not specified.
 * @returns {typeof target} A new class that extends BaseComponent with undo/redo functionality.
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
export function createRewindable(target, options = {}) {
  const isWebComponent = typeof HTMLElement !== 'undefined' &&
    (target.prototype instanceof HTMLElement || target instanceof HTMLElement);

  return class Rewindable extends target {
    #historyManager;
    #stateManager;
    #recording = true;
    #propertyHandlers = new Map();
    #focusable;

    constructor(...args) {
      super(...args);
      this.#historyManager = new HistoryManager(options.model);
      this.#stateManager = new StateManager(this, {observe: options.observe, accessor: options.accessor});
      this.#focusable =
          typeof document !== "undefined" &&
          typeof this.focus === "function" &&
          this instanceof HTMLElement;

      this.#initHistory(options);
      this.#setupPropertyHandlers(options);
      this.#setupInterceptors(options);

      // Setup platform-specific features if needed
      if (isWebComponent) {
        this.#setupWebComponentFeatures(options);
      } else {
        this.recordBaseline();
      }
    }

    // Private helper methods
    #initHistory(options) {
      // Handle initial history and index
      if (options.history) {
        this.rewindHistory = options.history;
        const index = options.index ?? options.history.length - 1;
        this.travel(index);
      }
    }

    #setupPropertyHandlers(options) {
      for (const prop of options.observe || []) {
        if (options.debounce && prop in options.debounce) {
          const delay = options.debounce[prop];
          this.#propertyHandlers.set(
              prop,
              cel.debounce(() => this.record(), delay)
          );
        } else {
          this.#propertyHandlers.set(prop, () => this.record());
        }
      }
    }

    #setupInterceptors(options) {
      cel.intercept(this, {
        properties: new Set(options.observe || []),
        methods: new Set(options.coalesce || []),
        set: (prop) => {
          if (this.#recording) {
            console.info(`Observed change for ${prop}...`);
            this.#propertyHandlers.get(prop)();
          }
        },
        wrap: (method) => {
          this.coalesce(method);
        },
      });
    }

    // Web Component specific setup
    #setupWebComponentFeatures(options) {
      if (!isWebComponent) return;

      // Add keyboard event handling
      if (typeof EventHandler !== 'undefined') {
        this.#setupKeyboardHandling(options);
      }

      // Handle initial state recording after connection
      if (this.rewindHistory.length === 0) {
        if (document.readyState === 'loading') {
          window.addEventListener('DOMContentLoaded', () => this.recordBaseline(), { once: true });
        } else {
          this.recordBaseline();
        }
      }
    }

    #setupKeyboardHandling(options) {
      const handler = new EventHandler(this, options.keys);

      this.addEventListener('undo', (event) => {
        this.undo();
        event.preventDefault();
      });

      this.addEventListener('redo', (event) => {
        this.redo();
        event.preventDefault();
      });

      // Clean up handler on disconnection
      if (this.disconnectedCallback) {
        const originalDisconnected = this.disconnectedCallback.bind(this);
        this.disconnectedCallback = function () {
          handler.destroy();
          originalDisconnected();
        };
      }
    }

    #refocus() {
      // If focus is not in this element, focus it
      if (!this.contains(document.activeElement)) {
        this.focus();
      }
    }

    get rewindState() {
      return this.#historyManager.state;
    }

    get rewindIndex() {
      return this.#historyManager.index;
    }

    get rewindHistory() {
      return this.#historyManager.history;
    }

    set rewindHistory(newHistory) {
      this.#historyManager.history = newHistory;
    }

    record() {
      if (!this.#recording) return this;
      console.info(`Recording snapshot for ${target.name}...`);
      this.#historyManager.record(this.#stateManager.state);
      return this;
    }

    recordBaseline() {
      if (this.rewindHistory.length === 0) {
        this.record();
      }

      // Reassign method so that it can only be called once
      this.recordBaseline = () => {};
    }

    suspend() {
      this.#recording = false;
      return this;
    }

    resume() {
      this.#recording = true;
      return this;
    }

    coalesce(fn) {
      this.suspend();
      fn();
      this.resume().record();
      return this;
    }

    travel(index) {
      const newState = this.#historyManager.travel(index);
      if (!newState) return this;

      this.suspend();
      this.#stateManager.state = newState;
      this.resume();
      return this;
    }

    drop(index) {
      this.#historyManager.drop(index);
      return this;
    }

    undo() {
      const previousState = this.#historyManager.previousState;
      if (!previousState) return this;

      this.suspend();
      this.#stateManager.state = this.#historyManager.undo();
      this.resume();
      this.#focusable && this.#refocus();
      return this;
    }

    redo() {
      const nextState = this.#historyManager.nextState;
      if (!nextState) return this;

      this.suspend();
      this.#stateManager.state = this.#historyManager.redo();
      this.resume();
      this.#focusable && this.#refocus();
      return this;
    }
  }
}

// Export a named function for better debugging
export function rewind(component, options = {}) {
  // If target is an HTMLElement instance, create a class to proxy it
  const target = component instanceof HTMLElement ?
      cel.proxyElement(component, options.observe)
      : component;
  return createRewindable(target, options);
}

export default rewind;
