import {generateKey} from "./__utils__/generateKey.js";
import cel from "../lib/celerity/cel.js";

export class ChildStateManager {
  #children;
  #childTypes = new Map();
  #restoreCallback;
  #childPositions = new Map();

  /**
   * Manages the state of a collection of rewindable children
   * @param {Map<string, Rewindable>} children - Collection of rewindable children to manage
   * @param {Function} restoreCallback - Callback to invoke when restoring a rewindable child
   */
  constructor(children = new Map(), restoreCallback = null) {
    this.#children = children;
    this.#restoreCallback = restoreCallback;

    // Register child types
    this.#children.forEach(child => this.registerChildType(child.constructor));
  }

  /**
   *
   * @param childSnapshot
   * @returns {Rewindable}
   */
  #createChild(childSnapshot) {
    const {type} = childSnapshot;

    // Use the registered child constructor to create the instance
    const ChildClass = this.#childTypes.get(type);
    if (!ChildClass) {
      throw new Error(`Unknown child type: ${type}`);
    }

    // Return a new instance
    return new ChildClass({
      history: childSnapshot.history,
      index: childSnapshot.index
    });
  }

  #restore(id, childSnapshot) {
    const {index} = childSnapshot;

    // Generate a new child with properties of the child to restore
    const child = this.#createChild(childSnapshot);
    child.travel(index);

    // Add the child
    if (this.#restoreCallback) {
      this.#restoreCallback(id, child);
    } else {
      this.addChild(id, child);
    }

    return child;
  }

  /**
   * Registers a new child type so it can be restored from state
   * @param {typeof Rewindable} ChildClass - Child class to register
   */
  registerChildType(ChildClass) {
    const type = generateKey(ChildClass);
    if (this.#childTypes.has(type)) {
      return;
    }
    console.info(`Registering child type: ${type}`);
    this.#childTypes.set(type, ChildClass);
  }

  /**
   * @param {string} id - Unique identifier for the child
   * @param {Rewindable} child - Rewindable child
   */
  addChild(id, child) {
    this.registerChildType(child.constructor);
    this.#children.set(id, child);
    return child;
  }

  /**
   * @param {string} id - Child identifier to remove
   */
  removeChild(id) {
    this.#children.delete(id);
  }

  /**
   * @returns {Object} Snapshot of all children's states
   */
  get state() {
    return new Map(
      Array.from(this.#children.entries())
        .map(([id, child], _) => [
          id,
          {
            type: generateKey(child.constructor),
            history: child.rewindHistory,
            index: child.rewindIndex,
            // Use the explicitly set position, or fall back to current order
            position: this.#childPositions.get(id) ??
                      Array.from(this.#children.keys()).indexOf(id)
          }
        ])
    );
  }

  /**
   * @param {Object} newState - Snapshot to restore
   */
  set state(newState) {
    // Remove children that are not in newState
    for (const id of this.#children.keys()) {
      if (!newState.has(id)) {
        this.removeChild(id);
      }
    }

    // Add or update children from newState
    for (const [id, state] of newState.entries()) {
      let child = this.#children.get(id);

      // If position is explicitly defined in the state, set it
      if (state.position !== undefined) {
        this.#childPositions.set(id, state.position);
      }

      if (child) {
        // Update existing child
        child.suspend();
        child.state = state;
        child.resume();
      } else {
        // Child does not exist in current state, create a new one
        child = this.#restore(id, state);
      }

      // Update child's state if needed
      if (
        child.rewindIndex !== state.index ||
        !cel.deepEqual(child.rewindHistory, state.history)
      ) {
        child.rewindHistory = state.history;
        child.travel(state.index);
      }
    }
  }

  get children() {
    return this.#children;
  }
}