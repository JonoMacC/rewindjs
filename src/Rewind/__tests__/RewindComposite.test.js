import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import { RewindComposite } from "../RewindComposite.js";
import { rewind } from "../rewind.js";
import { MockElement } from "../__mocks__/MockElement.js";

// Set up a DOM environment
const { window } = new JSDOM();
global.window = window;
global.document = window.document;
global.HTMLElement = window.HTMLElement;
global.CustomEvent = window.CustomEvent;

describe("RewindComposite", () => {
  let BaseComponent, RewindCompositeComponent, component, child, createChild;
  beforeEach(() => {
    BaseComponent = class extends MockElement {
      constructor() {
        super();
      }
    };

    RewindCompositeComponent = RewindComposite(BaseComponent, MockElement);
    createChild = vi.fn(
      (state, options) => new MockElement({ ...options, ...state })
    );
    component = new RewindCompositeComponent({ createChild });
    child = new rewind(MockElement);
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
      const createChild = vi.fn(
        (state, options) => new MockElement({ ...options, ...state })
      );
      const customComponent = new RewindCompositeComponent({
        createChild,
      });
      expect(createChild).not.toHaveBeenCalled();
      customComponent.spawn();
      expect(createChild).toHaveBeenCalledTimes(1);
      expect(createChild).toHaveBeenCalledWith({}, { history: [], index: -1 });
    });

    it("should initialize with custom childOptions", () => {
      const childOptions = { test: true };
      const createChild = vi.fn(
        (state, options) => new MockElement({ ...options, ...state })
      );
      const customComponent = new RewindCompositeComponent({
        createChild,
        childOptions,
      });
      const child = customComponent.spawn();
      expect(createChild).toHaveBeenCalledTimes(1);
      expect(createChild).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ history: [], index: -1, test: true })
      );
      expect(child).toHaveProperty("test", true);
    });
  });

  describe("Selectors and Children", () => {
    it("should return all children when no selectors are provided", () => {
      const createChild = vi.fn(() => new MockElement());
      const customComponent = new RewindCompositeComponent({
        createChild,
      });
      customComponent.spawn();
      customComponent.spawn();
      expect(customComponent.snapshot.children.size).toBe(2);
    });

    it("should return only children matching selectors when provided", () => {
      const createChild = vi.fn(() => new MockElement());
      const customComponent = new RewindCompositeComponent({
        selectors: [".test"],
        createChild,
      });
      console.log("Initial selectors:", customComponent.selectors);

      const child1 = customComponent.spawn();
      child1.className = "test";
      const child2 = customComponent.spawn();
      vi.spyOn(child1, "matches").mockReturnValue(true);
      vi.spyOn(child2, "matches").mockReturnValue(false);

      console.log("Selectors before snapshot:", customComponent.selectors);
      const snapshot = customComponent.snapshot;
      console.log("Snapshot children size:", snapshot.children.size);

      expect(customComponent.snapshot.children.size).toBe(1);
    });

    it("should handle undefined selectors", () => {
      const createChild = vi.fn(() => new MockElement());
      const customComponent = new RewindCompositeComponent({
        createChild,
        // No selectors passed
      });

      const child = customComponent.spawn();

      console.log("Selectors:", customComponent.selectors);
      console.log("Children:", customComponent.children);

      const snapshot = customComponent.snapshot;
      console.log("Snapshot children size:", snapshot.children.size);

      expect(snapshot.children.size).toBe(1);
    });
  });

  describe("Snapshot Functionality", () => {
    it("should correctly generate a snapshot of current state", () => {
      const createChild = vi.fn(
        () =>
          new MockElement({
            id: "test",
            rewindHistory: [],
            rewindIndex: -1,
          })
      );
      const customComponent = new RewindCompositeComponent({
        createChild,
        // No selectors passed
      });
      customComponent.spawn();
      const snapshot = component.snapshot;
      expect(snapshot.children.size).toBe(1);
      expect(snapshot.children.get("test")).toBeDefined();
    });

    it("should correctly restore state from a snapshot", () => {
      const snapshot = {
        children: new Map([["test", { index: 0, position: 0, history: [] }]]),
      };
      const mockChild = new MockElement({
        id: "test",

        rewindHistory: [],
        rewindIndex: -1,
      });
      //const createChild = vi.fn(() => mockChild);
      const customComponent = new RewindCompositeComponent({ createChild });
      customComponent.snapshot = snapshot;
      expect(customComponent.children.length).toBe(1);
      expect(createChild).toHaveBeenCalledTimes(1);
      expect(mockChild.travel).toHaveBeenCalledTimes(1);
    });

    it("should handle adding new children from snapshot", () => {
      const snapshot = {
        children: new Map([
          ["test1", { index: 0, position: 0, history: [] }],
          ["test2", { index: 0, position: 1, history: [] }],
        ]),
      };
      const mockChild = new MockElement({
        travel: vi.fn(),
        rewindHistory: [],
        rewindIndex: -1,
      });
      const createChild = vi.fn(() => mockChild);
      const customComponent = new RewindCompositeComponent({ createChild });
      customComponent.snapshot = snapshot;
      expect(customComponent.children.length).toBe(2);
    });

    it("should handle removing children not in snapshot", () => {
      const child1 = new MockElement({
        id: "test1",
        remove: vi.fn(),
        travel: vi.fn(),
      });
      const child2 = new MockElement({
        id: "test2",
        remove: vi.fn(),
        travel: vi.fn(),
      });
      component.append(child1);
      component.append(child2);
      const snapshot = {
        children: new Map([["test1", { index: 0, position: 0, history: [] }]]),
      };
      component.snapshot = snapshot;
      expect(child2.remove).toHaveBeenCalled();
    });

    it("should update existing children's positions and states", () => {
      const child = new MockElement({
        id: "test",
        rewindIndex: 0,
        rewindHistory: [],
        travel: vi.fn(),
      });
      component.append(child);
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
      const child1 = new MockElement({ id: "test" });
      component.append(child1);
      const event = {
        target: child1,
      };
      component.delete(event);
      expect(component.children.length).toBe(0);
    });

    it("should focus on previous sibling after deletion", () => {
      const child1 = new MockElement();
      const child2 = new MockElement();
      child1.focus = vi.fn();
      component.append(child1);
      component.append(child2);
      const event = {
        target: child2,
      };
      component.delete(event);
      expect(child1.focus).toHaveBeenCalled();
    });

    it("should focus on parent if no previous sibling exists", () => {
      component.focus = vi.fn();
      const child = new MockElement();
      component.append(child);
      const event = {
        target: child,
      };
      component.delete(event);
      expect(component.focus).toHaveBeenCalled();
    });

    it("should not delete if target doesn't match selectors", () => {
      const customComponent = new RewindCompositeComponent({
        selectors: [".test"],
      });
      const child = new MockElement();
      customComponent.append(child);
      const event = {
        target: child,
      };
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
      const customComponent = new RewindCompositeComponent({
        createChild,
        childOptions,
      });
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
      const child1 = new MockElement({ rewindIndex: 0 });
      const child2 = new MockElement({ rewindIndex: 0 });
      component.append(child1);
      component.append(child2);
      component.connectedCallback();
      expect(component.initialized).toBe(true);
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
      const child = new MockElement({ id: "test", remove: vi.fn() });
      component.append(child);
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
