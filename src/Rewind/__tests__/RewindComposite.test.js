import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import { RewindComposite } from "../RewindComposite.js";

describe("RewindComposite", () => {
  let window, document, BaseComponent, RewindCompositeComponent, component;

  beforeEach(() => {
    const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
      url: "http://localhost",
    });
    window = dom.window;
    document = window.document;
    global.document = document;
    global.window = window;
    global.CustomEvent = window.CustomEvent;

    // Create a mock HTMLElement
    class MockHTMLElement {
      constructor() {
        this.children = [];
        this.className = "";
        this.id = "";
      }
      appendChild(child) {
        this.children.push(child);
      }
      querySelector(selector) {
        // Simple implementation to match by id or class
        if (selector.startsWith("#")) {
          return this.children.find((child) => child.id === selector.slice(1));
        } else if (selector.startsWith(".")) {
          return this.children.find((child) =>
            child.className.includes(selector.slice(1))
          );
        }
        return null;
      }
    }

    // Use MockHTMLElement instead of window.HTMLElement
    BaseComponent = class extends MockHTMLElement {
      constructor() {
        super();
      }
    };

    RewindCompositeComponent = RewindComposite(BaseComponent);
    component = new RewindCompositeComponent();
  });

  afterEach(() => {
    delete global.document;
    delete global.window;
    delete global.CustomEvent;
  });

  describe("Constructor and Initialization", () => {
    it("should initialize with default options", () => {
      expect(component.selectors).toEqual([]);
      expect(component.initialized).toBe(false);
    });

    it("should initialize with custom selectors", () => {
      const customComponent = new RewindCompositeComponent({
        selectors: [".test"],
      });
      expect(customComponent.selectors).toEqual([".test"]);
    });

    it("should initialize with custom createChild function", () => {
      const createChild = vi.fn((state, options) => ({
        ...options,
        ...state,
      }));
      const customComponent = new RewindCompositeComponent({ createChild });
      expect(createChild).not.toHaveBeenCalled();
      customComponent.spawn();
      expect(createChild).toHaveBeenCalledTimes(1);
      expect(createChild).toHaveBeenCalledWith({}, { history: [], index: -1 });
    });

    it("should initialize with custom childOptions", () => {
      const createChild = vi.fn((state, options) => ({
        ...options,
        ...state,
      }));
      const childOptions = { test: true };
      const customComponent = new RewindCompositeComponent({
        createChild,
        childOptions,
      });
      const child = customComponent.spawn();
      expect(createChild).toHaveBeenCalledTimes(1);

      // Log the arguments passed to createChild for debugging
      console.log("createChild called with:", createChild.mock.calls[0]);

      // Check the structure of the spawnedChild
      console.log({ child });

      expect(createChild).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ history: [], index: -1, test: true })
      );
      expect(child).toHaveProperty("test", true);
    });
  });

  describe("Selectors and Children", () => {
    it("should return all children when no selectors are provided", () => {
      const createChild = vi.fn((state, options) =>
        document.createElement("div")
      );
      const customComponent = new RewindCompositeComponent({
        createChild,
      });
      customComponent.spawn();
      customComponent.spawn();
      expect(customComponent.snapshot.children.size).toBe(2);
    });

    it("should return only children matching selectors when provided", () => {
      const createChild = vi.fn((state, options) =>
        document.createElement("div")
      );
      const customComponent = new RewindCompositeComponent({
        selectors: [".test"],
        createChild,
      });
      const child1 = customComponent.spawn();
      child1.className = "test";
      const child2 = customComponent.spawn();
      vi.spyOn(child1, "matches").mockReturnValue(true);
      vi.spyOn(child2, "matches").mockReturnValue(false);
      expect(customComponent.snapshot.children.size).toBe(1);
    });
  });

  describe("Snapshot Functionality", () => {
    it("should correctly generate a snapshot of current state", () => {
      const child = { id: "test", rewindIndex: 0, rewindHistory: [] };
      component.appendChild(child);
      const snapshot = component.snapshot;
      expect(snapshot.children.size).toBe(1);
      expect(snapshot.children.get("test")).toBeDefined();
    });

    it("should correctly restore state from a snapshot", () => {
      const snapshot = {
        children: new Map([["test", { index: 0, position: 0, history: [] }]]),
      };
      component.snapshot = snapshot;
      expect(component.children.length).toBe(1);
    });

    it("should handle adding new children from snapshot", () => {
      const snapshot = {
        children: new Map([
          ["test1", { index: 0, position: 0, history: [] }],
          ["test2", { index: 0, position: 1, history: [] }],
        ]),
      };
      component.snapshot = snapshot;
      expect(component.children.length).toBe(2);
    });

    it("should handle removing children not in snapshot", () => {
      const child1 = { id: "test1", remove: vi.fn() };
      const child2 = { id: "test2", remove: vi.fn() };
      component.appendChild(child1);
      component.appendChild(child2);
      const snapshot = {
        children: new Map([["test1", { index: 0, position: 0, history: [] }]]),
      };
      component.snapshot = snapshot;
      expect(child2.remove).toHaveBeenCalled();
    });

    it("should update existing children's positions and states", () => {
      const child = {
        id: "test",
        rewindIndex: 0,
        rewindHistory: [],
        travel: vi.fn(),
      };
      component.appendChild(child);
      const snapshot = {
        children: new Map([
          ["test", { index: 1, position: 0, history: [{ state: "new" }] }],
        ]),
      };
      component.snapshot = snapshot;
      expect(child.travel).toHaveBeenCalledWith(1);
      expect(child.rewindHistory).toEqual([{ state: "new" }]);
    });
  });

  describe("Delete Functionality", () => {
    it("should remove a child element when delete is called", () => {
      const child = document.createElement("div");
      child.id = "test";
      component.appendChild(child);
      const event = { target: child };
      component.delete(event);
      expect(component.children.length).toBe(0);
    });

    it("should focus on previous sibling after deletion", () => {
      const child1 = document.createElement("div");
      const child2 = document.createElement("div");
      child1.focus = vi.fn();
      component.appendChild(child1);
      component.appendChild(child2);
      const event = { target: child2 };
      component.delete(event);
      expect(child1.focus).toHaveBeenCalled();
    });

    it("should focus on parent if no previous sibling exists", () => {
      component.focus = vi.fn();
      const child = document.createElement("div");
      component.appendChild(child);
      const event = { target: child };
      component.delete(event);
      expect(component.focus).toHaveBeenCalled();
    });

    it("should not delete if target doesn't match selectors", () => {
      const customComponent = new RewindCompositeComponent({
        selectors: [".test"],
      });
      const child = document.createElement("div");
      customComponent.appendChild(child);
      const event = { target: child };
      vi.spyOn(child, "matches").mockReturnValue(false);
      customComponent.delete(event);
      expect(customComponent.children.length).toBe(1);
    });
  });

  describe("Spawn Functionality", () => {
    it("should create and append a new child with default state", () => {
      const child = component.spawn();
      expect(component.children.length).toBe(1);
      expect(child).toBeDefined();
    });

    it("should create and append a new child with custom state", () => {
      const customState = { test: true };
      const child = component.spawn(customState);
      expect(child.test).toBe(true);
    });

    it("should create child with merged options (childOptions and passed options)", () => {
      const childOptions = { option1: true };
      const customComponent = new RewindCompositeComponent({ childOptions });
      const spawnOptions = { option2: true };
      const child = customComponent.spawn({}, spawnOptions);
      expect(child.option1).toBe(true);
      expect(child.option2).toBe(true);
    });
  });

  describe("History Management", () => {
    it("should correctly merge histories when restoring a child", () => {
      // This test requires more complex setup and might need to be implemented
      // in a separate, focused test file
    });

    it("should use the most recent history for a child when available", () => {
      // This test requires more complex setup and might need to be implemented
      // in a separate, focused test file
    });
  });

  describe("Initialization Process", () => {
    it("should initialize when all children are ready", () => {
      const child1 = { rewindIndex: 0 };
      const child2 = { rewindIndex: 0 };
      component.appendChild(child1);
      component.appendChild(child2);
      component.connectedCallback();
      expect(component.initialized).toBe(true);
    });

    it("should retry initialization if not all children are ready", () => {
      vi.useFakeTimers();
      const child1 = { rewindIndex: 0 };
      const child2 = { rewindIndex: undefined };
      component.appendChild(child1);
      component.appendChild(child2);
      component.connectedCallback();
      expect(component.initialized).toBe(false);
      child2.rewindIndex = 0;
      vi.runAllTimers();
      expect(component.initialized).toBe(true);
      vi.useRealTimers();
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should throw error if defaultCreateChild is not overridden or provided", () => {
      const ErrorComponent = RewindComposite(BaseComponent);
      const errorComponent = new ErrorComponent();
      expect(() => errorComponent.defaultCreateChild()).toThrow();
    });

    it("should handle empty snapshots", () => {
      const snapshot = { children: new Map() };
      component.snapshot = snapshot;
      expect(component.children.length).toBe(0);
    });

    it("should handle snapshots with missing or extra children", () => {
      const child = { id: "test", remove: vi.fn() };
      component.appendChild(child);
      const snapshot = {
        children: new Map([
          ["newChild", { index: 0, position: 0, history: [] }],
        ]),
      };
      component.snapshot = snapshot;
      expect(child.remove).toHaveBeenCalled();
      expect(component.children.length).toBe(1);
    });
  });

  // The following sections might require more complex setups or separate test files:
  // - Integration with Rewind Base Class
  // - Performance
});
