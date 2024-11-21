import { describe, it, expect, beforeEach } from "vitest";
import { HistoryManager, UndoModel } from "../HistoryManager";

describe("HistoryManager", () => {
  let rewind;

  beforeEach(() => {
    rewind = new HistoryManager();
  });

  it("should record states and allow undo/redo", () => {
    rewind.record({ text: "H" });
    rewind.record({ text: "He" });
    rewind.record({ text: "Hel" });
    rewind.record({ text: "Hell" });
    rewind.record({ text: "Hello" });
    rewind.record({ text: "Hello " });
    rewind.record({ text: "Hello W" });
    rewind.record({ text: "Hello Wo" });
    rewind.record({ text: "Hello Wor" });
    rewind.record({ text: "Hello Worl" });
    rewind.record({ text: "Hello World" });

    expect(rewind.state).toEqual({ text: "Hello World" });
    expect(rewind.index).toBe(10);

    expect(rewind.undo()).toEqual({ text: "Hello Worl" });
    expect(rewind.undo()).toEqual({ text: "Hello Wor" });
    expect(rewind.redo()).toEqual({ text: "Hello Worl" });
    expect(rewind.redo()).toEqual({ text: "Hello World" });

    expect(rewind.undo()).toEqual({ text: "Hello Worl" });
    rewind.record({ text: "Hello World!" });

    expect(rewind.state).toEqual({ text: "Hello World!" });
    expect(rewind.index).toBe(10);
  });

  it("should not record duplicate states", () => {
    rewind.record({ text: "Hello" });
    rewind.record({ text: "Hello" });
    expect(rewind.history.length).toBe(1);
  });

  it("should handle travel to specific index", () => {
    rewind.record({ text: "Hello" });
    rewind.record({ text: "Hello World" });
    expect(rewind.travel(0)).toEqual({ text: "Hello" });
    expect(rewind.index).toBe(0);
  });

  it("should drop states correctly", () => {
    rewind.record({ text: "Hello" });
    rewind.record({ text: "Hello World" });
    rewind.drop(0);
    expect(rewind.history.length).toBe(1);
    expect(rewind.state).toEqual({ text: "Hello World" });
  });

  it("should handle different undo models", () => {
    const linearRewind = new HistoryManager(UndoModel.LINEAR);
    const historyRewind = new HistoryManager(UndoModel.HISTORY);

    linearRewind.record({ text: "Hello" });
    linearRewind.record({ text: "Hello World" });
    linearRewind.undo();
    linearRewind.record({ text: "Hello there" });

    historyRewind.record({ text: "Hello" });
    historyRewind.record({ text: "Hello World" });
    historyRewind.undo();
    historyRewind.record({ text: "Hello there" });

    expect(linearRewind.history.length).toBe(2);
    expect(linearRewind.history[0]).toEqual({ text: "Hello" });
    expect(linearRewind.history[1]).toEqual({ text: "Hello there" });

    expect(historyRewind.history.length).toBe(4);
    expect(historyRewind.history[0]).toEqual({ text: "Hello" });
    expect(historyRewind.history[1]).toEqual({ text: "Hello World" });
    expect(historyRewind.history[2]).toEqual({ text: "Hello" });
    expect(historyRewind.history[3]).toEqual({ text: "Hello there" });
  });
});
