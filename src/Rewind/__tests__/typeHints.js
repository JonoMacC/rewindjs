// File for testing the IDE type hinting inferred from the code type annotations

import {createRewindableElement} from "../createRewindableElement";
import {createRewindable} from "../createRewindable";
import rewind from "../rewind";
import RewindTile from "../../demos/tiles/RewindTile/RewindTile";

class Base {
  #label;
  #count;
  constructor() {
    this.#label = "";
  }

  get label() {
    return this.#label;
  }

  set label(value) {
    this.#label = value;
  }

  get count() {
    return this.#count;
  }

  set count(value) {
    this.#count = value;
  }

  increment() {
    this.#count++;
    return this;
  }

  reset() {
    this.#count = 0;
    return this;
  }
}

class BaseComponent extends HTMLElement {
  #label;
  #count;
  constructor() {
    super();
    this.#label = "";
  }

  get label() {
    return this.#label;
  }

  set label(value) {
    this.#label = value;
  }

  get count() {
    return this.#count;
  }

  set count(value) {
    this.#count = value;
  }

  increment() {
    this.#count++;
    return this;
  }

  reset() {
    this.#count = 0;
    return this;
  }

  connectedCallback() {
    super.connectedCallback?.();
    this.#render();
  }

  #render() {
    this.innerText = `${this.#label}: ${this.#count}`;
  }
}

// Test createRewindable and createRewindableElement functions
const RewindableBaseConstructor = createRewindable(Base, {
  observe: ['label', 'count']
});
const RewindableBaseElementConstructor = createRewindableElement(BaseComponent, {
  observe: ['label', 'count']
});

// Test type inference
const base = new RewindableBaseConstructor();
base.label = "test";  // Should be recognized
base.count = 42;      // Should be recognized
base.increment();     // Should be recognized
base.reset();        // Should be recognized
base.undo();         // Should be recognized (from RewindableMethods)
console.log(base.rewindState);    // Should be recognized (from RewindableProps)

const baseElement = new RewindableBaseElementConstructor();
baseElement.label = "test";  // Should be recognized
baseElement.count = 42;      // Should be recognized
baseElement.increment();     // Should be recognized
baseElement.reset();        // Should be recognized
baseElement.undo();         // Should be recognized (from RewindableMethods)
console.log(baseElement.rewindState);    // Should be recognized (from RewindableProps)
baseElement.focus();  // Should be recognized (from HTMLElement)

// Test rewind function
const RewindBaseConstructor = rewind(Base, {
  observe: ['label', 'count']
});
const RewindBaseElementConstructor = rewind(BaseComponent, {
  observe: ['label', 'count']
});

// Test type inference
const rwBase = new RewindBaseConstructor();
rwBase.label = "test";  // Should be recognized
rwBase.count = 42;      // Should be recognized
rwBase.increment();     // Should be recognized
rwBase.reset();        // Should be recognized
rwBase.undo();         // Should be recognized (from RewindableMethods)
console.log(rwBase.rewindState);    // Should be recognized (from RewindableProps)

const rwBaseElement = new RewindBaseElementConstructor();
rwBaseElement.label = "test";  // Should be recognized
rwBaseElement.count = 42;      // Should be recognized
rwBaseElement.increment();     // Should be recognized
rwBaseElement.reset();        // Should be recognized
rwBaseElement.undo();         // Should be recognized (from RewindableMethods)
console.log(rwBaseElement.rewindState);    // Should be recognized (from RewindableProps)
rwBaseElement.focus();  // Should be recognized (from HTMLElement)

const tile = new RewindTile();
tile.label = "test";  // Should be recognized
tile.suspend();       // Should be recognized
tile.top = 42;        // Should be recognized
tile.focus();         // Should be recognized