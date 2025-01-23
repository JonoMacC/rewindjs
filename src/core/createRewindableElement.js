import {createRewindable} from "./createRewindable.js";
import {EventHandler} from "./EventHandler.js";

// Utilities
import cel from "../lib/celerity/cel.js";

// Type definitions
import '../__types__/types.js';

/**
 * @template T extends HTMLElement
 * @typedef {Object} RewindableProps
 * @property {Object} rewindState - The current tracked state
 * @property {Map<string, RewindableElementInstance<T>>} rewindChildren - A map of child rewindable instances by id {@link RewindableInstance>}
 * @property {number} rewindIndex - The current index in the undo/redo history
 * @property {Object[]} rewindHistory - The undo/redo history
 */

/**
 * @template T extends HTMLElement
 * @typedef {Object} RewindableMethods
 * @property {function(): RewindableElementInstance<T>} record - Record the current state
 * @property {function((instance: RewindableElementInstance<T>) => void): RewindableElementInstance<T>} coalesce - Records the provided callback as a single change
 * @property {function(number): RewindableElementInstance<T>} travel - Travel to the given index
 * @property {function(number): RewindableElementInstance<T>} drop - Drop the state at the given index
 * @property {function(): RewindableElementInstance<T>} undo - Undo the last action
 * @property {function(): RewindableElementInstance<T>} redo - Redo the last undone action
 * @property {function(): RewindableElementInstance<T>} suspend - Suspend recording
 * @property {function(): RewindableElementInstance<T>} resume - Resume recording
 */

/**
 * @template T extends HTMLElement
 * @typedef {T & RewindableProps<T> & RewindableMethods<T>} RewindableElementInstance
 */

/**
 * @template T extends HTMLElement
 * @typedef {new (...args: any[]) => RewindableElementInstance<T>} RewindableElementConstructor
 */

/**
 * Creates a class that adds rewind functionality to a class for a DOM element. Properties in `observe` are
 * automatically recorded when changed, and methods in `coalesce` result in a single recording each time they are
 * called. Use `debounce` to add debounce to auto-recorded properties.
 *
 * @template T extends HTMLElement
 * @param {function(new: T)} TargetClass - The class definition to extend.
 * @param {RewindElementOptions} rewindOptions - Options for the Rewindable class.
 * @returns {RewindableElementConstructor<T>} A new class with undo/redo functionality.
 *
 * @example
 * class Counter extends HTMLElement {
 *  #count = 0;
 *
 *  constructor() {
 *    super();
 *    this.tabIndex = 0;
 *  }
 *
 *  get count() { return this.#count; }
 *  set count(value) { this.#count = value; }
 *
 *  connectedCallback() {
 *    this.#render();
 *  }
 *
 *  #render {
 *    this.innerHTML = `<output>${this.#count}</output>`;
 *  }
 * }
 *
 * const RewindableCounter = createRewindableElement(Counter, {
 *  observe: ['count']
 * });
 *
 * const counter = new RewindableCounter();
 * document.body.appendChild(counter);
 * counter.count = 5;  // Recorded, displays 5
 * counter.undo();  // Returns to 0, displays 0
 * counter.redo();  // Returns to 5, displays 5
 * counter.dispatchEvent(new KeyboardEvent('keydown', {key: 'z', ctrlKey: true})); // Returns to 0, displays 0
 * counter.dispatchEvent(new KeyboardEvent('keydown', {key: 'y', ctrlKey: true})); // Returns to 5, displays 5
 *
 */
