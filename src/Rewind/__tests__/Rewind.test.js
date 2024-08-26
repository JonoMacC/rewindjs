import { describe, it, expect, vi, beforeEach } from "vitest";
import { Rewind } from "../Rewind.js";

class TestComponent {
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

  connectedCallback() {}
  disconnectedCallback() {}
}

describe("Rewind", () => {
  let RewindTestComponent;
  let component;

  beforeEach(() => {
    RewindTestComponent = Rewind(TestComponent, {
      snapshot: ["content", "top", "left", "selected"],
      coalesce: ["setPosition"],
      debounce: {
        top: "none",
        left: "none",
        selected: "none",
      },
    });
    component = new RewindTestComponent();
    component.connectedCallback();
  });

  it("should record initial state", () => {
    expect(component.rewindHistory.length).toBe(1);
    expect(Object.keys(component.rewindHistory[0])).toEqual([
      "content",
      "top",
      "left",
      "selected",
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
    expect(component.rewindHistory.length).toBe(2);
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
      { content: "First", top: 0, left: 0, selected: false },
      { content: "Second", top: 10, left: 10, selected: true },
      { content: "Third", top: 20, left: 20, selected: false },
    ];
    const index = 1;

    RewindTestComponent = Rewind(TestComponent, {
      snapshot: ["content", "top", "left", "selected"],
      history,
      index,
    });
    component = new RewindTestComponent();
    component.connectedCallback();

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
});
