import { describe, it, expect, beforeEach } from 'vitest';
import { StateManager } from '../StateManager.js';

describe('StateManager', () => {
  // Constructor Tests
  describe('Constructor', () => {
    it('should correctly initialize with a target object and observed properties', () => {
      const target = { name: 'John', age: 30, city: 'New York' };
      const stateManager = new StateManager(target, ['name', 'age']);

      expect(stateManager.state).toEqual({ name: 'John', age: 30 });
    });

    it('should work with an empty observe array', () => {
      const target = { name: 'John', age: 30 };
      const stateManager = new StateManager(target, []);

      expect(stateManager.state).toEqual({});
    });

    it('should handle duplicate properties in observe array', () => {
      const target = { name: 'John', age: 30 };
      const stateManager = new StateManager(target, ['name', 'name', 'age']);

      expect(stateManager.state).toEqual({ name: 'John', age: 30 });
    });
  });

  // Getter Tests
  describe('State Getter', () => {
    let target;
    let stateManager;

    beforeEach(() => {
      target = { name: 'John', age: 30, city: 'New York', active: true };
      stateManager = new StateManager(target, ['name', 'age']);
    });

    it('should retrieve only observed properties', () => {
      expect(stateManager.state).toEqual({ name: 'John', age: 30 });
    });

    it('should reflect current target object values', () => {
      target.name = 'Jane';
      target.age = 35;

      expect(stateManager.state).toEqual({ name: 'Jane', age: 35 });
    });

    it('should return an empty object when no properties are observed', () => {
      const emptyStateManager = new StateManager(target, []);

      expect(emptyStateManager.state).toEqual({});
    });
  });

  // Setter Tests
  describe('State Setter', () => {
    let target;
    let stateManager;

    beforeEach(() => {
      target = { name: 'John', age: 30, city: 'New York' };
      stateManager = new StateManager(target, ['name', 'age']);
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
  });

  // Property Type Tests
  describe('Property Type Handling', () => {
    it('should handle different property types', () => {
      const target = {
        str: 'hello',
        num: 42,
        bool: true,
        arr: [1, 2, 3],
        obj: { key: 'value' }
      };
      const stateManager = new StateManager(target, ['str', 'num', 'bool', 'arr', 'obj']);

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
});