export function createRewindableElement(TargetClass, rewindOptions = {}) {
  return class RewindableElement extends TargetClass {
    static targetClass = TargetClass;

    /** @type {RewindElementOptions} */
    static rewindOptions = rewindOptions;

    #rewindable;
    #eventHandler;
    #propertyHandlers = new Map();

    /**
     * @param {...any} args - Arguments for the TargetClass constructor.
     */
    constructor(...args) {
      super(...args);
      const options = this.constructor.rewindOptions;
      const children = args[0]?.children || new Map();

      this.#setupPropertyHandlers(options.observe, options.debounce);

      // Isolate the rewind options that are relevant to rewindable (no keys or debounce)
      const rewindOptions = {...options};
      delete rewindOptions.keys;
      delete rewindOptions.debounce;

      // Create the core rewindable instance
      const RewindableClass = createRewindable(TargetClass, {
        ...rewindOptions,
        propertyHandlers: this.#propertyHandlers,
        host: this,
        restoreHandler: {
          add: (id, child) => this.addRewindable(id, child),
          remove: (id) => this.removeRewindable(id)
        }
      });

      this.#rewindable = new RewindableClass(...args);

      // Defer intercept to ensure the Rewindable is fully initialized
      this.#rewindable.intercept({...options, propertyHandlers: this.#propertyHandlers, host: this});

      // Wrap child mutation methods
      // When a rewindable child is added or removed using an `Element.prototype` or `Node.prototype` method,
      // the state will be recorded so that the operation can be undone or redone.
      this.#wrapChildMutators();

      // Setup any children that were provided as arguments
      this.#setupChildren(children);
    }

    // Private setup methods

    /**
     * Defines the callback to invoke when a property value changes. If a debounce time is defined for the property,
     * the callback is a debounced record method. Otherwise, the callback is the record method.
     * @param {string[]} observe - Properties to observe
     * @param {Object<string, number>} [debounce] - Debounce times for properties
     */
    #setupPropertyHandlers(observe = [], debounce= {}) {
      for (const prop of observe) {
        if (prop in debounce) {
          const delay = debounce[prop];
          this.#propertyHandlers.set(
            prop,
            cel.debounce(() => this.record(), delay)
          );
        } else {
          this.#propertyHandlers.set(prop, () => this.record());
        }
      }
    }

    /**
     * Sets up event listeners for keyboard shortcuts defined as undo/redo keys
     * @param {UndoKeys} keys
     */
    #setupKeyboardHandlers(keys) {
      this.#eventHandler = new EventHandler(this, keys);

      this.addEventListener('undo', (event) => {
        this.undo();
        event.preventDefault();
        event.stopPropagation();
      });

      this.addEventListener('redo', (event) => {
        this.redo();
        event.preventDefault();
        event.stopPropagation();
      });
    }

    /**
     * Focuses the element if it is not focus-in
     */
    #refocus() {
      if (typeof this.focus === 'function'
        && typeof document.activeElement === 'object'
        && !this.contains(document.activeElement)) {
        this.focus();
      }
    }

    /**
     * Adds any initial rewindable children to the element
     * @param {Map<string, RewindableElement>} children - Collection of rewindable children
     */
    #setupChildren(children) {
      // Suspend recording while children are added as part of the initial setup
      this.suspend();

      for (const [id, child] of children.entries()) {
        // Get the position from the state
        const {position} = this.rewindState.children.get(id);

        // Set the child id
        child.id = id;

        // Add the child to the element in the correct position
        this.insertBefore(child, this.children[position]);
      }
      this.resume();
    }

    /**
     * Adds any rewindable children in the DOM to the state. Children could be declaratively added in the DOM of the
     * element rather than passed in as arguments
     */
    #observeChildren() {
      const rewindElements = Array.from(this.children)
        .filter((child) => this.#isRewindable(child));
      this.#rewindable.rewindChildren = new Map(
        rewindElements.map((child) => {
          // Ensure each child has a unique identifier
          const childId = child.id || cel.randomId();
          child.id = childId;
          return [childId, child];
        })
      );
    }

    /**
     * Tests whether an element is a Rewindable Element
     * @param {Element} element - The element to test
     * @returns {boolean} Whether the element is a Rewindable Element
     */
    #isRewindable(element) {
      return !!element.constructor.rewindOptions;
    }

    #wrapChildMutators() {
      const mutations = {
        /**
         * Wraps `Element.append` method
         * @link https://developer.mozilla.org/en-US/docs/Web/API/Element/append
         */
        append: this.#createMutationWrapper(function(_, args) {
          const elements = this.#prepareRewindableElements(args);
          return elements.length ? {
            addChildren: { elements, mode: "append" }
          } : { skip: true };
        }),

        /**
         * Wraps `Node.appendChild` method
         * @link https://developer.mozilla.org/en-US/docs/Web/API/Node/appendChild
         */
        appendChild: this.#createMutationWrapper(function(_, child) {
          const elements = this.#prepareRewindableElements([child]);
          return elements.length ? {
            addChildren: { elements, mode: "append" }
          } : { skip: true };
        }),

        /**
         * Wraps `Element.prepend` method
         * @link https://developer.mozilla.org/en-US/docs/Web/API/Element/prepend
         */
        prepend: this.#createMutationWrapper(function(_, args) {
          const elements = this.#prepareRewindableElements(args);
          return elements.length ? {
            addChildren: { elements, mode: "prepend" }
          } : { skip: true };
        }),

        /**
         * Wraps `Node.insertBefore` method
         * @link https://developer.mozilla.org/en-US/docs/Web/API/Node/insertBefore
         */
        insertBefore: this.#createMutationWrapper(function(_, newNode, referenceNode) {
          const elements = this.#prepareRewindableElements([newNode]);
          return elements.length ? {
            addChildren: { elements, mode: "prepend", refId: referenceNode.id }
          } : { skip: true };
        }),

        /**
         * Wraps `Element.insertAdjacentElement` method
         * @link https://developer.mozilla.org/en-US/docs/Web/API/Element/insertAdjacentElement
         */
        insertAdjacentElement: this.#createMutationWrapper(function(_, position, element) {
          // Handle invalid position
          if (!['beforebegin', 'afterend', 'beforeend', 'afterbegin'].includes(position)) {
            return { skip: true };
          }

          // Handle non-rewindable parent for beforebegin/afterend positions
          if ((position === 'beforebegin' || position === 'afterend') &&
            !this.#isRewindable(this.parentNode)) {
            return { skip: true };
          }

          const elements = this.#prepareRewindableElements([element]);
          if (!elements.length) return { skip: true };

          const positionHandler = {
            'beforebegin': {
                addChildren: {
                  elements,
                  mode: "prepend",
                  refId: this.id
                },
                context: this.parentNode
            },
            'afterend': {
                addChildren: {
                  elements,
                  mode: "append",
                  refId: this.id
                },
                context: this.parentNode
            },
            'beforeend': {
                addChildren: {
                  elements,
                  mode: "append"
                }
            },
            'afterbegin': {
                addChildren: {
                  elements,
                  mode: "prepend"
                }
            }
          };

          return positionHandler[position];
        }),

        /**
         * Wraps `Element.before` method
         * @link https://developer.mozilla.org/en-US/docs/Web/API/Element/before
         */
        before: this.#createMutationWrapper(function(_, args) {
          const parent = this.parentNode;
          if (!this.#isRewindable(parent)) {
            return { skip: true };
          }
          const elements = this.#prepareRewindableElements(args);
          return elements.length ? {
            addChildren: {
              elements,
              mode: "prepend",
              refId: this.id
            },
            context: parent,
          } : { skip: true };
        }),

        /**
         * Wraps `Element.after` method
         * @link https://developer.mozilla.org/en-US/docs/Web/API/Element/after
         */
        after: this.#createMutationWrapper(function(_, args) {
          const parent = this.parentNode;
          if (!this.#isRewindable(parent)) {
            return { skip: true };
          }
          const elements = this.#prepareRewindableElements(args);
          return elements.length ? {
            addChildren: {
              elements,
              mode: "append",
              refId: this.id
            },
            context: parent,
          } : { skip: true };
        }),

        /**
         * Wraps `Element.remove` method
         * @link https://developer.mozilla.org/en-US/docs/Web/API/Element/remove
         */
        remove: this.#createMutationWrapper(function() {
          const parent = this.parentNode;
          if (!this.#isRewindable(parent)) {
            return { skip: true };
          }
          return { removeIds: [this.id], context: parent };
        }),

        /**
         * Wraps `Node.removeChild` method
         * @link https://developer.mozilla.org/en-US/docs/Web/API/Node/removeChild
         */
        removeChild: this.#createMutationWrapper(function(_, [child]) {
          if (!this.#isRewindable(child)) {
            return { skip: true };
          }
          return { removeIds: [child.id] };
        }),

        /**
         * Wraps `Element.replaceWith` method
         * @link https://developer.mozilla.org/en-US/docs/Web/API/Element/replaceWith
         */
        replaceWith: this.#createMutationWrapper(function(_, args) {
          const parent = this.parentNode;
          if (!this.#isRewindable(parent)) {
            return { skip: true };
          }
          const elements = this.#prepareRewindableElements(args);
          return elements.length ? {
            removeIds: [this.id],
            addChildren: { elements, mode: "append", refId: this.id },
            context: parent,
          } : { skip: true };
        }),

        /**
         * Wraps `Node.replaceChild` method
         * @link https://developer.mozilla.org/en-US/docs/Web/API/Node/replaceChild
         */
        replaceChild: this.#createMutationWrapper(function(_, newChild, oldChild) {
          if (!this.#isRewindable(oldChild)) {
            return { skip: true };
          }
          const elements = this.#prepareRewindableElements([newChild]);
          return elements.length ? {
            removeIds: [oldChild.id],
            addChildren: { elements, mode: "append", refId: oldChild.id },
          } : { skip: true };
        }),

        /**
         * Wraps `Element.replaceChildren` method
         * @link https://developer.mozilla.org/en-US/docs/Web/API/Element/replaceChildren
         */
        replaceChildren: this.#createMutationWrapper(function(_, ...newChildren) {
          // Get all existing rewindable children to remove
          const childIds = Array.from(this.children)
            .filter(child => this.#isRewindable(child))
            .map(child => child.id);

          // Prepare new rewindable children
          const elements = this.#prepareRewindableElements(newChildren);

          // Skip only if no rewindable children involved at all
          if (!elements.length && !childIds.length) {
            return { skip: true };
          }

          return {
            removeIds: childIds.length ? childIds : undefined,
            addChildren: elements.length ? {
              elements,
              mode: "append"
            } : undefined
          };
        }),
      };

      // Wrap each method
      for (const [methodName, wrapper] of Object.entries(mutations)) {
        const original = HTMLElement.prototype[methodName] || Node.prototype[methodName];
        if (!original) continue;
        this[methodName] = function(...args) {
          return wrapper.call(this, original.bind(this), ...args);
        };
      }
    }

    /**
     * Creates a wrapper for mutation methods that handles rewindable children
     * @param {Function} handler - Specific handler for the mutation method
     * @returns {Function} Wrapped mutation method
     */
    #createMutationWrapper(handler) {
      const context = this;
      return function(original, ...args) {
        const result = handler.call(context, original, args);

        // Apply the original method
        if (result.skip) {
          return original.apply(context, args);
        }

        try {
          // Apply the original method that adds or removes the child to/from the DOM
          const originalResult = original.apply(context, args);

          // If the context exists in the result, use it for rewindable methods, otherwise use the current context
          // This is for methods where the rewind method should be called from a context other than the element, such
          // as from its parent element (`before`, `after`, `remove`, and `replaceWith` are methods that are called
          // from the 'child' from the perspective of rewind methods, so they set the context to parent)
          const rewindContext = result.context || context;

          if (!result.addChildren && !result.removeIds) return originalResult;

          if (result.removeIds) rewindContext.record();

          rewindContext.suspend();

          if (result.addChildren) {
            // Add children to state without adding them to DOM since they are already in the DOM
            rewindContext.addRewindChildren(
              result.addChildren.elements,
              result.addChildren.mode,
              result.addChildren.refId
            );
          }

          if (result.removeIds) {
            // Remove children from state without removing them from DOM since they are already removed from DOM
            rewindContext.removeIds(result.removeIds);
          }

          rewindContext.resume();
          rewindContext.record();

          return originalResult;
        } catch (error) {
          console.error(`Error during mutation operation:`, error);
          throw error;
        }
      };
    }

    /**
     * Prepares elements for addition to rewindable state
     * @param {Element[]} elements - Elements to prepare
     * @returns {Array<{id: string, child: Element}>} Prepared elements
     */
    #prepareRewindableElements(elements) {
      return elements
        .filter(el => this.#isRewindable(el))
        .map(element => {
          element.id = element.id || cel.randomId();
          return { id: element.id, child: element };
        });
    }

    // Public API methods that delegate to core Rewindable

    /**
     * @returns {Object} Current state
     */
    get rewindState() {
      return this.#rewindable.rewindState;
    }

    /**
     * @param {Object} newState - State to set
     */
    set rewindState(newState) {
      this.#rewindable.rewindState = newState;
    }

    get rewindIndex() {
      return this.#rewindable.rewindIndex;
    }

    get rewindHistory() {
      return this.#rewindable.rewindHistory;
    }

    /**
     * @param {Object[]} newHistory - History to set
     */
    set rewindHistory(newHistory) {
      this.#rewindable.rewindHistory = newHistory;
    }

    get rewindChildren() {
      return this.#rewindable.rewindChildren;
    }

    // Lifecycle

    connectedCallback() {
      super.connectedCallback?.();
      const options = this.constructor.rewindOptions;

      // Setup keyboard shortcuts for undo and redo
      this.#setupKeyboardHandlers(options.keys);

      // Setup any children that are declared in the DOM
      this.#observeChildren();
    }

    disconnectedCallback() {
      super.disconnectedCallback?.();
      this.#eventHandler?.destroy();
    }

    // Public API methods

    // Basic Rewind

    /**
     * Records the current state in history
     * @returns {RewindableElementInstance} this instance for chaining
     */
    record() {
      this.#rewindable.record();
      return this;
    }

    /**
     * Coalesces changes by suspending recording, running the callback,
     * and recording once after the callback is completed
     * @param {Function} fn - Callback to run
     * @returns {RewindableElementInstance} this instance for chaining
     */
    coalesce(fn) {
      this.#rewindable.coalesce(fn);
      return this;
    }

    /**
     * Travels to the given index
     * @param {number} index - Index to travel to
     * @returns {RewindableElementInstance} this instance for chaining
     */
    travel(index) {
      this.#rewindable.travel(index);
      return this;
    }

    /**
     * Drops the state at the given index
     * @param {number} index - Index to drop
     * @returns {RewindableElementInstance} this instance for chaining
     */
    drop(index) {
      this.#rewindable.drop(index);
      return this;
    }

    /**
     * Undoes the last recorded state
     * @returns {RewindableElementInstance} this instance for chaining
     */
    undo() {
      this.#rewindable.undo();
      this.#refocus();
      return this;
    }

    /**
     * Redoes the last undone state
     * @returns {RewindableElementInstance} this instance for chaining
     */
    redo() {
      this.#rewindable.redo();
      this.#refocus();
      return this;
    }

    /**
     * Suspends recording
     * @returns {RewindableElementInstance} this instance for chaining
     */
    suspend() {
      this.#rewindable.suspend();
      return this;
    }

    /**
     * Resumes recording
     * @returns {RewindableElementInstance} this instance for chaining
     */
    resume() {
      this.#rewindable.resume();
      return this;
    }

    // Child Management

    /**
     * Adds a rewindable child
     * @param {string} id - Unique identifier for the child
     * @param {RewindableElementInstance} child - Child to add
     * @returns {RewindableElementInstance} this instance for chaining
     */
    addRewindable(id, child) {
      // Add the child to the state
      this.addRewindChild(id, child);

      // Insert the child into the DOM
      this.addToDOM(id, child);
      return this;
    }

    /**
     * Adds a rewindable child from state
     * @param {string} id - Unique identifier for the child
     * @param {RewindableElementInstance} child - Child to add
     * @returns {RewindableElementInstance} this instance for chaining
     */
    addRewindChild(id, child) {
      // Add the child to the state
      this.#rewindable.addRewindable(id, child);
      return this;
    }

    /**
     * Adds rewindable children
     * @param {Array<{id: string, child: Rewindable}>} children - List of rewindable children
     * @param {"prepend" | "append"} [insertionMode="append"] - The mode to add the children ('prepend' or 'append')
     * @param {string} [refId=""] - Identifier of the reference child where insertion starts from
     */
    addRewindChildren(children, insertionMode="append", refId="") {
      this.#rewindable.addRewindChildren(children, insertionMode, refId);
      return this;
    }

    /**
     * Inserts a rewindable child into the DOM
     * @param {string} id - Unique identifier for the child
     * @param {RewindableElementInstance} child - Child to insert
     * @returns {RewindableElementInstance} this instance for chaining
     */
    addToDOM(id, child) {
      // Get the position from the state
      const {position} = this.rewindState.children.get(id);

      if (position === undefined) return this;

      // Set the child identifier
      child.id = id;

      // Add the child to the element in the correct position
      this.suspend();
      this.insertBefore(child, this.children[position]);
      this.resume();
      return this;
    }

    /**
     * Removes a rewindable child
     * @param {string} id - Child identifier to remove
     * @returns {RewindableElementInstance} this instance for chaining
     */
    removeRewindable(id) {
      // Remove the child from the state
      this.removeId(id);

      // Remove the child from the DOM
      this.removeFromDOM(id);

      return this;
    }

    /**
     * Removes a rewindable child from state
     * @param {string} id - Child identifier to remove
     * @returns {RewindableElementInstance} this instance for chaining
     */
    removeId(id) {
      this.#rewindable.removeRewindable(id);
    }

    /**
     * Removes rewindable children from state
     * @param {string[]} ids - Child identifiers to remove
     * @returns {RewindableElementInstance} this instance for chaining
     */
    removeIds(ids) {
      this.#rewindable.removeRewindChildren(ids);
    }

    /**
     * Removes a rewindable child from the DOM
     * @param {string} id - Child identifier to remove
     * @returns {RewindableElementInstance} this instance for chaining
     */
    removeFromDOM(id) {
      // Get the child
      const child = this.rewindChildren.get(id) || this.querySelector(`#${id}`);

      // Remove the child from the DOM
      this.suspend();
      child.remove();
      this.resume();

      return this;
    }
  }
}
