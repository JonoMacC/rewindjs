import {beforeEach, describe, expect, it} from "vitest";
import {createRewindable} from "../createRewindable.js";
import {createRewindableComposite} from "../createRewindableComposite.js";
import {generateKey} from "../generateKey.js";

class BaseClass {
  #left = 0;
  #top = 0;
  #title = "";

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

  set title(value) {
    this.#title = value;
  }

  get title() {
    return this.#title;
  }

  setPosition(top, left) {
    this.#top = top;
    this.#left = left;
  }
}

class AltClass {
  #value = 0;

  constructor(value) {
    this.#value = value || 0;
  }

  set value(value) {
    this.#value = value;
  }

  get value() {
    return this.#value;
  }
}

describe('createRewindableComposite', () => {
  describe("Basic Rewind Functionality", () => {
    let RewindableComposite, component;

    beforeEach(() => {
      RewindableComposite = createRewindableComposite(BaseClass, {
        observe: ["top", "left", "title"],
        coalesce: ["setPosition"],
      });
      component = new RewindableComposite();
    });

    it("should record initial state", () => {
      expect(component.history.length).toBe(1);
      const initialState = { left: 0, top: 0, title: "", children: new Map() };
      expect(component.history[0]).toStrictEqual(initialState);
    });

    it("should record changes to observed properties", () => {
      component.top = 100;
      console.log(component.top);
      console.log(component.history);
      expect(component.history.length).toBe(2);
      expect(component.history[0].top).toBe(0);
      expect(component.history[1].top).toBe(100);
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
      expect(component.history.length).toBe(2);
      expect(component.history[1]).toStrictEqual({ top: 10, left: 20, title: "", children: new Map() });
    });

    it("should suspend and resume recording", () => {
      component.suspend();
      component.top = 100;
      expect(component.history.length).toBe(1);
      component.resume();
      component.top = 200;
      expect(component.history.length).toBe(2);
      expect(component.history[0]).toStrictEqual({ top: 0, left: 0, title: "", children: new Map() });
      expect(component.history[1]).toStrictEqual({ top: 200, left: 0, title: "", children: new Map() });
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
      expect(component.history.length).toBe(2);
      expect(component.top).toBe(200);
    });

    it("should handle initial history and index", () => {
      const history = [
        { top: 0, left: 0, title: "First", children: new Map() },
        { top: 10, left: 10, title: "Second", children: new Map() },
        { top: 20, left: 20, title: "Third", children: new Map() },
      ];
      const index = 1;

      component = new RewindableComposite({
        history,
        index,
      });

      expect(component.history).toEqual(history);
      expect(component.title).toBe("Second");
      expect(component.top).toBe(10);
      expect(component.left).toBe(10);

      // Verify that the current index is correct
      expect(component.index).toBe(index);

      // Verify that no additional state was recorded
      expect(component.history.length).toBe(history.length);

      // Verify undo functionality
      component.undo();
      expect(component.title).toBe("First");
      expect(component.top).toBe(0);
      expect(component.left).toBe(0);

      // Verify redo functionality
      component.redo();
      expect(component.title).toBe("Second");
      expect(component.top).toBe(10);
      expect(component.left).toBe(10);

      // Verify we can redo to the last state
      component.redo();
      expect(component.title).toBe("Third");
      expect(component.top).toBe(20);
      expect(component.left).toBe(20);
    });

    it("should record a change made at the end of the redo stack", () => {
      const history = [
        { title: "He" },
        { title: "Hell" },
        { title: "Hello" },
      ];
      const index = 2;

      component = new RewindableComposite({
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
      expect(component.history.length).toBe(3);
      expect(component.history[2].title).toBe("Hello");
      expect(component.index).toBe(2);

      // Set the content to a new value
      component.title = "Hello World";
      expect(component.history.length).toBe(4);
      expect(component.history[3].title).toBe("Hello World");
      expect(component.index).toBe(3);
    });
  });

  describe("Basic Child Management", () => {
    let Rewindable, RewindableComposite, composite;

    beforeEach(() => {
      Rewindable = createRewindable(BaseClass, {
        observe: ["top", "left", "title"],
        coalesce: ["setPosition"],
      });

      RewindableComposite = createRewindableComposite(BaseClass, {
        observe: ["top", "left", "title"],
        coalesce: ["setPosition"],
      });

      composite = new RewindableComposite();
    });

    it("should handle adding children", () => {
      const child = new Rewindable();
      composite.addChild("1", child);

      // Verify that the child was added
      expect(composite.children.get("1")).toStrictEqual(child);
    });

    it("should handle removing children", () => {
      const child = new Rewindable();
      composite.addChild("1", child);
      composite.removeChild("1");

      // Verify that the child was removed
      expect(composite.children.get("1")).toBeUndefined();
    });

    it("should add multiple children of different types", () => {
      const AltRewindable = createRewindable(AltClass, {
        observe: ["value"],
      });

      const child1 = new Rewindable();
      const child2 = new AltRewindable();

      composite
        .addChild("1", child1)
        .addChild("2", child2);

      expect(composite.children.size).toBe(2);
      expect(composite.children.get("1")).toStrictEqual(child1);
      expect(composite.children.get("2")).toStrictEqual(child2);
    });

    it("should register children of different types", () => {
      const AltRewindable = createRewindable(AltClass, {
        observe: ["value"],
      });

      const child1 = new Rewindable();
      const child2 = new AltRewindable();

      composite
        .addChild("1", child1)
        .addChild("2", child2);

      // Verify children were correctly registered
      const key1 = generateKey(child1.constructor);
      const key2 = generateKey(child2.constructor);

      expect(composite.state.children.get("1").type).toBe(key1);
      expect(composite.state.children.get("2").type).toBe(key2);
    });
  });

  describe("Child State Restoration", () => {
    let Rewindable, RewindableComposite, composite, child;

    beforeEach(() => {
      Rewindable = createRewindable(AltClass, {
        observe: ['value']
      });

      RewindableComposite = createRewindableComposite(AltClass, {
        observe: ['value']
      });

      composite = new RewindableComposite();
      child = new Rewindable();
    });

    it("should record when a child is added and removed", () => {
      // Add the child
      composite.addChild("1", child);

      // Remove the child
      composite.removeChild("1");

      // Verify that no children are present
      expect(composite.children.size).toBe(0);

      // Verify that adding and removing children updates the history
      expect(composite.history.length).toBe(3);
      expect(composite.history[0].children.size).toBe(0);
      expect(composite.history[1].children.size).toBe(1);
      expect(composite.history[2].children.size).toBe(0);
    });

    it("should restore a deleted child from history", () => {
      // Add the child
      composite.addChild("1", child);

      // Remove the child
      composite.removeChild("1");

      // Verify that no children are present
      expect(composite.children.size).toBe(0);
      expect(composite.index).toBe(2);

      // Undo the removal
      composite.undo();

      // Verify that the composite traveled to the previous state
      expect(composite.index).toBe(1);

      // Verify that the child is in history
      expect(composite.history[1].children.size).toBe(1);

      // Verify that the current state has the child
      expect(composite.state.children.size).toBe(1);

      const originalChild = child;
      const restoredChild = composite.children.get("1");

      /**
       * originalChild and restoredChild cannot be directly compared using toEqual because
       * toEqual compares functions by reference, not by value, and therefore it will fail
       * in comparing the contents of the methods on each instance.
       */

      // Verify that the restored child and the original child have the same class
      expect(originalChild.constructor).toBe(restoredChild.constructor);

      // Verify that the restored child and the original child share the same prototype
      expect(Object.getPrototypeOf(originalChild)).toBe(Object.getPrototypeOf(restoredChild));

      // Verify that the restored child and the original child have the same properties
      expect(Object.getOwnPropertyNames(originalChild)).toEqual(Object.getOwnPropertyNames(restoredChild));

      // Verify that the restored child and the original child have the same values
      // Compare the intercept function as a string to avoid comparing functions by reference
      const plainObj1 = { ...originalChild, intercept: originalChild.intercept.toString() };
      const plainObj2 = { ...restoredChild, intercept: restoredChild.intercept.toString() };
      expect(plainObj1).toEqual(plainObj2);
    });

    it("should restore the history of a deleted child", () => {
      // Add the child
      composite.addChild("1", child);

      // Change the value of the child
      child.value = 7;

      // Remove the child
      composite.removeChild("1");

      // Verify that the child's last state was recorded to the composite history
      const historyBeforeRemoval = composite.history[2];
      const lastChildHistory = historyBeforeRemoval.children.get("1").history;
      expect(lastChildHistory.length).toBe(2);
      expect(lastChildHistory[0].value).toBe(0);
      expect(lastChildHistory[1].value).toBe(7);

      // Restore the child
      composite.undo();

      // Verify the child's history and current state
      const addedChild = composite.children.get("1");
      expect(addedChild.value).toBe(7);
      expect(addedChild.history.length).toBe(2);
      expect(addedChild.history[0].value).toBe(0);
      expect(addedChild.history[1].value).toBe(7);
    });
  });
});

