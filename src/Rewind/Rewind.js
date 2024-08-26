import { RewindCore, UndoModel } from "./RewindCore.js";
import { RewindEventHandler } from "./RewindEventHandler.js";
import { debounce } from "../util/interact.js";
import { wrapProperties, wrapMethods } from "../util/object.js";

const DEBOUNCE_NONE = "none";

/**
 * Creates a mixin that adds undo/redo functionality to a base component.
 *
 * @param {class} BaseComponent - The base component class to extend.
 * @param {Object} options - Configuration options for the mixin.
 * @param {string} [options.model=UndoModel.LINEAR] - The undo/redo model to use ('linear' or 'history').
 * @param {string[]} [options.snapshot=[]] - Properties to include in the component's snapshot.
 * @param {string[]} [options.coalesce=[]] - Methods to wrap with coalescing behavior.
 * @param {Object} [options.debounce={}] - Debounce configuration for snapshot properties.
 * @param {(number|"none")} [options.debounce.<propertyName>] - Debounce time in milliseconds for each snapshot property. Use "none" for no debounce. Defaults to 400ms if not specified.
 * @param {Object} [options.customKeys={}] - Custom key bindings for undo/redo actions.
 * @param {string[]} [options.customKeys.undo=["Ctrl+Z", "Meta+Z"]] - Custom key bindings for undo actions.
 * @param {string[]} [options.customKeys.redo=["Ctrl+Y", "Ctrl+Shift+Z", "Shift+Meta+Z"]] - Custom key bindings for redo actions.
 * @param {Object} [options.history=[]] - Initial history for the component.
 * @param {number} [options.index=undefined] - Initial index for the component. Defaults to the last index in the initial history if not specified.
 * @returns {class} A new class that extends BaseComponent with undo/redo functionality.
 *
 * @example
 * // Define a base component
 * class MyComponent extends HTMLElement {
 *   constructor() {
 *     super();
 *     this.content = '';
 *   }
 *
 *   setContent(value) {
 *     this.content = value;
 *   }
 * }
 *
 * // Apply the Rewind mixin
 * const UndoRedoComponent = Rewind(MyComponent, {
 *   snapshot: ['top', 'left', 'text'], // Properties to include in the component's snapshot
 *   coalesce: ['setPosition'], // Methods to wrap with coalescing behavior
 *   debounce: {     // Default debounce of 400ms
 *     top: none, // No debounce for top
 *     left: none, // No debounce for left
 *     text: 300, // 300ms debounce for text
 *   },
 *   customKeys: {
 *     undo: ['Ctrl+U'], // Custom key for undo
 *     redo: ['Ctrl+R'], // Custom key for redo
 *   },
 * });
 *
 * // Use the new component with undo/redo functionality
 * customElements.define('undo-redo-component', UndoRedoComponent);
 *
 * const component = document.createElement('undo-redo-component');
 * component.top = 10;  // Automatically recorded
 * component.left = 20;  // Automatically recorded
 * component.text = "Hello";  // Automatically recorded after 300ms
 * component.undo();  // Reverts to { top: 10, left: 20, text: "" }
 * component.redo();  // Returns to { top: 10, left: 20, text: "Hello" }
 */
