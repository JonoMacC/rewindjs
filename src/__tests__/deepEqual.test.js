import {describe, expect, it} from "vitest";
import cel from "../lib/celerity/cel.js";

describe("deepEqual", () => {
  it("should return true for equal booleans", () => {
    const a = true;
    const b = true;

    expect(cel.deepEqual(a, b)).toBe(true);
  });
  it("should return true for equal strings", () => {
    const a = "hello";
    const b = "hello";

    expect(cel.deepEqual(a, b)).toBe(true);
  });
  it("should return true for equal numbers", () => {
    const a = 0;
    const b = 0;

    expect(cel.deepEqual(a, b)).toBe(true);
  });
  it("should return true for infinity", () => {
    expect(cel.deepEqual(Infinity, Infinity)).toBe(true);
  });
  it("should return true for equal arrays", () => {
    const a = [1, 2, 3];
    const b = [1, 2, 3];

    expect(cel.deepEqual(a, b)).toBe(true);
  });
  it("should return true for equal objects", () => {
    const a = {a: 1, b: 2};
    const b = {a: 1, b: 2};

    expect(cel.deepEqual(a, b)).toBe(true);
  });
  it("should return true for equal Sets", () => {
    const a = new Set([1, 2, 3]);
    const b = new Set([1, 2, 3]);

    expect(cel.deepEqual(a, b)).toBe(true);
  });
  it("should return true for equal Maps", () => {
    const a = new Map([["a", 1], ["b", 2]]);
    const b = new Map([["a", 1], ["b", 2]]);

    expect(cel.deepEqual(a, b)).toBe(true);
  });
  it("should return true for null values", () => {
    const a = null;
    const b = null;

    expect(cel.deepEqual(a, b)).toBe(true);
  });
  it("should return true for undefined values", () => {
    const a = undefined;
    const b = undefined;

    expect(cel.deepEqual(a, b)).toBe(true);
  });
  it("should return true for empty strings", () => {
    const a = "";
    const b = "";

    expect(cel.deepEqual(a, b)).toBe(true);
  });
  it("should return true for empty objects", () => {
    const a = {};
    const b = {};

    expect(cel.deepEqual(a, b)).toBe(true);
  });
  it("should return true for empty arrays", () => {
    const a = [];
    const b = [];

    expect(cel.deepEqual(a, b)).toBe(true);
  });
  it("should return true for equal objects with nested Maps", () => {
    const a = {
      value: 0,
      children: new Map([
        ['1', {value: 1, children: new Map()}],
        ['2', {value: 2, children: new Map()}],
      ])
    };
    const b = {
      value: 0,
      children: new Map([
        ['1', {value: 1, children: new Map()}],
        ['2', {value: 2, children: new Map()}],
      ])
    };

    expect(cel.deepEqual(a, b)).toBe(true);
  });
});