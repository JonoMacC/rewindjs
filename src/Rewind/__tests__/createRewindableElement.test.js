import { describe, it, expect, vi, beforeEach } from "vitest";
import { Window } from "happy-dom";
import { createRewindableElement } from "../createRewindableElement.js";
import {generateKey} from "../__utils__/generateKey";

// Set up a DOM environment
const window = new Window();
global.window = window;
global.document = window.document;
global.HTMLElement = window.HTMLElement;
global.KeyboardEvent = window.KeyboardEvent;
global.customElements = window.customElements;

// Explicitly add CustomEvent to the global object
global.CustomEvent = window.CustomEvent;

class BaseClass extends HTMLElement {
  #content = "";
  #left = 0;
  #top = 0;
  #selected = false;

  set content(value) {
    this.#content = value;
  }

  get content() {
    return this.#content;
  }

  set left(value) {
    this.#left = value;
  }

  get left() {
    return this.#left;
  }

  set top(value) {
    this.#top = value;
  }

  get top() {
    return this.#top;
  }

  set selected(value) {
    this.#selected = value;
  }

  get selected() {
    return this.#selected;
  }

  setPosition(top, left) {
    this.#top = top;
    this.#left = left;
  }
}

class AltClass extends HTMLElement {
  #value;

  constructor(value = 0) {
    super();
    this.#value = value;
  }

  set value(value) {
    this.#value = value;
  }

  get value() {
    return this.#value;
  }
}

// Register the custom elements
customElements.define("base-class", BaseClass);
customElements.define("alt-class", AltClass);

