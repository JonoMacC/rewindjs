import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import { RewindEventHandler } from "../RewindEventHandler";

describe("RewindEventHandler", () => {
  let window;
  let document;
  let target;
  let handler;

  beforeEach(() => {
    // Create a new JSDOM instance for each test
    const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
      url: "http://localhost",
    });
    window = dom.window;
    document = window.document;
    global.document = document;
    global.window = window;

    // Explicitly add CustomEvent to the global object
    global.CustomEvent = window.CustomEvent;

    target = document.createElement("div");
    handler = new RewindEventHandler(target);
  });

  afterEach(() => {
    handler.destroy();
    // Clean up the global variables
    delete global.document;
    delete global.window;
    delete global.CustomEvent;
  });

  it("should create an instance with default key mappings", () => {
    expect(handler).toBeInstanceOf(RewindEventHandler);
  });

  it("should replace default keys with custom keys", () => {
    const customKeys = { undo: ["Ctrl+U"], redo: ["Ctrl+R"] };
    const customHandler = new RewindEventHandler(target, customKeys);

    const partialCustomKeys = { undo: ["Ctrl+U"] };
    const partialCustomHandler = new RewindEventHandler(
      target,
      partialCustomKeys
    );

    expect(customHandler.keyMap).toEqual(customKeys);
    expect(partialCustomHandler.keyMap).toEqual({
      undo: ["Ctrl+U"],
      redo: ["Ctrl+Y", "Ctrl+Shift+Z", "Shift+Meta+Z"],
    });

    customHandler.destroy();
    partialCustomHandler.destroy();
  });

  it("should trigger undo event on Ctrl+Z", () => {
    const event = new window.KeyboardEvent("keydown", {
      key: "z",
      ctrlKey: true,
    });
    const spy = vi.fn();

    target.addEventListener(RewindEventHandler.UNDO_EVENT, spy);
    target.dispatchEvent(event);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].detail.originalEvent).toBe(event);
  });

  it("should trigger redo event on Ctrl+Y", () => {
    const event = new window.KeyboardEvent("keydown", {
      key: "y",
      ctrlKey: true,
    });
    const spy = vi.fn();

    target.addEventListener(RewindEventHandler.REDO_EVENT, spy);
    target.dispatchEvent(event);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].detail.originalEvent).toBe(event);
  });

  it("should not trigger events for non-matching key combinations", () => {
    const event = new window.KeyboardEvent("keydown", {
      key: "a",
      ctrlKey: true,
    });
    const undoSpy = vi.fn();
    const redoSpy = vi.fn();

    target.addEventListener(RewindEventHandler.UNDO_EVENT, undoSpy);
    target.addEventListener(RewindEventHandler.REDO_EVENT, redoSpy);
    target.dispatchEvent(event);

    expect(undoSpy).not.toHaveBeenCalled();
    expect(redoSpy).not.toHaveBeenCalled();
  });

  it("should prevent default and stop propagation of the original event", () => {
    const originalEvent = new window.KeyboardEvent("keydown", {
      key: "z",
      ctrlKey: true,
    });
    originalEvent.preventDefault = vi.fn();
    originalEvent.stopPropagation = vi.fn();
    const undoSpy = vi.fn();

    target.addEventListener(RewindEventHandler.UNDO_EVENT, undoSpy);

    target.dispatchEvent(originalEvent);

    expect(undoSpy).toHaveBeenCalledTimes(1);
    expect(undoSpy.mock.calls[0][0].detail.originalEvent).toBe(originalEvent);
    expect(originalEvent.preventDefault).toHaveBeenCalled();
    expect(originalEvent.stopPropagation).toHaveBeenCalled();
  });

  it("should remove event listener on destroy", () => {
    const removeEventListenerSpy = vi.spyOn(target, "removeEventListener");
    handler.destroy();
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "keydown",
      handler.handleKeydown
    );
  });
});
