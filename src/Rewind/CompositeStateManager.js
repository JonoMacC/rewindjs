import {StateManager} from "./StateManager";
import {ChildStateManager} from "./ChildStateManager";

export class CompositeStateManager {
  #stateManager;
  #childStateManager;

  /**
   * A utility class for managing the state of a target object with separate rewindable children.
   *
   * @param {Object} target - The target object to manage
   * @param {Object} options - Options
   * @param {string[]} options.observe - Properties to observe on the target
   * @param {Map<string, Rewindable>} options.children - Collection of rewindable children
   */
  constructor(target, options) {
    // Manages the state of the target object
    this.#stateManager = new StateManager(target, options.observe);

    // Manages the state of the children
    this.#childStateManager = new ChildStateManager(options.children);
  }

  /**
   * Returns the state of the target object and its rewindable children.
   * @returns {Object}
   */
  get state() {
    const newState = {...this.#stateManager.state, children: this.#childStateManager.state};
    return newState;
  }

  /**
   * Sets the state of the target object and its rewindable children.
   * @param {Object} newState - The new state to set.
   */
  set state(newState) {
    console.log("Setting state:", newState);
    // Separate children from the rest of the state
    const children = newState.children || new Map();
    const rest = {...newState};
    delete rest.children;

    // Set the state
    this.#childStateManager.state = children;
    this.#stateManager.state = rest;

    console.log("Updated state:", this.#childStateManager.state, this.#stateManager.state);
    console.log("Final state:", this.state);
  }

  get children() {
    return this.#childStateManager.children;
  }

  addChild(id, child) {
    this.#childStateManager.addChild(id, child);
  }

  removeChild(id) {
    this.#childStateManager.removeChild(id);
  }
}