import { describe, it, expect, beforeEach } from "vitest";
import { createRewindable } from "../createRewindable.js";

class BaseClass {
  #left = 0;
  #top = 0;
  #content = "";

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

  set content(value) {
    this.#content = value;
  }

  get content() {
    return this.#content;
  }

  setPosition(top, left) {
    this.#top = top;
    this.#left = left;
  }
}

describe("createRewindable", () => {
  let Rewindable;
  let component;

  beforeEach(() => {
    Rewindable = createRewindable(BaseClass, {
      observe: ["top", "left", "content"],
      coalesce: ["setPosition"],
    });
    component = new Rewindable();
  });

  it("should record initial state", () => {
    expect(component.history.length).toBe(1);
    expect(Object.keys(component.history[0])).toEqual([
      "top",
      "left",
      "content",
    ]);
  });

  it("should record changes to observed properties", () => {
    component.top = 100;
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
    expect(component.history[1]).toStrictEqual({ top: 10, left: 20, content: "" });
  });

  it("should suspend and resume recording", () => {
    component.suspend();
    component.top = 100;
    expect(component.history.length).toBe(1);
    component.resume();
    component.top = 200;
    expect(component.history.length).toBe(2);
    expect(component.history[0]).toStrictEqual({ top: 0, left: 0, content: "" });
    expect(component.history[1]).toStrictEqual({ top: 200, left: 0, content: "" });
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
      { top: 0, left: 0, content: "First" },
      { top: 10, left: 10, content: "Second" },
      { top: 20, left: 20, content: "Third" },
    ];
    const index = 1;

    component = new Rewindable({
      history,
      index,
    });

    expect(component.history).toEqual(history);
    expect(component.content).toBe("Second");
    expect(component.top).toBe(10);
    expect(component.left).toBe(10);

    // Verify that the current index is correct
    expect(component.index).toBe(index);

    // Verify that no additional state was recorded
    expect(component.history.length).toBe(history.length);

    // Verify undo functionality
    component.undo();
    expect(component.content).toBe("First");
    expect(component.top).toBe(0);
    expect(component.left).toBe(0);

    // Verify redo functionality
    component.redo();
    expect(component.content).toBe("Second");
    expect(component.top).toBe(10);
    expect(component.left).toBe(10);

    // Verify we can redo to the last state
    component.redo();
    expect(component.content).toBe("Third");
    expect(component.top).toBe(20);
    expect(component.left).toBe(20);
  });

  it("should record a change made at the end of the redo stack", () => {
    const history = [
      { content: "He" },
      { content: "Hell" },
      { content: "Hello" },
    ];
    const index = 2;

    component = new Rewindable({
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
    expect(component.history[2].content).toBe("Hello");
    expect(component.index).toBe(2);

    // Set the content to a new value
    component.content = "Hello World";
    expect(component.history.length).toBe(4);
    expect(component.history[3].content).toBe("Hello World");
    expect(component.index).toBe(3);
  });
});
