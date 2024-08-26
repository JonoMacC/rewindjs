import { Rewind } from "./Rewind.js";
import { deepEqual, randomId } from "../util/math.js";

export function RewindComposite(BaseComponent) {
  return class extends Rewind(BaseComponent) {
    #initialized = false;
    #selectors;
    #createChild;
    #childOptions;

    constructor(options = {}) {
      super();
      this.#selectors = options.selectors || [];
      this.#createChild = options.createChild || this.defaultCreateChild;
      this.#childOptions = options.childOptions || {};
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
        return Array.from(this.children);
      }

      return Array.from(this.children).filter((child) =>
        this.#selectors.some((selector) => child.matches(selector))
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

    set snapshot(newSnapshot) {
      const currentChildren = new Set(this.#children.map((child) => child.id));
      const snapshotChildren = new Set(newSnapshot.children.keys());

      // Remove children that are not in the snapshot
      for (const childId of currentChildren) {
        if (!snapshotChildren.has(childId)) {
          const child = this.querySelector(`#${childId}`);
          child.remove();
        }
      }

      // Add or update children from the snapshot
      for (const [childId, childSnapshot] of newSnapshot.children) {
        let child = this.querySelector(`#${childId}`);

        if (!child) {
          child = this.#restore(childId, childSnapshot);
        } else {
          // Move existing child to correct position if needed
          const currentIndex = this.#children.indexOf(child);
          if (currentIndex !== childSnapshot.position) {
            this.insertBefore(
              child,
              this.#children[childSnapshot.position] || null
            );
          }
        }

        // Update child's state if needed
        if (
          child.rewindIndex !== childSnapshot.index ||
          !deepEqual(child.rewindHistory, childSnapshot.history)
        ) {
          child.rewindHistory = childSnapshot.history;
          child.travel(childSnapshot.index);
        }
      }
    }

    delete(event) {
      const child = event.target.closest(this.#selectors.join(","));
      if (!child) return;

      const previousChild = child.previousElementSibling;

      this.record();

      // Remove child
      child.remove();

      // Focus previous child if any, else focus this
      if (previousChild) {
        previousChild.focus();
      } else {
        this.focus();
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
        child.id = randomId();
      }
      this.appendChild(child);
      this.record();
      return child;
    }

    #restore(childId, childSnapshot) {
      const { history, index, position } = childSnapshot;
      let mergedHistory = history;

      // If a more recent child history exists, merge it
      const recentHistory = this.#lastChildHistory(childId);
      mergedHistory = this.#mergeHistories(history, recentHistory);

      const child = this.#createChild(
        mergedHistory[index],
        mergedHistory,
        this.#childOptions
      );

      // Insert child in correct position in the DOM
      const referenceNode = this.children[position];
      if (referenceNode) {
        this.insertBefore(child, referenceNode);
      } else {
        this.appendChild(child);
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
          const childHistory = history.children.get(id).history;
          return childHistory;
        }
      }

      return null;
    }

    #mergeHistories(a, b) {
      if (b === undefined || b === null) return a;
      // Find the last common state between the two histories
      const lastCommonIndex =
        a.findIndex((state, index) => !deepEqual(state, b[index])) - 1;

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
        requestAnimationFrame(() => this.#initialize());
      }
    }
  };
}
