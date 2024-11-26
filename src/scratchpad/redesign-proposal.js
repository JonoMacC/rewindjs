import {createRewindable} from "../Rewind/createRewindable.js";
import {EventHandler} from "../Rewind/EventHandler.js";

// Utilities
import cel from "../lib/celerity/cel.js";


/**
 * Manages a collection of rewindable children
 */
class CompositeContainer {
  #target;
  #children = new Map();

  /**
   * @param {Object} target - Container target
   */
  constructor(target) {
    this.#target = target;
  }

  /**
   * @param {string} id - Unique identifier for the child
   * @param {Rewindable} child - Rewindable child
   */
  addChild(id, child) {
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
  get snapshot() {
    return {
      children: new Map(
        Array.from(this.#children.entries())
          .map(([id, child], index) => [
          id,
          {
            type: child.constructor.name,
            history: child.history,
            index: child.index,
            position: index
          }
        ])
      )
    };
  }

  /**
   * @param {Object} snapshot - Snapshot to restore
   */
  set snapshot(snapshot) {
    Object.entries(snapshot.children).forEach(([id, state]) => {
      const child = this.#children.get(id);
      if (child) {
        child.suspend();
        child.state = state;
        child.resume();
      }
    });
  }
}

/**
 * Creates a rewindable composite component
 */
class RewindableComposite {
  // Private fields
  #container;
  #rewindable;
  #childTypes = new Map();

  /**
   * @param {Object} target - Target object
   * @param {RewindOptions} options - Options for the composite
   */
  constructor(target, options = {}) {
    this.#container = new CompositeContainer(target);
    this.#rewindable = new Rewindable(this.#container, {
      ...options,
      accessor: {
        get: () => this.#container.snapshot,
        set: (snapshot) => this.#container.snapshot = snapshot
      }
    });
  }

  // Private helper methods

  #registerChildType(ChildClass) {
    const type = ChildClass.name;
    this.#childTypes.set(type, ChildClass);
    return type;
  }

  #createChild(childSnapshot) {
    const {type} = childSnapshot;
    // Use the registered child constructor to create the instance
    const ChildConstructor = this.#childTypes.get(type);
    if (!ChildConstructor) {
      throw new Error(`Unknown child type: ${type}`);
    }
    return new ChildConstructor({history: childSnapshot.history, index: childSnapshot.index});
  }

  #restore(childId, childSnapshot) {
    const {type, history, index, position} = childSnapshot;
    let mergedHistory;

    // If a more recent child history exists, merge it
    const recentHistory = this.#lastChildHistory(childId);
    mergedHistory = cel.mergeHistories(history, recentHistory);

    const child = this.#createChild({type, history: mergedHistory, index, position});

    // Insert child in correct position using the ChildManager
    const referenceChild = this.#container.children[position];
    if (referenceChild) {
      this.#container.insert(child, referenceChild);
    } else {
      this.#container.addChild(null, child);
    }

    child.id = childId;
    child.travel(index);

    return child;
  }

  #lastChildHistory(id) {
    // Traverse the undo/redo history in reverse order
    for (let i = this.#rewindable.index; i >= 0; i--) {
      const history = this.#rewindable.history[i];
      if (history.children.has(id)) {
        return history.children.get(id).history;
      }
    }

    return null;
  }

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
    this.#registerChildType(child.constructor);
    this.#container.addChild(id, child);
    this.record();
    return this;
  }

  /**
   * Removes a child component
   * @param {string} id - Child identifier to remove
   * @returns {RewindableComposite} this instance for chaining
   */
  removeChild(id) {
    this.#container.removeChild(id);
    this.record();
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

/**
 * Extension of base Rewindable for DOM elements
 */

/**
 * @typedef {Object} UndoKeys
 * @property {string[]} undo - The undo keys.
 * @default ["Ctrl+Z", "Meta+Z"]
 * @property {string[]} redo - The redo keys.
 * @default ["Ctrl+Y", "Ctrl+Shift+Z", "Shift+Meta+Z"]
 */



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
