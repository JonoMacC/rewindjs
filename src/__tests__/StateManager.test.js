import { describe, it, expect, beforeEach } from 'vitest';
import { StateManager } from '../core/StateManager';
import { generateKey } from "../__utils__/generateKey.js";

// Mocks
import { MockRewindablePerson as MockRewindable } from '../__mocks__/MockRewindablePerson.js';
import { MockRewindableCounter as MockCounter } from "../__mocks__/MockRewindableCounter";

describe('StateManager', () => {
  let target;
  let child1;
  let child2;
  let stateManager;
  let typeKey;

  beforeEach(() => {
    // Reset state before each test
    target = { name: 'John', age: 30 };
    child1 = new MockRewindable({ name: 'Alice', age: 3 });
    child2 = new MockRewindable({ name: 'Barrett', age: 4 });
    typeKey = generateKey(MockRewindable);

    stateManager = new StateManager(target, {
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
      expect(stateManager).toBeTruthy();
    });

    it('should work with empty observe array', () => {
      const emptyTarget = { data: 'test' };
      const emptyStateManager = new StateManager(emptyTarget, {
        observe: [],
        children: new Map()
      });

      expect(emptyStateManager.state).toEqual({ children: new Map() });
    });

    it('should handle duplicate properties in observe array', () => {
      target = { name: 'John', age: 30 };
      const stateManager = new StateManager(target, {
        observe: ['name', 'name', 'age']
      });

      expect(stateManager.state).toEqual({ name: 'John', age: 30, children: new Map() });
    });

    it('should handle initialization with no children', () => {
      const noChildrenManager = new StateManager(target, {
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
    beforeEach(() => {
      target = { name: 'John', age: 30, city: 'New York', active: true };
      child1 = new MockRewindable({ name: 'Alice', age: 3 });
      stateManager = new StateManager(target, {
        observe: ['name', 'age'],
        children: new Map([
          ['1', child1]
        ])
      });
    });

    it('should retrieve only observed properties', () => {
      expect(stateManager.state).toEqual({
        name: 'John',
        age: 30,
        children: new Map([
          ['1', { type: typeKey, history: [{ name: 'Alice', age: 3 }], index: 0, position: 0 }]
        ])
      });
    });

    it('should reflect current target object values', () => {
      target.name = 'Jane';
      target.age = 35;

      expect(stateManager.state).toEqual({
        name: 'Jane',
        age: 35,
        children: new Map([
          ['1', { type: typeKey, history: [{ name: 'Alice', age: 3 }], index: 0, position: 0 }]
        ])
      });
    });

    it('should return an object with children when no properties are observed', () => {
      const emptyStateManager = new StateManager(target, {
        observe: []
      });

      expect(emptyStateManager.state).toEqual({
        children: new Map()
      });
    });

    it('should retrieve full state including children', () => {
      const state = stateManager.state;

      expect(state).toEqual({
        name: 'John',
        age: 30,
        children: new Map([
          ['1', { type: typeKey, history: [{ name: 'Alice', age: 3 }], index: 0, position: 0 }],
        ])
      });
    });

    it('should reflect changes in target and children', () => {
      target.name = 'Jane';
      child1.rewindState = { name: 'Cara', age: 3 };

      const state = stateManager.state;

      expect(state).toEqual({
        name: 'Jane',
        age: 30,
        children: new Map([
          ['1', { type: typeKey, history: [{ name: 'Alice', age: 3 }, { name: 'Cara', age: 3 }], index: 1, position: 0 }],
        ])
      });
    });
  });

  // State Setter Tests
  describe('State Setter', () => {
    beforeEach(() => {
      target = { name: 'John', age: 30, city: 'New York' };
      stateManager = new StateManager(target, {
        observe: ['name', 'age']
      });
    });

    it('should set a single observed property', () => {
      stateManager.state = { name: 'Jane' };

      expect(target.name).toBe('Jane');
      expect(target.age).toBe(30);
    });

    it('should set multiple observed properties', () => {
      stateManager.state = { name: 'Jane', age: 35 };

      expect(target.name).toBe('Jane');
      expect(target.age).toBe(35);
    });

    it('should ignore unobserved properties', () => {
      stateManager.state = { name: 'Jane', city: 'Los Angeles', unknown: 'value' };

      expect(target.name).toBe('Jane');
      expect(target.city).toBe('New York');
      expect(target).not.toHaveProperty('unknown');
    });

    it('should not modify the target when no valid properties are set', () => {
      const originalTarget = { ...target };
      stateManager.state = { city: 'Los Angeles', unknown: 'value' };

      expect(target).toEqual(originalTarget);
    });

    it('should set state for target object', () => {
      stateManager.state = { name: 'Jane', age: 35 };

      expect(target.name).toBe('Jane');
      expect(target.age).toBe(35);
    });

    it('should handle partial state updates', () => {
      stateManager.state = { name: 'Jane' };

      expect(target.name).toBe('Jane');
      expect(target.age).toBe(30);
    });
  });

  // Property Type Tests
  describe('Property Type Handling', () => {
    it('should handle different property types', () => {
      target = {
        str: 'hello',
        num: 42,
        bool: true,
        arr: [1, 2, 3],
        obj: { key: 'value' }
      };
      stateManager = new StateManager(target, {
        observe: ['str', 'num', 'bool', 'arr', 'obj']
      });

      stateManager.state = {
        str: 'world',
        num: 100,
        bool: false,
        arr: [4, 5, 6],
        obj: { newKey: 'new value' }
      };

      expect(target.str).toBe('world');
      expect(target.num).toBe(100);
      expect(target.bool).toBe(false);
      expect(target.arr).toEqual([4, 5, 6]);
      expect(target.obj).toEqual({ newKey: 'new value' });
    });
  });

  // Child State Tests
  describe('Child State', () => {
    beforeEach(() => {
      typeKey = generateKey(MockCounter);
      child1 = new MockCounter({
        history: [{value: 0}, {value: 1}, {value: 2}],
        index: 1
      });
      child2 = new MockCounter({
        history: [{value: 0}, {value: 10}, {value: 100}],
        index: 2
      });
      target = {};
      stateManager = new StateManager(target);
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
        const populatedManager = new StateManager(target, { children: initialChildren });
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
        expect(emptyState.children.size).toBe(0);
      });

      it('should generate a state snapshot with multiple children', () => {
        stateManager.addChild('1', child1);
        stateManager.addChild('2', child2);

        const state = stateManager.state;
        expect(state.children.size).toBe(2);

        const child1State = state.children.get('1');
        expect(child1State).toMatchObject({
          type: typeKey,
          history: [{value: 0}, {value: 1}, {value: 2}],
          index: 1,
          position: 0
        });

        const child2State = state.children.get('2');
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
        stateManager.registerChildType(MockCounter);

        stateManager.state = {children: newState};
        expect(stateManager.children.size).toBe(1);

        const restoredChild = stateManager.children.get('1');
        expect(restoredChild).toBeInstanceOf(MockCounter);
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

        stateManager.state = {children: newState};
        expect(stateManager.children.size).toBe(1);
        expect(stateManager.children.has('1')).toBe(true);
        expect(stateManager.children.has('2')).toBe(false);
      });
    });
  });

  // Child Management Tests
  describe('Child Management', () => {
    it('should add a new child', () => {
      const child3 = new MockRewindable({ name: 'Dakota', age: 0 });
      stateManager.addChild('3', child3);

      const addedChild = stateManager.children.get('3');

      expect(addedChild).toBe(child3);
      expect(addedChild.rewindState).toEqual({ name: 'Dakota', age: 0 });
    });

    it('should remove a child', () => {
      stateManager.removeChild('1');

      expect(stateManager.children.get('1')).toBeUndefined();
      expect(stateManager.state.children.child1).toBeUndefined();
    });

    it('should access children', () => {
      const children = stateManager.children;

      expect(children.get('1')).toBe(child1);
      expect(children.get('2')).toBe(child2);
    });
  });
});