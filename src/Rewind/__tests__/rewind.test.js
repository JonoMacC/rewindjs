import { describe, it, expect, vi, beforeEach } from "vitest";
import { JSDOM } from "jsdom";
import rewind from "../rewind.js";

// Set up a DOM environment
const { window } = new JSDOM();
global.window = window;
global.document = window.document;
global.HTMLElement = window.HTMLElement;

class BaseClass {
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

describe("Rewind", () => {
  let RewindTestComponent;
  let component;

  beforeEach(() => {
    RewindTestComponent = rewind(BaseClass, {
      observe: ["content", "top", "left", "selected"],
      coalesce: ["setPosition"],
      debounce: {
        content: 400,
      },
    });
    component = new RewindTestComponent();
  });

  it("should record initial state", () => {
    expect(component.rewindHistory.length).toBe(1);
    expect(Object.keys(component.rewindHistory[0])).toEqual([
      "content",
      "top",
      "left",
      "selected",
      "children",
    ]);
  });

  it("should record changes to snapshot properties", () => {
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
  });

  it("should handle debounced properties", async () => {
    vi.useFakeTimers();
    component.content = "Hello";
    component.content = "Hello World";
    await vi.runAllTimersAsync();
    expect(component.rewindHistory.length).toBe(3);
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
  });

  it("should travel to a specific index", () => {
    component.top = 100;
    component.top = 200;
    component.travel(1);
    expect(component.top).toBe(100);
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

    RewindTestComponent = rewind(BaseClass, {
      observe: ["content", "top", "left", "selected"],
    });
    component = new RewindTestComponent({
      history,
      index,
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
    const history = [
      { content: "He", children: new Map() },
      { content: "Hell", children: new Map() },
      { content: "Hello", children: new Map() },
    ];
    const index = 2;

    RewindTestComponent = rewind(BaseClass, {
      observe: ["content"],
    });
    component = new RewindTestComponent({
      history,
      index,
    });

    // Undo to initial state and redo to the end
    component
      .undo()
      .undo()
      .redo()
      .redo();

    // Verify that we have returned to the last state
    expect(component.rewindHistory.length).toBe(3);
    expect(component.rewindHistory[2].content).toBe("Hello");
    expect(component.rewindIndex).toBe(2);

    // Set the content to a new value
    component.content = "Hello World";
    expect(component.rewindHistory.length).toBe(4);
    expect(component.rewindHistory[3].content).toBe("Hello World");
    expect(component.rewindIndex).toBe(3);
  });
});