describe("createRewindableElement", () => {
  describe("Basic Rewind Functionality", () => {
    let RewindableElement;
    let component;

    beforeEach(() => {
      RewindableElement = createRewindableElement(BaseClass, {
        observe: ["content", "top", "left", "selected"],
        coalesce: ["setPosition"],
        debounce: {
          content: 400,
        },
      });

      // Instantiate the component
      component = new RewindableElement();
    });

    it("should record initial state", () => {
      expect(component.rewindHistory.length).toBe(1);
      const initialState = {
        content: "",
        top: 0,
        left: 0,
        selected: false,
        children: new Map()
      };
      expect(component.rewindHistory[0]).toStrictEqual(initialState);
    });

    it("should record changes to observed properties", () => {
      component.top = 100;
      expect(component.rewindHistory.length).toBe(2);
      expect(component.rewindHistory[0].top).toBe(0);
      expect(component.rewindHistory[1].top).toBe(100);
    });

    it("should undo and redo changes", () => {
      component.top = 100;
      component.undo();
      expect(component.top).toBe(0);
      component.redo();
      expect(component.top).toBe(100);
    });

    it("should coalesce method calls", () => {
      component.setPosition(10, 20);
      expect(component.rewindHistory.length).toBe(2);
      expect(component.rewindHistory[1]).toStrictEqual({
        content: "",
        top: 10,
        left: 20,
        selected: false,
        children: new Map()
      });
    });

    it("should handle debounced properties", async () => {
      // Use fake timers for testing
      vi.useFakeTimers();

      // Change the content
      component.content = "Hello";
      component.content = "Hello World";

      // Advance fake timers by the debounce time
      vi.advanceTimersByTime(400);

      expect(component.rewindHistory.length).toBe(2);

      // Restore usage of real timers
      vi.useRealTimers();
    });

    it("should handle non-debounced properties", () => {
      component.selected = true;
      component.selected = false;
      expect(component.rewindHistory.length).toBe(3);
    });

    it("should suspend and resume recording", () => {
      component.suspend();
      component.top = 100;
      expect(component.rewindHistory.length).toBe(1);
      component.resume();
      component.top = 200;
      expect(component.rewindHistory.length).toBe(2);
      expect(component.rewindHistory[0]).toStrictEqual({
        content: "",
        top: 0,
        left: 0,
        selected: false,
        children: new Map()
      });
      expect(component.rewindHistory[1]).toStrictEqual({
        content: "",
        top: 200,
        left: 0,
        selected: false,
        children: new Map()
      });
    });

    it("should travel to a specific index", () => {
      component.top = 100;
      component.top = 200;
      component.travel(1);
      expect(component.top).toBe(100);
      component.travel(2);
      expect(component.top).toBe(200);
    });

    it("should drop states at a specific index", () => {
      component.top = 100;
      component.top = 200;
      component.drop(1);
      expect(component.rewindHistory.length).toBe(2);
      expect(component.top).toBe(200);
    });

    it("should handle initial history and index", () => {
      const history = [
        { content: "First", top: 0, left: 0, selected: false, children: new Map() },
        { content: "Second", top: 10, left: 10, selected: true, children: new Map() },
        { content: "Third", top: 20, left: 20, selected: false, children: new Map() },
      ];
      const index = 1;

      component = new RewindableElement({
        history,
        index
      });

      expect(component.rewindHistory).toEqual(history);
      expect(component.content).toBe("Second");
      expect(component.top).toBe(10);
      expect(component.left).toBe(10);
      expect(component.selected).toBe(true);

      // Verify that the current index is correct
      expect(component.rewindIndex).toBe(index);

      // Verify that no additional state was recorded
      expect(component.rewindHistory.length).toBe(history.length);

      // Verify undo functionality
      component.undo();
      expect(component.content).toBe("First");
      expect(component.top).toBe(0);
      expect(component.left).toBe(0);
      expect(component.selected).toBe(false);

      // Verify redo functionality
      component.redo();
      expect(component.content).toBe("Second");
      expect(component.top).toBe(10);
      expect(component.left).toBe(10);
      expect(component.selected).toBe(true);

      // Verify we can redo to the last state
      component.redo();
      expect(component.content).toBe("Third");
      expect(component.top).toBe(20);
      expect(component.left).toBe(20);
      expect(component.selected).toBe(false);
    });

    it("should record a change made at the end of the redo stack", () => {
      // Use fake timers for testing
      vi.useFakeTimers();

      const history = [
        { content: "He", top: 0, left: 0, selected: false, children: new Map() },
        { content: "Hell", top: 0, left: 0, selected: false, children: new Map() },
        { content: "Hello", top: 0, left: 0, selected: false, children: new Map() },
      ];
      const index = 2;

      component = new RewindableElement({
        history,
        index,
      });

      // Undo to initial state and redo to the end
      component
        .undo() // "Hell"
        .undo() // "He"
        .redo() // "Hell"
        .redo(); // "Hello"

      // Verify that we have returned to the last state
      console.log(component.rewindHistory);
      expect(component.rewindHistory.length).toBe(3);
      expect(component.rewindHistory[2].content).toBe("Hello");
      expect(component.rewindIndex).toBe(2);

      // Set the content to a new value
      component.content = "Hello World";

      // Advance fake timers by the debounce time
      vi.advanceTimersByTime(400);

      expect(component.rewindHistory.length).toBe(4);
      expect(component.rewindHistory[3].content).toBe("Hello World");
      expect(component.rewindIndex).toBe(3);

      // Restore usage of real timers
      vi.useRealTimers();
    });

    it("should undo and redo from keyboard events", () => {
      const history = [
        { content: "He", top: 0, left: 0, selected: false, children: new Map()  },
        { content: "Hell", top: 0, left: 0, selected: false, children: new Map()  },
        { content: "Hello", top: 0, left: 0, selected: false, children: new Map()  },
        { content: "Hello World", top: 0, left: 0, selected: false, children: new Map()  },
      ];

      const index = 3;

      component = new RewindableElement({
        history,
        index,
      });

      document.body.appendChild(component);

      // Create Undo and Redo Key Events
      const undoEvent = () =>new KeyboardEvent("keydown", { key: "z", ctrlKey: true });
      const redoEvent = () => new KeyboardEvent("keydown", { key: "y", ctrlKey: true });

      const undoSpy = vi.spyOn(component, "undo");
      const redoSpy = vi.spyOn(component, "redo");

      // Verify that the initial state is correct
      expect(component.rewindHistory.length).toBe(4);
      expect(component.rewindHistory[3].content).toBe("Hello World");
      expect(component.rewindIndex).toBe(3);

      // Verify that the undo event works
      component.dispatchEvent(undoEvent());
      expect(undoSpy).toHaveBeenCalled();
      expect(component.rewindHistory[2].content).toBe("Hello");
      expect(component.rewindIndex).toBe(2);

      // Verify that the redo event works
      component.dispatchEvent(redoEvent());
      expect(redoSpy).toHaveBeenCalled();
      expect(component.rewindHistory[3].content).toBe("Hello World");
      expect(component.rewindIndex).toBe(3);

      // Verify that we can undo to the end
      component.dispatchEvent(undoEvent());
      component.dispatchEvent(undoEvent());
      component.dispatchEvent(undoEvent());
      expect(undoSpy).toHaveBeenCalledTimes(4);
      expect(component.rewindHistory[0].content).toBe("He");
      expect(component.rewindIndex).toBe(0);

      // Verify that we can redo to the end
      component.dispatchEvent(redoEvent());
      component.dispatchEvent(redoEvent());
      component.dispatchEvent(redoEvent());
      expect(redoSpy).toHaveBeenCalledTimes(4);
      expect(component.rewindHistory[3].content).toBe("Hello World");
      expect(component.rewindIndex).toBe(3);
    });
  });
  describe("Composite Rewind Functionality", () => {
    let RewindableElement, component;

    beforeEach(() => {
      RewindableElement = createRewindableElement(BaseClass, {
        observe: ["top", "left", "content"],
        coalesce: ["setPosition"],
        debounce: {
          content: 400,
        }
      });
      component = new RewindableElement();
    });

    it("should handle adding children", () => {
      const child = new RewindableElement();
      component.addRewindable("1", child);

      // Verify that the child was added to the state
      expect(component.rewindChildren.get("1")).toStrictEqual(child);

      // Verify that the child was added to the composite
      expect(component.contains(child)).toBe(true);
    });

    it("should handle removing children", () => {
      const child = new RewindableElement();
      component.addRewindable("1", child);
      component.removeRewindable("1");

      // Verify that the child was removed from the state
      expect(component.rewindChildren.get("1")).toBeUndefined();

      // Verify that the child was removed from the composite
      expect(component.contains(child)).toBe(false);
    });

    it("should add multiple children of different types", () => {
      const AltRewindableElement = createRewindableElement(AltClass, {
        observe: ["value"],
      });

      const child1 = new RewindableElement();
      const child2 = new AltRewindableElement();

      component
        .addRewindable("1", child1)
        .addRewindable("2", child2);

      expect(component.rewindChildren.size).toBe(2);
      expect(component.rewindChildren.get("1")).toStrictEqual(child1);
      expect(component.rewindChildren.get("2")).toStrictEqual(child2);
    });

    it("should register children of different types", () => {
      const AltRewindableElement = createRewindableElement(AltClass, {
        observe: ["value"],
      });

      const child1 = new RewindableElement();
      const child2 = new AltRewindableElement();

      component
        .addRewindable("1", child1)
        .addRewindable("2", child2);

      // Verify children were correctly registered
      const key1 = generateKey(child1.constructor);
      const key2 = generateKey(child2.constructor);

      expect(component.rewindState.children.get("1").type).toBe(key1);
      expect(component.rewindState.children.get("2").type).toBe(key2);
    });
  });

  describe("Child State Restoration", () => {
    let RewindableElement, component, child;

    beforeEach(() => {
      RewindableElement = createRewindableElement(AltClass, {
        observe: ['value']
      });

      component = new RewindableElement();
      child = new RewindableElement();
    });

    it("should record when a child is added and removed", () => {
      // Add the child
      component.addRewindable("1", child);

      // Remove the child
      component.removeRewindable("1");

      // Verify that no children are present
      expect(component.rewindChildren.size).toBe(0);

      // Verify that adding and removing children updates the history
      expect(component.rewindHistory.length).toBe(3);
      expect(component.rewindHistory[0].children.size).toBe(0);
      expect(component.rewindHistory[1].children.size).toBe(1);
      expect(component.rewindHistory[2].children.size).toBe(0);
    });

    it("should restore a deleted child from history", () => {
      // Add the child
      component.addRewindable("1", child);

      // Remove the child
      component.removeRewindable("1");

      // Verify that no children are present
      expect(component.rewindChildren.size).toBe(0);
      expect(component.rewindIndex).toBe(2);

      // Undo the removal
      component.undo();

      // Verify that the composite traveled to the previous state
      expect(component.rewindIndex).toBe(1);

      // Verify that the child is in history
      expect(component.rewindHistory[1].children.size).toBe(1);

      // Verify that the current state has the child
      expect(component.rewindState.children.size).toBe(1);

      const originalChild = child;
      const restoredChild = component.rewindChildren.get("1");

      // Verify that the restored child and the original child have the same class
      expect(originalChild.constructor).toBe(restoredChild.constructor);

      // Verify that the restored child and the original child share the same prototype
      expect(Object.getPrototypeOf(originalChild)).toBe(Object.getPrototypeOf(restoredChild));

      // Verify that the restored child and the original child have the same properties
      expect(Object.getOwnPropertyNames(originalChild)).toEqual(Object.getOwnPropertyNames(restoredChild));

      // Verify that the restored child is an instance of the RewindableElement
      expect(restoredChild instanceof RewindableElement).toBe(true);
    });

    it("should insert children in the correct position", () => {
      // Add the child
      component.addRewindable("1", child);

      // Add a second child
      const child2 = new RewindableElement();
      component.addRewindable("2", child2);

      // Add a third child
      const child3 = new RewindableElement();
      component.addRewindable("3", child3);

      // Verify the child positions in the composite
      expect(component.children[0]).toBe(child);
      expect(component.children[1]).toBe(child2);
      expect(component.children[2]).toBe(child3);

      // Verify the child positions in the composite state
      expect(component.rewindState.children.get("1").position).toBe(0);
      expect(component.rewindState.children.get("2").position).toBe(1);
      expect(component.rewindState.children.get("3").position).toBe(2);
    });

    it("should restore the history of a deleted child", () => {
      // Add the child
      component.addRewindable("1", child);

      // Change the value of the child
      child.value = 7;

      // Remove the child
      component.removeRewindable("1");

      // Verify that the child's last state was recorded to the composite history
      const historyBeforeRemoval = component.rewindHistory[2];
      const lastChildHistory = historyBeforeRemoval.children.get("1").history;
      expect(lastChildHistory.length).toBe(2);
      expect(lastChildHistory[0].value).toBe(0);
      expect(lastChildHistory[1].value).toBe(7);

      // Restore the child
      component.undo();

      // Verify the child's history and current state
      const addedChild = component.rewindChildren.get("1");
      expect(addedChild.value).toBe(7);
      expect(addedChild.rewindHistory.length).toBe(2);
      expect(addedChild.rewindHistory[0].value).toBe(0);
      expect(addedChild.rewindHistory[1].value).toBe(7);
    });

    it("should restore a deleted child in the correct position", () => {
      // Add a child
      component.addRewindable("1", child);

      // Verify the child's position is 0
      expect(component.rewindState.children.get("1").position).toBe(0);

      // Add a second child
      const child2 = new RewindableElement();
      component.addRewindable("2", child2);

      // Verify the second child's position is 1
      expect(component.rewindState.children.get("2").position).toBe(1);

      // Remove the first child
      component.removeRewindable("1");

      // Undo the removal
      component.undo();

      // Verify that the child's position is 0
      expect(component.rewindState.children.get("1").position).toBe(0);

      // Verify that the child was inserted in the correct position in the composite
      const firstChild = component.children[0];
      expect(firstChild).toEqual(child);

      // Verify the rewind index
      expect(component.rewindIndex).toBe(2);

      // Verify both children are present in the history at the current index
      expect(component.rewindHistory[2].children.size).toBe(2);

      // Verify that both children are in the composite
      expect(component.children.length).toBe(2);

      // Verify that both children are in the composite's current state
      expect(component.rewindState.children.size).toBe(2);
      expect(component.rewindChildren.size).toBe(2);

      // Remove the second child
      component.removeRewindable("2");

      // Undo the removal
      component.undo();

      // Verify that the second child's position is 1
      expect(component.rewindState.children.get("2").position).toBe(1);

      // Verify that the second child was inserted in the correct position in the composite
      const secondChild = component.children[1];
      expect(secondChild).toEqual(child2);
    });
  });
});
