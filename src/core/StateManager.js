// Utilities
import { generateKey } from "../__utils__/generateKey.js";
import cel from "../lib/celerity/cel.js";

export class StateManager {
  #target;
  #observe;
  #children;
  #childTypes = new Map();
  #childPositions = new Map();
  #restoreHandler;

  /**
   * A utility class for managing the state of a target object with separate rewindable children.
   *
   * @param {Object} target - The target object to manage
   * @param {Object} options - Options
   * @param {string[]} options.observe - Properties to observe on the target
   * @param {RewindCollection} options.children - Collection of rewindable children
   * @param {RestoreHandler} options.restoreHandler - Handler for updating restored rewindable children
   */
  constructor(target, {
    observe = [],
    children = new Map(),
    restoreHandler = {
      add: (id, child) => this.addChild(id, child),
      remove: (id) => this.removeChild(id),
    }
  } = {}) {
    this.#target = target;
    this.#observe = new Set(observe);
    this.#children = children;
    this.#restoreHandler = restoreHandler;

    // Register child types
    this.#children.forEach(child => this.registerChildType(child.constructor));
  }

  // Accessors

  /**
   * Returns the state of the target object and its rewindable children.
   * @returns {Object}
   */
  get state() {
    // Get observed properties from the target
    const properties = {};
    for (const name of this.#observe) {
      properties[name] = Reflect.get(this.#target, name);
    }

    // Get the child state from the children
    const children = new Map(
      Array.from(this.#children.entries(), ([id, child]) => [
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

    return {...properties, children };
  }

  /**
   * Sets the state of the target object and its rewindable children.
   * @param {Object} newState - The new state to set.
   */
  set state(newState) {
    // Separate children from the rest of the state properties
    const children = newState.children || new Map();
    const properties = {...newState};
    delete properties.children;

    // Update children using the child handler
    this.#updateChildren(children);

    Object.entries(properties).forEach(([key, value]) => {
      if (this.#observe.has(key)) {
        this.#target[key] = value;
      }
    });
  }

  /**
   * @returns {RewindCollection} Collection of rewindable children
   */
  get children() {
    return this.#children;
  }

  /**
   * @param {RewindCollection} children - Collection of rewindable children
   */
  set children(children) {
    this.#children = children;

    // Register child types
    this.#children.forEach(child => this.registerChildType(child.constructor));
  }

  get childPositions() {
    return this.#childPositions.size
      ? this.#childPositions
      : new Map(this.#children.keys().map((id, index) => [id, index]));
  }

  // Private methods

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

    // Invoke the callback for restoring a child
    // For a web component, the callback should add the child to the DOM
    this.#restoreHandler.add(id, child);

    return child;
  }

  /**
   * @param {RewindChildrenState} newState - Snapshot to restore
   */
  #updateChildren(newState) {
    // Remove children that are not in newState
    for (const id of this.#children.keys()) {
      if (!newState.has(id)) {
        // Invoke the callback for restoring a child
        // For a web component, the callback should remove the child from the DOM
        this.#restoreHandler.remove(id);
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

  // Public methods

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
   * @param {Array<{id: string, child: Rewindable}>} children - List of rewindable children
   * @param {"prepend" | "append"} [insertionMode="append"] - The mode to add the children ('prepend' or 'append')
   * @param {string} [refId=""] - Identifier of the reference child where insertion starts from
   */
  addChildren(children, insertionMode = "append", refId = "") {
    if (refId && !this.childPositions.has(refId)) {
      throw new Error(`Reference child with id "${refId}" not found.`);
    }

    const handlers = {
      prepend: () => {
        const refPosition = refId ? this.childPositions.get(refId) : 0;

        // Shift positions for existing children
        for (const [id, position] of this.childPositions.entries()) {
          if (position >= refPosition) {
            this.#childPositions.set(id, position + children.length);
          }
        }

        // Add new children at the beginning
        children.forEach(({ id, child }, index) => {
          this.registerChildType(child.constructor);
          this.#children.set(id, child);
          this.#childPositions.set(id, refPosition + index);
        });
      },
      append: () => {
        const refPosition = refId ? this.childPositions.get(refId) : this.childPositions.size;

        if (refId) {
          // Shift positions for children after the insertion point
          for (const [id, position] of this.childPositions.entries()) {
            if (position >= refPosition) {
              this.#childPositions.set(id, position + children.length);
            }
          }
        }

        children.forEach(({ id, child }, index) => {
          this.registerChildType(child.constructor);
          this.#children.set(id, child);
          this.#childPositions.set(id, refPosition + index);
        });
      }
    }

    handlers[insertionMode]();
  }

  /**
   * @param {string} id - Child identifier to remove
   */
  removeChild(id) {
    this.#children.delete(id);
  }

  /**
   * @param {...string} children - Child identifiers to remove
   */
  removeChildren(...children) {
    children.forEach(id => this.#children.delete(id));
  }
}