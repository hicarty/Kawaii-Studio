






// Polyfill for Iterator.prototype.toArray() which is part of the
// Iterator Helpers proposal and not available in all environments.
// React internals may call .values().toArray() on Maps/Sets.

if (typeof Map !== "undefined") {
  const MapIteratorPrototype = Object.getPrototypeOf(
    new Map().values()
  )
  if (MapIteratorPrototype && !MapIteratorPrototype.toArray) {
    MapIteratorPrototype.toArray = function toArray() {
      return Array.from(this)
    }
  }
}

if (typeof Set !== "undefined") {
  const SetIteratorPrototype = Object.getPrototypeOf(
    new Set().values()
  )
  if (SetIteratorPrototype && !SetIteratorPrototype.toArray) {
    SetIteratorPrototype.toArray = function toArray() {
      return Array.from(this)
    }
  }
}

if (typeof Array !== "undefined") {
  const ArrayIteratorPrototype = Object.getPrototypeOf(
    [].values()
  )
  if (ArrayIteratorPrototype && !ArrayIteratorPrototype.toArray) {
    ArrayIteratorPrototype.toArray = function toArray() {
      return Array.from(this)
    }
  }
}

// Also patch the generic Iterator prototype if it exists
try {
  const GeneratorFunction = Object.getPrototypeOf(function* () {})
  const Generator = GeneratorFunction.prototype
  const IteratorPrototype = Object.getPrototypeOf(
    Object.getPrototypeOf(
      (function* () {})()
    )
  )
  if (IteratorPrototype && !IteratorPrototype.toArray) {
    IteratorPrototype.toArray = function toArray() {
      return Array.from(this)
    }
  }
} catch {
  // Ignore if generator prototypes aren't accessible
}

export {}

