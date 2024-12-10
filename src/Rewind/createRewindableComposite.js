import {createRewindable} from "./createRewindable.js";

// Utilities
import cel from "../lib/celerity/cel.js";
import {generateKey} from "./generateKey.js";

// Type definitions
import './types.js';

/**
 * Creates a class that adds undo/redo functionality to a target class that has separate rewindable children.
 *
 * @param {typeof Object} TargetClass - The target class
 * @param {RewindOptions} rewindOptions - Options for the Rewindable class
 * @returns {typeof TargetClass} A new class that extends TargetClass with undo/redo functionality
 *
 */
export function createRewindableComposite(TargetClass, rewindOptions = {}) {
  return class RewindableComposite {
    static targetClass = TargetClass;
    static rewindOptions = rewindOptions;

    #rewindable;
    #childTypes = new Map();

    /**
     * @param {...any} args - Arguments for the TargetClass constructor.
     */
    constructor(...args) {
      /**
       * @type {RewindConfig|{}}
       */
      const config = args[0] && typeof args[0] === 'object' ? args[0] : {};
      const options = this.constructor.rewindOptions;

      // Create the core rewindable instance
      const RewindableClass = createRewindable(this.constructor.targetClass, {
        ...options,
        isComposite: true,
        host: this
      });

      this.#rewindable = new RewindableClass(...args);

      // Register child types
      // config?.children?.forEach((child, id) => this.#registerChildType(child.constructor));

      // Setup property forwarding
      cel.forward(this, this.#rewindable);

      // Defer intercept to ensure the RewindableComposite is fully initialized
      this.#rewindable.intercept({...options, host: this});
    }

    get state() {
      return this.#rewindable.state;
    }

    set state(newState) {
      this.#rewindable.state = newState;
      // Add or update children from the snapshot
      // for (const [id, state] of newState.children) {
      //   let child = this.#rewindable.children.get(id);
      //
      //   if (!child) {
      //     console.log("Child does not exist in current state, creating a new one");
      //     // Child does not exist in current state, create a new one
      //     child = this.#restore(id, state);
      //   } else {
      //     // Move existing child to correct position if needed
      //     if (child.position !== state.position) {
      //       child.position = state.position;
      //     }
      //   }
      //
      //   // Update child's state if needed
      //   if (
      //     child.index !== state.index ||
      //     !cel.deepEqual(child.history, state.history)
      //   ) {
      //     child.history = state.history;
      //     child.travel(state.index);
      //   }
      // }
    }

    // Private helper methods

    // #registerChildType(ChildClass) {
    //   const type = generateKey(ChildClass);
    //   console.info(`Registering child type: ${type}`);
    //   const constructor = ChildClass.constructor;
    //   this.#childTypes.set(type, constructor);
    // }

    // /**
    //  *
    //  * @param childSnapshot
    //  * @returns {Rewindable}
    //  */
    // #createChild(childSnapshot) {
    //   const {type} = childSnapshot;
    //
    //   // Use the registered child constructor to create the instance
    //   const childConstructor = this.#childTypes.get(type);
    //   if (!childConstructor) {
    //     throw new Error(`Unknown child type: ${type}`);
    //   }
    //
    //   // Return a new instance
    //   return new childConstructor({
    //     history: childSnapshot.history,
    //     index: childSnapshot.index
    //   });
    // }

    // #restore(id, childSnapshot) {
    //   const {type, history, index, position} = childSnapshot;
    //
    //   // If a more recent child history exists, merge it
    //   const recentHistory = this.#lastChildHistory(id);
    //   const mergedHistory = cel.mergeHistories(history, recentHistory);
    //
    //   // Generate a new child with properties of the child to restore
    //   const child = this.#createChild({type, history: mergedHistory, index, position});
    //   child.id = id;
    //   child.travel(index);
    //
    //   // Add the child to the state manager
    //   this.#rewindable.addChild(id, child);
    //
    //   return child;
    // }
    //
    // #lastChildHistory(id) {
    //   // Traverse the undo/redo history in reverse order
    //   for (let i = this.#rewindable.index; i >= 0; i--) {
    //     const history = this.#rewindable.history[i];
    //     if (history.children.has(id)) {
    //       return history.children.get(id).history;
    //     }
    //   }
    //
    //   return null;
    // }

    // Public API methods

    /**
     * Records current state
     * @returns {RewindableComposite} this instance for chaining
     */
    record() {
      this.#rewindable.record();
      return this;
    }

    /**
     * Adds a new child component
     * @param {string} id - Unique identifier for the child
     * @param {Rewindable} child - Rewindable child
     * @returns {RewindableComposite} this instance for chaining
     */
    addChild(id, child) {
      // this.#registerChildType(child.constructor);
      this.#rewindable.addChild(id, child);
      return this;
    }

    /**
     * Removes a child component
     * @param {string} id - Child identifier to remove
     * @returns {RewindableComposite} this instance for chaining
     */
    removeChild(id) {
      this.#rewindable.removeChild(id);
      return this;
    }

    /**
     * Undoes last recorded change
     * @returns {RewindableComposite} this instance for chaining
     */
    undo() {
      this.#rewindable.undo();
      return this;
    }

    /**
     * Redoes last undone change
     * @returns {RewindableComposite} this instance for chaining
     */
    redo() {
      this.#rewindable.redo();
      return this;
    }
  }
}

