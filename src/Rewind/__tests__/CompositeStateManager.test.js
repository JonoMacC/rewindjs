import { describe, it, expect, beforeEach } from 'vitest';
import { CompositeStateManager } from '../CompositeStateManager';
import { generateKey } from "../__utils__/generateKey.js";

// Mocks
import { MockRewindablePerson as MockRewindable } from '../__mocks__/MockRewindablePerson.js';

describe('CompositeStateManager', () => {
  let target;
  let child1;
  let child2;
  let compositeStateManager;
  let typeKey;

  beforeEach(() => {
    // Reset state before each test
    target = { name: 'John', age: 30 };
    child1 = new MockRewindable({ name: 'Alice', age: 3 });
    child2 = new MockRewindable({ name: 'Barrett', age: 4 });
    typeKey = generateKey(MockRewindable);

    compositeStateManager = new CompositeStateManager(target, {
      observe: ['name', 'age'],
      children: new Map([
        ['1', child1],
        ['2', child2]
      ])
    });
  });

  // Constructor Tests
  describe('Constructor', () => {
    it('should successfully initialize with target and options', () => {
      expect(compositeStateManager).toBeTruthy();
    });

    it('should work with empty observe array', () => {
      const emptyTarget = { data: 'test' };
      const emptyStateManager = new CompositeStateManager(emptyTarget, {
        observe: [],
        children: new Map()
      });

      expect(emptyStateManager.state).toEqual({ children: new Map() });
    });

    it('should handle initialization with no children', () => {
      const noChildrenManager = new CompositeStateManager(target, {
        observe: ['name', 'age'],
        children: new Map()
      });

      expect(noChildrenManager.state).toEqual({
        name: 'John',
        age: 30,
        children: new Map()
      });
    });
  });

  // State Getter Tests
  describe('State Getter', () => {
    it('should retrieve full state including children', () => {
      const state = compositeStateManager.state;

      expect(state).toEqual({
        name: 'John',
        age: 30,
        children: new Map([
          ['1', { type: typeKey, history: [{ name: 'Alice', age: 3 }], index: 0, position: 0 }],
          ['2', { type: typeKey, history: [{ name: 'Barrett', age: 4 }], index: 0, position: 1 }]
        ])
      });
    });

    it('should reflect changes in target and children', () => {
      target.name = 'Jane';
      child1.state = { name: 'Cara', age: 3 };

      const state = compositeStateManager.state;

      expect(state).toEqual({
        name: 'Jane',
        age: 30,
        children: new Map([
          ['1', { type: typeKey, history: [{ name: 'Alice', age: 3 }, { name: 'Cara', age: 3 }], index: 1, position: 0 }],
          ['2', { type: typeKey, history: [{ name: 'Barrett', age: 4 }], index: 0, position: 1 }]
        ])
      });
    });
  });

  // State Setter Tests
  describe('State Setter', () => {
    it('should set state for target object', () => {
      compositeStateManager.state = { name: 'Jane', age: 35 };

      expect(target.name).toBe('Jane');
      expect(target.age).toBe(35);
    });

    it('should handle partial state updates', () => {
      compositeStateManager.state = { name: 'Jane' };

      expect(target.name).toBe('Jane');
      expect(target.age).toBe(30);
    });
  });

  // Child Management Tests
  describe('Child Management', () => {
    it('should add a new child', () => {
      const child3 = new MockRewindable({ name: 'Dakota', age: 0 });
      compositeStateManager.addChild('3', child3);

      const addedChild = compositeStateManager.children.get('3');

      expect(addedChild).toBe(child3);
      expect(addedChild.state).toEqual({ name: 'Dakota', age: 0 });
    });

    it('should remove a child', () => {
      compositeStateManager.removeChild('1');

      expect(compositeStateManager.children.get('1')).toBeUndefined();
      expect(compositeStateManager.state.children.child1).toBeUndefined();
    });

    it('should access children', () => {
      const children = compositeStateManager.children;

      expect(children.get('1')).toBe(child1);
      expect(children.get('2')).toBe(child2);
    });
  });
});