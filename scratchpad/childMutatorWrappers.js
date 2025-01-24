import cel from "../src/lib/celerity/cel.js";

// Longform expressions for child mutation wrapper methods on createRewindableElement
const wrappers = {
  /**
   * Wraps child mutation methods to record any changes to the state prior to the mutation
   * when the children are rewindable
   */
  #wrapChildMutators() {
    // Element.prototype and Node.prototype methods to override
    const methods = {
      // Addition
      append: this.#wrapAppend.bind(this),
      appendChild: this.#wrapAppend.bind(this),
      prepend: this.#wrapPrepend.bind(this),

      // Sibling insertion
      before: this.#wrapBefore.bind(this),
      after: this.#wrapAfter.bind(this),

      // Specific insertion
      insertAdjacentElement: this.#wrapInsertAdjacentElement.bind(this),
      insertBefore: this.#wrapInsertBefore.bind(this),

      // Removal
      remove: this.#wrapRemove.bind(this),
      removeChild: this.#wrapRemoveChild.bind(this),

      // Replacement
      replaceWith: this.#wrapReplaceWith.bind(this),
      replaceChild: this.#wrapReplaceChild.bind(this),
      replaceChildren: this.#wrapReplaceChildren.bind(this),
    };

    // Wrap each method
    for (const [methodName, methodHandler] of Object.entries(methods)) {
      const original = HTMLElement.prototype[methodName] || Node.prototype[methodName];
      if (original) {
        this[methodName] = function (...args) {
          return methodHandler(original, ...args);
        };
      }
    }
  },

  // Wrap methods

  // Addition

  /**
   * Wraps `Element.append` and `Node.appendChild` methods
   * @link https://developer.mozilla.org/en-US/docs/Web/API/Element/append
   * @link https://developer.mozilla.org/en-US/docs/Web/API/Node/appendChild
   * @param {Function} original - Original method
   * @param {...Element} args - Elements to append
   */
  #wrapAppend(original, ...args) {
    // Check the arguments for rewindable elements
    const elements = args.filter((arg) => this.#isRewindable(arg));

    // If there are no rewindable elements, call the original method
    if (elements.length === 0) {
      return original.apply(this, args);
    }

    try {
      // Apply the original method first
      const result = original.apply(this, args);

      // Create a list of children
      const rewindChildren = elements.map(
        (element) => {
          // Ensure each child has a unique identifier
          element.id = element.id || cel.randomId();
          return {id: element.id, child: element};
        });

      // Add the children to the state
      this.#rewindable.addRewindChildren(rewindChildren);
      return result;
    } catch (error) {
      console.error("Error during `append` operation:", error);
      throw error;
    }
  },

  /**
   * Wraps `Element.prepend` method
   * @link https://developer.mozilla.org/en-US/docs/Web/API/Element/prepend
   * @param {Function} original - Original method
   * @param {...Element} args - Elements to prepend
   */
  #wrapPrepend(original, ...args) {
    // Check the arguments for rewindable elements
    const elements = args.filter((arg) => this.#isRewindable(arg));

    // If there are no rewindable elements, call the original method
    if (elements.length === 0) {
      return original.apply(this, args);
    }

    try {
      // Apply the original method first
      const result = original.apply(this, args);

      // Create a list of children
      const rewindChildren = elements.map(
        (element) => {
          // Ensure each child has a unique identifier
          element.id = element.id || cel.randomId();
          return {id: element.id, child: element};
        });

      // Add the children to the state
      this.#rewindable.addRewindChildren(rewindChildren, "prepend");
      return result;
    } catch (error) {
      console.error("Error during `prepend` operation:", error);
      throw error;
    }
  },

  // Sibling Insertion

  /**
   * Wraps `Element.before` method
   * @link https://developer.mozilla.org/en-US/docs/Web/API/Element/before
   * @param {Function} original - Original method
   * @param {...Element} args - Elements to insert
   */
  #wrapBefore(original, ...args) {
    // Get rewindable elements
    const elements = args.filter((arg) => this.#isRewindable(arg));

    // If the parent element is not a rewindable element or no children are rewindable,
    // call the original method
    if (!this.#isRewindable(this.parentNode)
      || elements.length === 0) {
      return original.apply(this, args);
    }

    try {
      // Apply the original method first
      const result = original.apply(this, args);

      // Create a list of children
      const rewindChildren = elements.map(
        (element) => {
          // Ensure each child has a unique identifier
          element.id =  element.id || cel.randomId();
          return {id: element.id, child: element};
        });

      // Add the children to the state of the parent
      const parent = this.parentNode;
      parent.addRewindChildren(rewindChildren, "prepend", this.id);
      return result;
    } catch (error) {
      console.error("Error during `before` operation:", error);
      throw error;
    }
  },

  /**
   * Wraps `Element.after` method
   * @link https://developer.mozilla.org/en-US/docs/Web/API/Element/after
   * @param {Function} original - Original method
   * @param {...Element} args - Elements to insert
   */
  #wrapAfter(original, ...args) {
    // Get rewindable elements
    const elements = args.filter((arg) => this.#isRewindable(arg));

    // If the parent element is not a rewindable element or no children are rewindable,
    // call the original method
    if (!this.#isRewindable(this.parentNode)
      || elements.length === 0) {
      return original.apply(this, args);
    }

    try {
      // Apply the original method first
      const result = original.apply(this, args);

      // Create a list of children
      const rewindChildren = elements.map(
        (element) => {
          // Ensure each child has a unique identifier
          element.id = element.id || cel.randomId();
          return {id: element.id, child: element};
        });

      // Add the children to the state of the parent
      const parent = this.parentNode;
      parent.addRewindChildren(rewindChildren, "append", this.id);
      return result;
    } catch (error) {
      console.error("Error during `after` operation:", error);
      throw error;
    }
  },

  // Specific Insertion

  /**
   * Wraps `insertAdjacentElement` method
   * @link https://developer.mozilla.org/en-US/docs/Web/API/Element/insertAdjacentElement
   * @param {Function} original - Original method
   * @param {"beforebegin" | "afterbegin" | "beforeend" | "afterend"} position - Position to insert
   * @param {Element} element - Element to insert
   */
  #wrapInsertAdjacentElement(original, position, element) {
    // If the element is not a rewindable element, call the original method
    if (!this.#isRewindable(element)) {
      return original.call(this, position, element);
    }

    const parent = this.parentNode;
    const positionHandler = {
      'beforebegin': () => {
        // If the parent is not a rewindable element, call the original method
        if (!this.#isRewindable(parent)) {
          return original.call(this, position, element);
        }
        return this.before(element);
      },
      'afterbegin': () => {
        return this.prepend(element);
      },
      'beforeend': () => {
        return this.append(element);
      },
      'afterend': () => {
        // If the parent is not a rewindable element, call the original method
        if (!this.#isRewindable(parent)) {
          return original.call(this, position, element);
        }
        return this.after(element);
      },
    };

    return positionHandler[position]();
  },

  /**
   * Wraps `Node.insertBefore` method
   */
  #wrapInsertBefore(original, newNode, referenceNode) {
    // If the new node is not a rewindable element or the reference node is not, call the original method
    if (!this.#isRewindable(newNode)
      || !this.#isRewindable(referenceNode)) {
      return original.call(this, newNode, referenceNode);
    }

    try {
      // Apply the original method first
      const result = original.apply(newNode, referenceNode);

      // Ensure child has a unique identifier
      newNode.id = newNode.id || cel.randomId();

      // Add the child to the state
      this.#rewindable.addRewindable([{id: newNode.id, child: newNode}], "prepend", referenceNode.id);
      return result;
    } catch (error) {
      console.error("Error during `insertBefore` operation:", error);
      throw error;
    }
  },

  // Removal

  /**
   * Wraps `Element.remove` method
   * @link https://developer.mozilla.org/en-US/docs/Web/API/Element/remove
   * @param {Function} original - Original method
   */
  #wrapRemove(original) {
    // If this element isn't in a rewindable parent, call original
    const parent = this.parentNode;
    if (!this.#isRewindable(parent)) {
      return original.apply(this);
    }

    try {
      // Get this element's ID before removal
      const elementId = this.id;

      // Apply the original method first
      const result = original.apply(this);

      // Remove from parent's rewindable state
      parent.removeRewindable(elementId);

      return result;
    } catch (error) {
      console.error("Error during `remove` operation:", error);
      throw error;
    }
  },

  /**
   * Wraps `Node.removeChild` method
   * @link https://developer.mozilla.org/en-US/docs/Web/API/Node/removeChild
   * @param {Function} original - Original method
   * @param {Node} child - Child to remove
   */
  #wrapRemoveChild(original, child) {
    // If the child isn't rewindable, just call original
    if (!this.#isRewindable(child)) {
      return original.call(this, child);
    }

    try {
      // Get child's ID before removal
      const childId = child.id;

      // Apply the original method first
      const result = original.call(this, child);

      // Remove from rewindable state
      this.#rewindable.removeRewindable(childId);

      return result;
    } catch (error) {
      console.error("Error during `removeChild` operation:", error);
      throw error;
    }
  },

  // Replacement

  /**
   * Wraps `Element.replaceWith` method
   * @link https://developer.mozilla.org/en-US/docs/Web/API/Element/replaceWith
   * @param {Function} original - Original method
   * @param {...Element} args - Elements to replace with
   */
  #wrapReplaceWith(original, ...args) {
    // Get rewindable elements from args
    const elements = args.filter((arg) => this.#isRewindable(arg));

    // If parent isn't rewindable or no rewindable replacements, call original
    const parent = this.parentNode;
    if (!this.#isRewindable(parent) || elements.length === 0) {
      return original.apply(this, args);
    }

    try {
      // Get this element's ID before replacement
      const elementId = this.id;

      // Apply the original method first
      const result = original.apply(this, args);

      // Create list of replacement children
      const rewindChildren = elements.map(element => {
        // Ensure each child has a unique identifier
        element.id = element.id || cel.randomId();
        return {id: element.id, child: element};
      });

      // Remove the old element and add the new ones
      parent.removeRewindable(elementId);
      parent.addRewindChildren(rewindChildren);

      return result;
    } catch (error) {
      console.error("Error during `replaceWith` operation:", error);
      throw error;
    }
  },

  /**
   * Wraps `Node.replaceChild` method
   * @link https://developer.mozilla.org/en-US/docs/Web/API/Node/replaceChild
   * @param {Function} original - Original method
   * @param {Node} newChild - New child
   * @param {Node} oldChild - Old child
   */
  #wrapReplaceChild(original, newChild, oldChild) {
    // If neither child is rewindable, just call original
    if (!this.#isRewindable(newChild) && !this.#isRewindable(oldChild)) {
      return original.call(this, newChild, oldChild);
    }

    try {
      // Get old child's ID before replacement
      const oldChildId = oldChild.id;

      // Apply the original method first
      const result = original.call(this, newChild, oldChild);

      if (this.#isRewindable(newChild)) {
        // Ensure new child has an ID
        newChild.id = newChild.id || cel.randomId();

        // Add the new child to state
        this.#rewindable.addRewindable(newChild.id, newChild);
      }

      if (this.#isRewindable(oldChild)) {
        // Remove old child from state
        this.#rewindable.removeRewindable(oldChildId);
      }

      return result;
    } catch (error) {
      console.error("Error during `replaceChild` operation:", error);
      throw error;
    }
  },

  /**
   * Wraps `Element.replaceChildren` method
   * @link https://developer.mozilla.org/en-US/docs/Web/API/Element/replaceChildren
   * @param {Function} original - Original method
   * @param {...Node} nodes - Nodes to replace with
   */
  #wrapReplaceChildren(original, ...nodes) {
    // Get rewindable nodes
    const rewindableNodes = nodes.filter((node) => this.#isRewindable(node));

    // If no rewindable nodes involved, just call original
    if (rewindableNodes.length === 0) {
      return original.apply(this, nodes);
    }

    try {
      // Get IDs of current rewindable children before replacement
      const oldChildIds = Array.from(this.rewindChildren.keys());

      // Apply the original method first
      const result = original.apply(this, nodes);

      // Remove all old rewindable children from state
      oldChildIds.forEach(id => this.#rewindable.removeRewindable(id));

      // Add new rewindable children to state
      const rewindChildren = rewindableNodes.map(node => {
        // Ensure each node has a unique identifier
        node.id = node.id || cel.randomId();
        return {id: node.id, child: node};
      });

      this.#rewindable.addRewindChildren(rewindChildren);

      return result;
    } catch (error) {
      console.error("Error during `replaceChildren` operation:", error);
      throw error;
    }
  }
}

export default wrappers;
