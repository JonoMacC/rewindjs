import { describe, it, expect, vi, beforeEach } from "vitest";
import { Window } from "happy-dom";
import rewind from "../rw.js";

// Set up a DOM environment
const window = new Window();
global.window = window;
global.document = window.document;
global.HTMLElement = window.HTMLElement;
global.customElements = window.customElements;
global.ResizeObserver = window.ResizeObserver;
global.MutationObserver = window.MutationObserver;

let RewindableText, RewindableCheckbox;

const textTemplate = document.createElement('input');
textTemplate.type = 'text';

const checkboxTemplate = document.createElement('input');
checkboxTemplate.type = 'checkbox';

RewindableText = rewind(textTemplate, {
  observe: ["value"],
  debounce: {
    value: 400,
  },
});

RewindableCheckbox = rewind(checkboxTemplate, {
  observe: ["checked"],
});

// Register custom elements
customElements.define("rw-text-input", RewindableText);
customElements.define("rw-checkbox", RewindableCheckbox);

describe("rewind", () => {
  let rwTextInput, rwCheckbox;

  beforeEach(() => {
    // Instantiate the component
    try {
      rwTextInput = new RewindableText();
      rwCheckbox = new RewindableCheckbox();
    } catch (error) {
      console.error('Custom Element Registration Error:');
      console.error(error);
    }
  });

  it("should record initial state", () => {
    expect(rwCheckbox.history.length).toBe(1);
    expect(Object.keys(rwCheckbox.history[0])).toEqual([
      "checked",
    ]);
  });

  it("should record changes to snapshot properties", () => {
    rwCheckbox.checked = true;
    expect(rwCheckbox.history.length).toBe(2);
    expect(rwCheckbox.history[0].checked).toBe(false);
    expect(rwCheckbox.history[1].checked).toBe(true);
  });

  it("should undo and redo changes", () => {
    rwCheckbox.checked = true;
    rwCheckbox.undo();
    expect(rwCheckbox.checked).toBe(false);
    rwCheckbox.redo();
    expect(rwCheckbox.checked).toBe(true);
  });

  it("should handle debounced properties", async () => {
    // Use fake timers for testing
    vi.useFakeTimers();

    // Change the content
    rwTextInput.value = "Hello";
    rwTextInput.value = "Hello World";

    // Advance fake timers by the debounce time
    vi.advanceTimersByTime(400);

    expect(rwTextInput.history.length).toBe(2);

    // Restore usage of real timers
    vi.useRealTimers();
  });

  it("should handle non-debounced properties", () => {
    rwCheckbox.checked = true;
    rwCheckbox.checked = false;
    expect(rwCheckbox.history.length).toBe(3);
  });

  it("should suspend and resume recording", () => {
    rwCheckbox.suspend();
    rwCheckbox.checked = true;
    expect(rwCheckbox.history.length).toBe(1);
    rwCheckbox.resume();
    rwCheckbox.checked = true;
    expect(rwCheckbox.history.length).toBe(2);
  });

  it("should travel to a specific index", () => {
    rwCheckbox.checked = true;
    rwCheckbox.checked = false;
    rwCheckbox.travel(1);
    expect(rwCheckbox.checked).toBe(true);
  });

  it("should drop states at a specific index", () => {
    rwCheckbox.checked = true;
    rwCheckbox.checked = false;
    rwCheckbox.drop(1);
    expect(rwCheckbox.history.length).toBe(2);
    expect(rwCheckbox.checked).toBe(false);
  });

  it("should handle initial history and index", () => {
    const history = [
      { value: "First" },
      { value: "Second" },
      { value: "Third" },
    ];
    const index = 1;

    rwTextInput = new RewindableText({
      history,
      index,
    });

    expect(rwTextInput.history).toEqual(history);
    expect(rwTextInput.value).toBe("Second");

    // Verify that the current index is correct
    expect(rwTextInput.index).toBe(index);

    // Verify that no additional state was recorded
    expect(rwTextInput.history.length).toBe(history.length);

    // Verify undo functionality
    rwTextInput.undo();
    expect(rwTextInput.value).toBe("First");

    // Verify redo functionality
    rwTextInput.redo();
    expect(rwTextInput.value).toBe("Second");

    // Verify we can redo to the last state
    rwTextInput.redo();
    expect(rwTextInput.value).toBe("Third");
  });

  it("should record a change made at the end of the redo stack", () => {
    // Use fake timers for testing
    vi.useFakeTimers();

    const history = [
      { value: "He" },
      { value: "Hell" },
      { value: "Hello" },
    ];
    const index = 2;

    rwTextInput = new RewindableText({
      history,
      index,
    });

    // Undo to initial state and redo to the end
    rwTextInput
      .undo() // "Hell"
      .undo() // "He"
      .redo() // "Hell"
      .redo(); // "Hello"

    // Verify that we have returned to the last state
    expect(rwTextInput.history.length).toBe(3);
    expect(rwTextInput.history[2].value).toBe("Hello");
    expect(rwTextInput.index).toBe(2);

    // Set the content to a new value
    rwTextInput.value = "Hello World";

    // Advance fake timers by the debounce time
    vi.advanceTimersByTime(400);

    expect(rwTextInput.history.length).toBe(4);
    expect(rwTextInput.history[3].value).toBe("Hello World");
    expect(rwTextInput.index).toBe(3);

    // Restore usage of real timers
    vi.useRealTimers();
  });
});
