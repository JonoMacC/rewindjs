const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

const equals = (a, b) => {
  if (a === b) return true;
  if (a instanceof Date && b instanceof Date)
    return a.getTime() === b.getTime();
  if (!a || !b || (typeof a !== "object" && typeof b !== "object"))
    return a === b;
  if (a === null || a === undefined || b === null || b === undefined)
    return false;
  if (a.prototype !== b.prototype) return false;
  if (a instanceof Set && b instanceof Set) {
    return a.size === b.size && [...a].every((value) => b.has(value));
  }
  if (a instanceof Map && b instanceof Map) {
    return (
      a.size === b.size &&
      [...a].every(([key, value]) => b.has(key) && equals(value, b.get(key)))
    );
  }
  let keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((k) => equals(a[k], b[k]));
};

const deepEqual = (a, b, visited = new WeakSet()) => {
  // Handle base case: simple values
  if (
    typeof a !== "object" ||
    typeof b !== "object" ||
    a === null ||
    b === null
  ) {
    return a === b;
  }

  // Handle circular references
  if (visited.has(a) || visited.has(b)) {
    return true;
  }
  visited.add(a);
  visited.add(b);

  // Handle built-in objects
  const aString = Object.prototype.toString.call(a);
  const bString = Object.prototype.toString.call(b);
  if (aString !== bString) {
    return false;
  }

  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false;
    for (let [key, value] of a) {
      if (!b.has(key) || !deepEqual(value, b.get(key), visited)) {
        return false;
      }
    }
    return true;
  }

  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false;
    for (let item of a) {
      if (!b.has(item)) {
        return false;
      }
    }
    return true;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index], visited));
  }

  if (a.constructor === Object && b.constructor === Object) {
    const keys1 = Object.keys(a);
    const keys2 = Object.keys(b);
    if (keys1.length !== keys2.length) return false;
    return keys1.every((key) => deepEqual(a[key], b[key], visited));
  }

  // Handle functions
  if (typeof a === "function" && typeof b === "function") {
    return a.toString() === b.toString();
  }

  return false; // If none of the above match, they are not equal
};

const isMapOrSet = (value) => value instanceof Map || value instanceof Set;

const isEmpty = (obj) => {
  if (obj === null || obj === undefined) return true;
  if (typeof obj === "object") {
    if (isMapOrSet(obj)) return obj.size === 0;
    if (Array.isArray(obj)) return obj.length === 0;
    return Object.keys(obj).length === 0;
  }
  return false;
};

const randomId = () => "_" + Math.random().toString(36).substring(2, 9);

export { clamp, equals, deepEqual, isEmpty, randomId };
