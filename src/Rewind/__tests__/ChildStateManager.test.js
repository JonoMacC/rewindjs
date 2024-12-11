import { describe, it, expect, beforeEach } from 'vitest';
import { ChildStateManager } from '../ChildStateManager.js';
import { generateKey } from "../__utils__/generateKey.js";
import { MockRewindableCounter as MockRewindable } from "../__mocks__/MockRewindableCounter";

describe('ChildStateManager', () => {
  let stateManager;
  let child1;
  let child2;
  let typeKey;

  beforeEach(() => {
    typeKey = generateKey(MockRewindable);
    child1 = new MockRewindable({
      history: [{value: 0}, {value: 1}, {value: 2}],
      index: 1
    });
    child2 = new MockRewindable({
      history: [{value: 0}, {value: 10}, {value: 100}],
      index: 2
    });
    stateManager = new ChildStateManager();
  });

  // Constructor Tests
  describe('Constructor', () => {
    it('should initialize with an empty map by default', () => {
      expect(stateManager.children.size).toBe(0);
    });

    it('should initialize with pre-populated children', () => {
      const initialChildren = new Map([
        ['1', child1],
        ['2', child2]
      ]);
      const populatedManager = new ChildStateManager(initialChildren);
      expect(populatedManager.children.size).toBe(2);
    });
  });

  // addChild Method Tests
  describe('addChild', () => {
    it('should add a single child', () => {
      stateManager.addChild('1', child1);
      expect(stateManager.children.size).toBe(1);
      expect(stateManager.children.get('1')).toBe(child1);
    });

    it('should replace a child with the same identifier', () => {
      stateManager.addChild('1', child1);
      const newChild = new MockRewindable({
        history: [{value: 5}],
        index: 0
      });
      stateManager.addChild('1', newChild);
      expect(stateManager.children.size).toBe(1);
      expect(stateManager.children.get('1')).toBe(newChild);
    });

    it('should handle multiple children with unique identifiers', () => {
      stateManager.addChild('1', child1);
      stateManager.addChild('2', child2);
      expect(stateManager.children.size).toBe(2);
    });
  });

  // removeChild Method Tests
  describe('removeChild', () => {
    it('should remove an existing child', () => {
      stateManager.addChild('1', child1);
      stateManager.removeChild('1');
      expect(stateManager.children.size).toBe(0);
    });

    it('should not throw an error when removing a non-existent child', () => {
      expect(() => stateManager.removeChild('nonexistent')).not.toThrow();
    });
  });

  // State Getter Tests
  describe('state getter', () => {
    it('should generate a state snapshot for an empty collection', () => {
      const emptyState = stateManager.state;
      expect(emptyState.size).toBe(0);
    });

    it('should generate a state snapshot with multiple children', () => {
      stateManager.addChild('1', child1);
      stateManager.addChild('2', child2);

      const state = stateManager.state;
      expect(state.size).toBe(2);

      const child1State = state.get('1');
      expect(child1State).toMatchObject({
        type: typeKey,
        history: [{value: 0}, {value: 1}, {value: 2}],
        index: 1,
        position: 0
      });

      const child2State = state.get('2');
      expect(child2State).toMatchObject({
        type: expect.any(String),
        history: [{value: 0}, {value: 10}, {value: 100}],
        index: 2,
        position: 1
      });
    });
  });

  // State Setter Tests
  describe('state setter', () => {
    it('should restore state to an empty collection', () => {
      const newState = new Map([
        ['1', {
          type: typeKey,
          history: [{value: 10}, {value: 20}],
          index: 1
        }]
      ]);

      // Register the Rewindable type
      stateManager.registerChildType(MockRewindable);

      stateManager.state = newState;
      expect(stateManager.children.size).toBe(1);

      const restoredChild = stateManager.children.get('1');
      expect(restoredChild).toBeInstanceOf(MockRewindable);
      expect(restoredChild.rewindHistory).toEqual([{value: 10}, {value: 20}]);
      expect(restoredChild.rewindIndex).toBe(1);
    });

    it('should remove children not in the new state', () => {
      stateManager.addChild('1', child1);
      stateManager.addChild('2', child2);

      const newState = new Map([
        ['1', {
          type: typeKey,
          history: [{value: 0}],
          index: 0
        }]
      ]);

      stateManager.state = newState;
      expect(stateManager.children.size).toBe(1);
      expect(stateManager.children.has('1')).toBe(true);
      expect(stateManager.children.has('2')).toBe(false);
    });
  });
});