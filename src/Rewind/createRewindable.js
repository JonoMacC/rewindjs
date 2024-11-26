import {HistoryManager} from "./HistoryManager";
import {StateManager} from "./StateManager";

// Utilities
import cel from "../lib/celerity/cel.js";

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
 * @typedef {Object} RewindOptions
 * @property {UndoModel} [model='linear'] - Undo model
 * @property {string[]} [observe=[]] - Properties to observe with auto-recording
 * @property {string[]} [coalesce=[]] - Methods to coalesce with auto-recording
 * @property {Map} [propertyHandlers=Map()] - Functions to execute on a property change
 * @property {Accessor} [accessor] - Custom state accessor for manual recording
 * @property {Function} [recordBaseline] - Custom function for recording initial state
 * @property {Object} [host] - Target to intercept for auto-recording
 */

/**
 * @typedef {Object} RewindConfig
 * @property {Object[]} [history=[]] - Initial history
 * @property {number} [index=undefined] - Initial index
 */


/**
 * Creates a class that adds undo/redo functionality to a target class. Properties in the `observe` option
 * are automatically recorded when they are changed. For changing multiple properties at once that should be recorded
 * as a single change rather than multiple separate changes, use the `coalesce` option, passing in the method name
 * where the changes occur.
 *
 * @param {typeof Object} TargetClass - The class to extend.
 * @param {RewindOptions} rewindOptions - Options for the Rewindable class.
 * @returns {typeof TargetClass} A new class that extends TargetClass with undo/redo functionality.
 *
 * @example
 * class Counter {
 *  #count = 0;
 *
 *  get count() { return this.#count; }
 *  set count(value) { this.#count = value; }
 * }
 *
 * const RewindableCounter = createRewindable(Counter, {
 *  observe: ['count']
 * });
 *
 * const counter = new RewindableCounter();
 * counter.count = 5;  // Recorded
 * counter.undo();  // Returns to 0
 * counter.redo();  // Returns to 5
 */
export function createRewindable(TargetClass, rewindOptions = {}) {
  return class Rewindable extends TargetClass {
    static rewindOptions = rewindOptions;

    #historyManager;
    #stateManager;
    #recording = true;

    /**
     * @param {RewindConfig} config - Configuration for the Rewindable instance.
     * @param {...any} args - Arguments for the TargetClass constructor.
     */
    constructor(config = {}, ...args) {
      // Initialize the base TargetClass
      super(...args);

      const options = this.constructor.rewindOptions;

      this.#historyManager = new HistoryManager(options.model);
      this.#stateManager = new StateManager(options.host || this, {
        observe: options.observe,
        accessor: options.accessor
      });

      // Handle initial history and index (instance-specific config)
      if (config.history) {
        this.history = config.history;
        const index = config.index ?? config.history.length - 1;
        this.travel(index);
      }

      // Handle initial state recording after connection
      if (!config.history && this.history.length === 0) {
        const recordBaseline = options.recordBaseline || this.record.bind(this);
        recordBaseline.call(this);
      }

      // Set up auto-recording if host is not provided
      if (!options.host) {
        this.intercept({...options, host: this});
      }
    }

    /**
     * @returns {Object} Current state
     */
    get state() {
      return this.#stateManager.state;
    }

    /**
     * @param {Object} newState - State to restore
     */
    set state(newState) {
      this.#stateManager.state = newState;
    }

    get index() {
      return this.#historyManager.index;
    }

    get history() {
      return this.#historyManager.history;
    }

    set history(newHistory) {
      this.#historyManager.history = newHistory;
    }

    /**
     * Sets up auto-recording
     */
    intercept(options) {
      cel.intercept(options.host,{
        properties: new Set(options.observe || []),
        methods: new Set(options.coalesce || []),
        set: (prop) => {
          if (this.#recording) {
            console.info(`Observed change for ${prop}...`);
            const handler = options.propertyHandlers?.get(prop);
            if (handler) {
              handler();
            } else {
              this.record();
            }
          }
        },
        wrap: (method) => {
          this.coalesce(method);
        },
      });

      // Reassign intercept to a no-op after running once
      this.intercept = () => {
        console.warn('Intercept has already been set up. Skipping.');
      };
    }

    /**
     * Records current state in history
     * @returns {Rewindable} this instance for chaining
     */
    record() {
      if (!this.#recording) return this;
      console.info(`Recording snapshot...`);
      this.#historyManager.record(this.#stateManager.state);
      return this;
    }

    /**
     * Coalesces changes by suspending recording, running the callback,
     * and recording once after the callback is completed
     * @returns {Rewindable} this instance for chaining
     */
    coalesce(fn) {
      this.suspend();
      fn();
      this.resume().record();
      return this;
    }

    /**
     * Travels to the given index
     * @param {number} index - Index to travel to
     * @returns {Rewindable} this instance for chaining
     */
    travel(index) {
      const newState = this.#historyManager.travel(index);
      if (!newState) return this;

      this.suspend();
      this.#stateManager.state = newState;
      this.resume();
      return this;
    }

    /**
     * Drops the state at the given index
     * @param index
     * @returns {Rewindable}
     */
    drop(index) {
      this.#historyManager.drop(index);
      return this;
    }

    /**
     * Undoes the last recorded state
     * @returns {Rewindable} this instance for chaining
     */
    undo() {
      const previousState = this.#historyManager.previousState;
      if (!previousState) return this;

      this.suspend();
      this.state = this.#historyManager.undo();
      this.resume();
      return this;
    }

    /**
     * Redoes the last undone state
     * @returns {Rewindable} this instance for chaining
     */
    redo() {
      const nextState = this.#historyManager.nextState;
      if (!nextState) return this;

      this.suspend();
      this.state = this.#historyManager.redo();
      this.resume();
      return this;
    }

    /**
     * Suspends recording.
     * @return {Rewindable} this instance for chaining.
     */
    suspend() {
      this.#recording = false;
      return this;
    }

    /**
     * Resumes recording.
     * @returns {Rewindable} this instance for chaining.
     */
    resume() {
      this.#recording = true;
      return this;
    }
  }
}

