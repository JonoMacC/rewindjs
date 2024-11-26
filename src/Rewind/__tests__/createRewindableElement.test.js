import { describe, it, expect, vi, beforeEach } from "vitest";
import { Window } from "happy-dom";
import { createRewindableElement } from "../createRewindableElement.js";

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

// Register the custom element
customElements.define("base-class", BaseClass);

describe("createRewindableElement", () => {
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
    expect(component.history.length).toBe(1);
    expect(Object.keys(component.history[0])).toEqual([
      "content",
      "top",
      "left",
      "selected",
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
    expect(component.history[1]).toStrictEqual({ content: "", top: 10, left: 20, selected: false });
  });

  it("should handle debounced properties", async () => {
    // Use fake timers for testing
    vi.useFakeTimers();

    // Change the content
    component.content = "Hello";
    component.content = "Hello World";

    // Advance fake timers by the debounce time
    vi.advanceTimersByTime(400);

    expect(component.history.length).toBe(2);

    // Restore usage of real timers
    vi.useRealTimers();
  });

  it("should handle non-debounced properties", () => {
    component.selected = true;
    component.selected = false;
    expect(component.history.length).toBe(3);
  });

  it("should suspend and resume recording", () => {
    component.suspend();
    component.top = 100;
    expect(component.history.length).toBe(1);
    component.resume();
    component.top = 200;
    expect(component.history.length).toBe(2);
    expect(component.history[0]).toStrictEqual({ content: "", top: 0, left: 0, selected: false });
    expect(component.history[1]).toStrictEqual({ content: "", top: 200, left: 0, selected: false });
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
      { content: "First", top: 0, left: 0, selected: false },
      { content: "Second", top: 10, left: 10, selected: true },
      { content: "Third", top: 20, left: 20, selected: false },
    ];
    const index = 1;
    
    component = new RewindableElement({
      history,
      index
    });

    expect(component.history).toEqual(history);
    expect(component.content).toBe("Second");
    expect(component.top).toBe(10);
    expect(component.left).toBe(10);
    expect(component.selected).toBe(true);

    // Verify that the current index is correct
    expect(component.index).toBe(index);

    // Verify that no additional state was recorded
    expect(component.history.length).toBe(history.length);

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
      { content: "He" },
      { content: "Hell" },
      { content: "Hello" },
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
    expect(component.history.length).toBe(3);
    expect(component.history[2].content).toBe("Hello");
    expect(component.index).toBe(2);

    // Set the content to a new value
    component.content = "Hello World";

    // Advance fake timers by the debounce time
    vi.advanceTimersByTime(400);

    expect(component.history.length).toBe(4);
    expect(component.history[3].content).toBe("Hello World");
    expect(component.index).toBe(3);

    // Restore usage of real timers
    vi.useRealTimers();
  });
  
  it("should undo and redo from keyboard events", () => {
    const history = [
      { content: "He" },
      { content: "Hell" },
      { content: "Hello" },
      { content: "Hello World" },
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
    expect(component.history.length).toBe(4);
    expect(component.history[3].content).toBe("Hello World");
    expect(component.index).toBe(3);
    
    // Verify that the undo event works
    component.dispatchEvent(undoEvent());
    expect(undoSpy).toHaveBeenCalled();
    expect(component.history[2].content).toBe("Hello");
    expect(component.index).toBe(2);
    
    // Verify that the redo event works
    component.dispatchEvent(redoEvent());
    expect(redoSpy).toHaveBeenCalled();
    expect(component.history[3].content).toBe("Hello World");
    expect(component.index).toBe(3);
    
    // Verify that we can undo to the end
    component.dispatchEvent(undoEvent());
    component.dispatchEvent(undoEvent());
    component.dispatchEvent(undoEvent());
    expect(undoSpy).toHaveBeenCalledTimes(4);
    expect(component.history[0].content).toBe("He");
    expect(component.index).toBe(0);
    
    // Verify that we can redo to the end
    component.dispatchEvent(redoEvent());
    component.dispatchEvent(redoEvent());
    component.dispatchEvent(redoEvent());
    expect(redoSpy).toHaveBeenCalledTimes(4);
    expect(component.history[3].content).toBe("Hello World");
    expect(component.index).toBe(3);
  })
});
