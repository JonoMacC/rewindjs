import {UndoModel} from "../HistoryManager";

// Utilities
import cel from "../../lib/celerity/cel.js";

/**
 * Represents a single change in the history
 * @typedef {Object} Delta
 * @property {string} property - The property that changed
 * @property {any} value - The new value
 * @property {number} timestamp - When the change occurred
 */

/**
 * RewindManager
 * 
 * Manages undo/redo functionality using delta recording for efficiency.
 * Only stores changes to individual properties while maintaining ability
 * to reconstruct full states at any point.
 */
export class RewindManager {
  #deltas = [];
  #index = -1;
  #model;
  #initialState = {};
  #currentState = {};
  #propertyVersions = new Map();
  #branchPoints = new Set();

  constructor(model = UndoModel.LINEAR, initialState = {}) {
    this.#model = model;
    this.#initialState = { ...initialState };
    this.#currentState = { ...initialState };

    this.#initializePropertyVersions(initialState);
  }

  #initializePropertyVersions(state) {
    Object.keys(state).forEach(prop => {
      this.#propertyVersions.set(prop, -1);
    });
  }

  /**
   * Records a change to a specific property
   * @param {string} property - The property that changed
   * @param {any} value - The new value
   * @returns {boolean} - Whether the change was recorded
   */
  record(property, value) {
    // Skip recording if the value is empty
    if (cel.isEmpty(value)) {
      console.info("Value is empty, not recording.");
      return false;
    }

    // Skip recording if the property is unchanged
    if (cel.deepEqual(this.#currentState[property], value)) {
      console.info("Property unchanged, not recording.");
      return false;
    }

    const newIndex = this.#index + 1;
    const delta = {
      property,
      value,
      timestamp: Date.now(),
      version: newIndex
    };

    const handler = this.#model === UndoModel.LINEAR
        ? this.#handleLinearDelta.bind(this)
        : this.#handleHistoryDelta.bind(this);

    handler(delta);
    this.#index = newIndex;

    // Update current state and property version
    this.#currentState[property] = value;
    this.#propertyVersions.set(property, newIndex);

    return true;
  }

  /**
   * Handles recording a delta in linear mode
   * @private
   */
  #handleLinearDelta(delta) {
    this.#deltas = [...this.#deltas.slice(0, this.#index + 1), delta];
  }

  /**
   * Handles recording a delta in history mode
   * @private
   */
  #handleHistoryDelta(delta) {
    if (this.#index < this.#deltas.length - 1) {
      // We're creating a new branch
      const branchPoint = this.#index;
      this.#branchPoints.add(branchPoint);

      // Find the last branch point before current index
      const lastBranchPoint = [...this.#branchPoints]
          .filter(bp => bp < branchPoint)
          .sort((a, b) => b - a)[0] ?? -1;

      // Only save properties that have changed since the last branch point
      Object.keys(this.#currentState).forEach(prop => {
        if (prop !== delta.property) {
          const lastVersion = this.#propertyVersions.get(prop);
          // Save property if it changed after the last branch point
          if (lastVersion > lastBranchPoint) {
            this.#deltas.push({
              property: prop,
              value: this.#currentState[prop],
              timestamp: delta.timestamp - 1,
              version: delta.version - 0.1 // Ensure it comes before the new delta
            });
          }
        }
      });
    }
    this.#deltas.push(delta);
  }

  /**
   * Gets the version number when a property last changed
   * @param {string} property - The property to check
   * @returns {number} - The version number, or -1 if never changed
   */
  getPropertyVersion(property) {
    return this.#propertyVersions.get(property) ?? -1;
  }

  /**
   * Travels to a specific point in history
   * @param {number} index - The index to travel to
   * @returns {Object|null} - The complete state at that index
   */
  travel(index) {
    if (index < -1 || index >= this.#deltas.length) {
      return null;
    }

    // Reset current state to initial state
    this.#currentState = { ...this.#initialState };

    // Apply deltas up to the target index
    this.#deltas.slice(0, index + 1).forEach(delta => {
      this.#currentState[delta.property] = delta.value;
      this.#propertyVersions.set(delta.property, delta.version);
    });

    this.#index = index;
    return { ...this.#currentState };
  }

  /**
   * Drops a delta at the specified index
   * @param {number} index - The index to drop
   * @returns {boolean} - Whether the drop was successful
   */
  drop(index) {
    if (index < 0 || index >= this.#deltas.length) {
      return false;
    }

    const deltaToRemove = this.#deltas[index];
    const affectedProperty = deltaToRemove.property;

    // Handle dropping the current state
    if (index === this.#index) {
      // Find the previous value for this property
      let previousValue = this.#initialState[affectedProperty];
      for (let i = index - 1; i >= 0; i--) {
        if (this.#deltas[i].property === affectedProperty) {
          previousValue = this.#deltas[i].value;
          break;
        }
      }
      this.#currentState[affectedProperty] = previousValue;
    }

    // If we're in HISTORY mode and this is a branch point, we need special handling
    if (this.#model === UndoModel.HISTORY && this.#branchPoints.has(index)) {
      return this.#handleBranchPointDrop(index);
    }

    // Update deltas array and handle version numbers
    const newDeltas = [...this.#deltas];
    newDeltas.splice(index, 1);

    // Adjust version numbers for all deltas after the drop point
    for (let i = index; i < newDeltas.length; i++) {
      newDeltas[i] = {
        ...newDeltas[i],
        version: i
      };
    }

    // Update property versions
    this.#updatePropertyVersionsAfterDrop(index, affectedProperty);

    // Update branch points
    this.#updateBranchPointsAfterDrop(index);

    // Update internal state
    this.#deltas = newDeltas;
    this.#index = this.#index > index ? this.#index - 1 : this.#index;

    return true;
  }

  /**
   * Handles dropping a delta that is a branch point
   * @private
   * @param {number} index - The index to drop
   * @returns {boolean} - Whether the drop was successful
   */
  #handleBranchPointDrop(index) {
    const branchPointDeltas = this.#deltas
        .filter(d => Math.floor(d.version) === index);

    // Remove all deltas associated with this branch point
    const newDeltas = this.#deltas.filter(d => Math.floor(d.version) !== index);

    // Adjust version numbers for remaining deltas
    const versionAdjustment = branchPointDeltas.length;
    for (let i = index; i < newDeltas.length; i++) {
      newDeltas[i] = {
        ...newDeltas[i],
        version: newDeltas[i].version - versionAdjustment
      };
    }

    // Update branch points
    this.#branchPoints.delete(index);
    this.#branchPoints = new Set(
        [...this.#branchPoints]
            .map(bp => bp > index ? bp - versionAdjustment : bp)
    );

    // Update property versions
    branchPointDeltas.forEach(delta => {
      this.#updatePropertyVersionsAfterDrop(
          Math.floor(delta.version),
          delta.property
      );
    });

    // Update internal state
    this.#deltas = newDeltas;
    this.#index = this.#index > index
        ? this.#index - versionAdjustment
        : this.#index;

    return true;
  }

  /**
   * Updates property versions after a drop operation
   * @private
   * @param {number} index - The index that was dropped
   * @param {string} property - The property that was affected
   */
  #updatePropertyVersionsAfterDrop(index, property) {
    const currentVersion = this.#propertyVersions.get(property);

    // If this was the last version of this property, find the previous version
    if (currentVersion === index) {
      let newVersion = -1; // Default to initial state
      for (let i = index - 1; i >= 0; i--) {
        if (this.#deltas[i].property === property) {
          newVersion = this.#deltas[i].version;
          break;
        }
      }
      this.#propertyVersions.set(property, newVersion);
    }
    // If this property had a later version, decrement it
    else if (currentVersion > index) {
      this.#propertyVersions.set(property, currentVersion - 1);
    }
  }

  /**
   * Updates branch points after a drop operation
   * @private
   * @param {number} index - The index that was dropped
   */
  #updateBranchPointsAfterDrop(index) {
    this.#branchPoints = new Set(
        [...this.#branchPoints]
            .filter(bp => bp !== index)
            .map(bp => bp > index ? bp - 1 : bp)
    );
  }

  undo() {
    return this.travel(this.#index - 1);
  }

  redo() {
    return this.travel(this.#index + 1);
  }

  get state() {
    return { ...this.#currentState };
  }

  get index() {
    return this.#index;
  }

  get history() {
    return {
      initialState: { ...this.#initialState },
      deltas: [...this.#deltas],
      branchPoints: [...this.#branchPoints],
      model: this.#model,
      currentIndex: this.#index
    };
  }

  set history(historyData) {
    if (!this.#validateHistoryData(historyData)) {
      throw new Error('Invalid history data format');
    }

    // Reset internal state
    this.#initialState = { ...historyData.initialState };
    this.#currentState = { ...historyData.initialState };
    this.#model = historyData.model;
    this.#deltas = [...historyData.deltas];
    this.#branchPoints = new Set(historyData.branchPoints);

    // Reset property versions to initial state
    this.#initializePropertyVersions(historyData.initialState);

    // Reconstruct property versions by replaying deltas up to currentIndex
    this.travel(historyData.currentIndex);
  }

  #validateHistoryData(data) {
    // Basic structure validation
    if (!data || typeof data !== 'object') return false;
    if (!data.initialState || !Array.isArray(data.deltas)) return false;
    if (!Array.isArray(data.branchPoints)) return false;
    if (!Object.values(UndoModel).includes(data.model)) return false;
    if (typeof data.currentIndex !== 'number') return false;

    // Validate deltas structure
    return data.deltas.every(delta =>
        delta &&
        typeof delta.property === 'string' &&
        'value' in delta &&
        typeof delta.timestamp === 'number' &&
        typeof delta.version === 'number'
    );
  }
}
