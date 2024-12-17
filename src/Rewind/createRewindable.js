import {HistoryManager} from "./HistoryManager.js";
import {StateManager} from "./StateManager.js";

// Utilities
import cel from "../lib/celerity/cel.js";

// Type definitions
import './__types__/types.js';

/**
 * Creates a class that adds undo/redo functionality to a target class. Properties in the `observe` option
 * are automatically recorded when they are changed. For changing multiple properties at once that should be recorded
 * as a single change rather than multiple separate changes, use the `coalesce` option, passing in the method name
 * where the changes occur.
 *
 * @param {typeof Object} TargetClass - The target class
 * @param {RewindOptions} rewindOptions - Options for the Rewindable class
 * @returns {typeof Rewindable} A new Rewindable class with undo/redo functionality
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
  return class Rewindable {
    static targetClass = TargetClass;
    static rewindOptions = rewindOptions;

    #target;
    #historyManager;
    #stateManager;
    #recording = true;
    #baselineRecorded = false;

    /**
     * @param {...any} args - Arguments for the TargetClass constructor.
     */
    constructor(...args) {
      /**
       * @type {RewindConfig|{}}
       */
      const config = args[0] && typeof args[0] === 'object' ? args[0] : {};
      const options = this.constructor.rewindOptions;

      const targetClass = this.constructor.targetClass;
      this.#target = (typeof HTMLElement !== 'undefined'
        && targetClass.prototype instanceof HTMLElement)
        ? document.createElement(targetClass.tagName)
        : new targetClass(...args.slice(1));

      this.#historyManager = new HistoryManager(options.model);
      this.#stateManager = new StateManager(options.host || this.#target, {
          observe: options.observe,
          children: config.children || new Map(),
          restoreCallback: options.restoreCallback,
          destroyCallback: options.destroyCallback
        });

      // Setup property forwarding
      cel.forward(this, this.#target);

      // Handle initial history and index (instance-specific config)
      if (config.history) {
        this.rewindHistory = config.history;
        const index = config.index ?? config.history.length - 1;
        this.travel(index);
      }

      // Handle initial state recording
      Promise.resolve().then(() => {
        if (this.rewindHistory.length !== 0) {
          this.#baselineRecorded = true;
        }
        this.#recordBaseline();
      });

      // Set up auto-recording if host is not provided
      if (!options.host) {
        this.intercept({...options, host: this});
      }
    }

    /**
     * @returns {Object} Current state
     */
    get rewindState() {
      return this.#stateManager.state;
    }

    /**
     * @param {Object} newState - State to restore
     */
    set rewindState(newState) {
      // Handle children
      const children = new Map();

      for (const [id, state] of newState.children) {
        // Restore history of children that are not in the current state
        if (!this.rewindState.children.has(id)) {
          const lastHistory = this.#lastChildHistory(id);
          if (lastHistory) {
            state.history = cel.mergeHistories(
              state.history,
              lastHistory
            );
          }
        }
        children.set(id, state);
      }

      this.#stateManager.state = { ...newState, children };
    }

    /**
     * @returns {RewindCollection} Collection of rewindable children
     */
    get rewindChildren() {
      return this.#stateManager.children;
    }

    /**
     * @param {RewindCollection} children - Collection of rewindable children
     */
    set rewindChildren(children) {
      this.#stateManager.children = children;
    }

    /**
     * @returns {number} Current history index
     */
    get rewindIndex() {
      return this.#historyManager.index;
    }

    /**
     * @returns {Object[]} History of recorded states
     */
    get rewindHistory() {
      return this.#historyManager.history;
    }

    /**
     * @param {Object[]} newHistory - History of states
     */
    set rewindHistory(newHistory) {
      this.#historyManager.history = newHistory;
    }

    // Private methods

    /**
     * Returns the last (most recent) history for a child found in the parent undo/redo history
     * @param id - The child identifier
     * @returns {Object[]|null} The history for the child or null
     */
    #lastChildHistory(id) {
      const lastHistory = this.rewindHistory.findLast(history => history.children.has(id));
      return lastHistory ? lastHistory.children.get(id).history : null;
    }

    /**
     * Records the current state once (initial recording)
     */
    #recordBaseline() {
      if (this.#baselineRecorded) return;

      // Check if all children have completed their initial recording
      const childrenReady = Array.from(this.rewindChildren
        .values())
        .every(child => child.rewindHistory && child.rewindHistory.length > 0);

      if (childrenReady) {
        this.record();
        this.#baselineRecorded = true;
      } else {
        Promise.resolve().then(() => this.#recordBaseline());
      }
    }

    // Public API methods

    // Setup

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

    // Basic Rewind

    /**
     * Records current state in history
     * @returns {Rewindable} this instance for chaining
     */
    record() {
      if (!this.#recording) return this;
      console.info(`Recording snapshot...`);
      this.#historyManager.record(this.rewindState);
      return this;
    }

    /**
     * Coalesces changes by suspending recording, running the callback,
     * and recording once after the callback is completed
     * @param {Function} fn - Callback to run
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
      this.rewindState = this.#historyManager.undo();
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
      this.rewindState = this.#historyManager.redo();
      this.resume();
      return this;
    }

    /**
     * Suspends recording
     * @return {Rewindable} this instance for chaining
     */
    suspend() {
      this.#recording = false;
      return this;
    }

    /**
     * Resumes recording
     * @returns {Rewindable} this instance for chaining
     */
    resume() {
      this.#recording = true;
      return this;
    }

    // Child Management

    /**
     * Adds a rewindable child
     * @param {string} id - Unique identifier for the child
     * @param {Rewindable} child - Child to add
     * @returns {Rewindable} this instance for chaining
     */
    addRewindable(id, child) {
      this.#stateManager.addChild(id, child);
      this.record();
      return this;
    }

    /**
     * Removes a rewindable child
     * @param {string} id - Child identifier to remove
     * @returns {Rewindable} this instance for chaining
     */
    removeRewindable(id) {
      // Record the current state
      // This will capture the state of the child before it is removed
      // If the child state was already recorded, this will be a no-op
      this.record();

      // Remove the child
      this.#stateManager.removeChild(id);

      // Record the new state now that the child has been removed
      this.record();
      return this;
    }
  }
}

