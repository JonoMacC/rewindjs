import cel from "../../lib/celerity/cel.js";

/**
 * Utility function to generate a unique key based on the target class and rewind options
 * @param {typeof Rewindable} RewindableClass - The rewindable class
 * @returns {string} The generated key
 */
export function generateKey(RewindableClass) {
  const targetClassName = RewindableClass.targetClass.name;
  const optionsKey = cel.hashCode(JSON.stringify(
    Object.entries(RewindableClass.rewindOptions)
      .toSorted()
      .map(([key, value]) => `${key}:${JSON.stringify(value)}`)
      .join(',')
  ));

  // Create a hash or unique string that combines class and options
  return `${targetClassName}:${optionsKey}`;
}