export function Rewind(BaseComponent, options = {}) {
  return class extends BaseComponent {
    #rewind;
    #rewindEventHandler;
    #snapshotProps;
    #coalesceProps;
    #recording = true;
    #debouncedRecords = new Map();
    #focusable;

    constructor(...args) {
      super(...args);
      const model = options.model || UndoModel.LINEAR;
      this.#rewind = new RewindCore(model);
      this.#snapshotProps = new Set(options.snapshot || []);
      this.#coalesceProps = new Set(options.coalesce || []);
      this.#focusable =
        typeof document !== "undefined" &&
        typeof this.focus === "function" &&
        this instanceof HTMLElement;

      // Handle initial history and index
      if (options.history) {
        this.rewindHistory = options.history;
        const index =
          options.index !== undefined
            ? options.index
            : options.history.length - 1;
        this.travel(index);
      }

      const debounceConfig = options.debounce || {};
      this.#setupDebouncedRecords(debounceConfig);

      wrapProperties(this, this.#snapshotProps, (prop) => {
        if (this.#recording) {
          this.#debouncedRecords.get(prop)();
        }
      });

      wrapMethods(this, this.#coalesceProps, (method) => {
        this.coalesce(method);
      });
    }

    #setupDebouncedRecords(debounceConfig) {
      for (const prop of this.#snapshotProps) {
        const debounceTime = debounceConfig[prop];
        if (debounceTime === DEBOUNCE_NONE) {
          // No debounce, record immediately
          this.#debouncedRecords.set(prop, () => this.record());
        } else {
          // Use default or custom debounce time
          const time = typeof debounceTime === "number" ? debounceTime : 400;
          this.#debouncedRecords.set(
            prop,
            debounce(() => {
              this.record();
            }, time)
          );
        }
      }
    }

    get snapshot() {
      if (this.#snapshotProps.size > 0) {
        return Array.from(this.#snapshotProps).reduce((acc, prop) => {
          acc[prop] = this[prop];
          return acc;
        }, {});
      }
      // Fallback to custom implementation if provided
      if (
        Object.getOwnPropertyDescriptor(Object.getPrototypeOf(this), "snapshot")
          ?.get
      ) {
        return Object.getOwnPropertyDescriptor(
          Object.getPrototypeOf(this),
          "snapshot"
        ).get.call(this);
      }
      throw new Error(
        "Snapshot getter must be implemented in subclass or defined as a static property"
      );
    }

    set snapshot(newSnapshot) {
      if (this.#snapshotProps.size > 0) {
        Object.keys(newSnapshot).forEach((key) => {
          if (this.#snapshotProps.has(key)) {
            this[key] = newSnapshot[key];
          }
        });
      } else if (
        Object.getOwnPropertyDescriptor(Object.getPrototypeOf(this), "snapshot")
          ?.set
      ) {
        // Fallback to custom implementation if provided
        Object.getOwnPropertyDescriptor(
          Object.getPrototypeOf(this),
          "snapshot"
        ).set.call(this, newSnapshot);
      } else {
        throw new Error(
          "Snapshot setter must be implemented in subclass or defined as a static property"
        );
      }
    }

    get rewindState() {
      return this.#rewind.currentState;
    }

    get rewindIndex() {
      return this.#rewind.currentIndex;
    }

    get rewindHistory() {
      return this.#rewind.history;
    }

    set rewindHistory(newHistory) {
      this.#rewind.history = newHistory;
    }

    record() {
      if (!this.#recording) {
        console.info(`Skipping recording for ${BaseComponent.name}...`);
        return this;
      }

      console.info(`Recording snapshot for ${BaseComponent.name}...`);
      this.#rewind.record(this.snapshot);

      return this;
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
      this.suspend();

      const snapshot = this.#rewind.travel(index);
      if (snapshot === null) return;
      this.snapshot = snapshot;

      this.resume();
      return this;
    }

    drop(index) {
      this.#rewind.drop(index);

      return this;
    }

    undo() {
      this.suspend();

      const previousSnapshot = this.#rewind.undo();
      if (previousSnapshot === null) return;
      this.snapshot = previousSnapshot;

      this.resume();
      this.#focusable && this.#refocus();

      return this;
    }

    redo() {
      this.suspend();

      const nextSnapshot = this.#rewind.redo();
      if (nextSnapshot === null) return;
      this.snapshot = nextSnapshot;

      this.resume();
      this.#focusable && this.#refocus();

      return this;
    }

    #refocus() {
      // If focus is not in this element, focus it
      if (!this.contains(document.activeElement)) {
        this.focus();
      }
    }

    #handleUndo(event) {
      this.undo();
      event.preventDefault();
    }

    #handleRedo(event) {
      this.redo();
      event.preventDefault();
    }

    connectedCallback() {
      if (super.connectedCallback) {
        super.connectedCallback();
      }

      if (typeof HTMLElement !== "undefined" && this instanceof HTMLElement) {
        this.#rewindEventHandler = new RewindEventHandler(
          this,
          options.customKeys
        );
        this.addEventListener("undo", this.#handleUndo.bind(this));
        this.addEventListener("redo", this.#handleRedo.bind(this));
      }

      // Record the initial state if it hasn't been recorded yet
      if (this.rewindHistory.length === 0) {
        this.record();
      }
    }

    disconnectedCallback() {
      if (super.disconnectedCallback) {
        super.disconnectedCallback();
      }

      if (typeof HTMLElement !== "undefined" && this instanceof HTMLElement) {
        this.#rewindEventHandler.destroy();
        this.removeEventListener("undo", this.#handleUndo);
        this.removeEventListener("redo", this.#handleRedo);
      }
    }
  };
}
