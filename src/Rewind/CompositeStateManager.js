import {StateManager} from "./StateManager.js";
import {ChildStateManager} from "./ChildStateManager.js";

export class CompositeStateManager {
  #stateManager;
  #childStateManager;

  /**
   * A utility class for managing the state of a target object with separate rewindable children.
   *
   * @param {Object} target - The target object to manage
   * @param {Object} options - Options
   * @param {string[]} options.observe - Properties to observe on the target
   * @param {RewindCollection} options.children - Collection of rewindable children
   * @param {Function} options.restoreCallback - Callback to invoke when restoring a rewindable child
   * @param {Function} options.destroyCallback - Callback to invoke when reversing a rewindable child restore
   */
  constructor(target, options) {
    // Manages the state of the target object
    this.#stateManager = new StateManager(target, options.observe);

    // Manages the state of the children
    this.#childStateManager = new ChildStateManager(
      options.children,
      options.restoreCallback,
      options.destroyCallback
    );
  }

  /**
   * Returns the state of the target object and its rewindable children.
   * @returns {Object}
   */
  get state() {
    return {...this.#stateManager.state, children: this.#childStateManager.state};
  }

  /**
   * Sets the state of the target object and its rewindable children.
   * @param {Object} newState - The new state to set.
   */
  set state(newState) {
    // Separate children from the rest of the state
    const children = newState.children || new Map();
    const rest = {...newState};
    delete rest.children;

    // Set the state
    this.#childStateManager.state = children;
    this.#stateManager.state = rest;
  }

  /**
   * @returns {RewindCollection} Collection of rewindable children
   */
  get children() {
    return this.#childStateManager.children;
  }

  /**
   * @param {RewindCollection} children - Collection of rewindable children
   */
  set children(children) {
    this.#childStateManager.children = children;
  }

  /**
   * @param {string} id - Unique identifier for the child
   * @param {Rewindable|RewindableElement} child - Rewindable child
   */
  addChild(id, child) {
    this.#childStateManager.addChild(id, child);
  }

  /**
   * @param {string} id - Unique identifier for the child
   */
  removeChild(id) {
    this.#childStateManager.removeChild(id);
  }
}