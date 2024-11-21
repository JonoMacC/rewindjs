import {rewind} from "./rewind.js";

// Utilities
import cel from "../lib/celerity/cel.js";

// Components
import {DOMElement} from "./DOMElement.js";

const scheduleNextFrame =
  typeof requestAnimationFrame !== "undefined"
    ? requestAnimationFrame
    : (cb) => setTimeout(cb, 0);

export function RewindComposite(target, ElementClass = DOMElement) {
  return class extends rewind(target) {
    #initialized = false;
    #selectors;
    #createChild;
    #childOptions;
    #focusable;
    #element;

    constructor(options = {}) {
      super();
      this.#selectors = options.selectors || [];
      this.#createChild = options.createChild || this.defaultCreateChild;
      this.#childOptions = options.childOptions || {};
      this.#focusable =
        typeof document !== "undefined" &&
        typeof this.focus === "function" &&
        this instanceof HTMLElement;
      this.#element = new ElementClass(this);
    }

    defaultCreateChild(initialState, initialHistory, options) {
      throw new Error(
        "createChild must be provided in options or implemented in the subclass"
      );
    }

    get selectors() {
      return this.#selectors;
    }

    get #children() {
      if (this.#selectors.length === 0) {
        return this.#element.children;
      }

      return this.#element.children.filter((child) =>
        this.#selectors.some((selector) => {
          console.log("Selector:", selector, "Type:", typeof selector);
          try {
            return this.#element.matches(child, selector);
          } catch (error) {
            console.error("Error in matches:", error);
            return false;
          }
        })
      );
    }

    get initialized() {
      return this.#initialized;
    }

    get snapshot() {
      return {
        children: new Map(
          this.#children.map((child, index) => [
            child.id,
            {
              index: child.rewindIndex,
              position: index,
              history: child.rewindHistory,
            },
          ])
        ),
      };
    }

    set snapshot(newState) {
      const currentChildren = new Set(this.#children.map((child) => child.id));
      const snapshotChildren = new Set(newState.children.keys());

      // Remove children that are not in the snapshot
      for (const childId of currentChildren) {
        if (!snapshotChildren.has(childId)) {
          const child = this.#element.find(`#${childId}`);
          child.remove();
        }
      }

      // Add or update children from the snapshot
      for (const [childId, childSnapshot] of newState.children) {
        let child = this.#element.find(`#${childId}`);

        if (!child) {
          child = this.#restore(childId, childSnapshot);
        } else {
          // Move existing child to correct position if needed
          const currentIndex = this.#children.indexOf(child);
          if (currentIndex !== childSnapshot.position) {
            this.#element.insert(
              child,
              this.#children[childSnapshot.position] || null
            );
          }
        }

        // Update child's state if needed
        if (
          child.rewindIndex !== childSnapshot.index ||
          !cel.deepEqual(child.rewindHistory, childSnapshot.history)
        ) {
          child.rewindHistory = childSnapshot.history;
          child.travel(childSnapshot.index);
        }
      }
    }

    delete(event) {
      console.log({ selectors: this.#selectors });
      const selectorString = this.#selectors.join(",");
      console.log({ selectorString });
      const child = event.target.closest(selectorString);
      if (!child) return;

      const previousChild = this.#element.previous(child);

      this.record();

      this.#element.remove(child);

      // Focus previous child if any, else focus this
      if (previousChild) {
        previousChild.focus();
      } else {
        this.#focusable && this.focus();
      }

      return this;
    }

    spawn(initialState = {}, options = {}) {
      const child = this.#createChild(initialState, {
        ...this.#childOptions,
        ...options,
        history: options.history || [],
        index: options.index !== undefined ? options.index : -1,
      });
      console.log(child);
      if (!("id" in child) || !child.id) {
        child.id = cel.randomId();
      }
      this.#element.append(child);
      this.record();
      return child;
    }

    #restore(childId, childSnapshot) {
      const { history, index, position } = childSnapshot;

      // If a more recent child history exists, merge it
      const recentHistory = this.#lastChildHistory(childId);
      const mergedHistory = this.#mergeHistories(history, recentHistory);
      const child = this.#createChild(
        mergedHistory[index],
        mergedHistory,
        this.#childOptions
      );

      // Insert child in correct position using the ChildManager
      const referenceNode = this.#element.children[position];
      if (referenceNode) {
        this.#element.insert(child, referenceNode);
      } else {
        this.#element.append(child);
      }

      child.id = childId;
      child.travel(index);

      return child;
    }

    #lastChildHistory(id) {
      // Traverse the undo/redo history in reverse order
      for (let i = this.rewindIndex; i >= 0; i--) {
        const history = this.rewindHistory[i];
        if (history.children.has(id)) {
          return history.children.get(id).history;
        }
      }

      return null;
    }

    #mergeHistories(a, b) {
      if (b === undefined || b === null) return a;
      // Find the last common state between the two histories
      const lastCommonIndex =
        a.findIndex((state, index) => !cel.deepEqual(state, b[index])) - 1;

      // Merge the histories, keeping all states after the last common one
      return [
        ...a.slice(0, lastCommonIndex + 1),
        ...b.slice(lastCommonIndex + 1),
      ];
    }

    connectedCallback() {
      super.connectedCallback();
      this.#initialize();
    }

    #initialize() {
      if (this.#initialized) return;

      if (this.#children.every((child) => child.rewindIndex !== undefined)) {
        this.#initialized = true;
        this.record();
      } else {
        // If not all children are ready, retry in the next frame
        scheduleNextFrame(() => this.#initialize());
      }
    }
  };
}
