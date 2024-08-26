export function wrapProperties(obj, properties, callback) {
  properties.forEach((prop) => {
    let descriptor = Object.getOwnPropertyDescriptor(obj, prop);

    if (!descriptor) {
      let proto = Object.getPrototypeOf(obj);
      while (proto && !descriptor) {
        descriptor = Object.getOwnPropertyDescriptor(proto, prop);
        proto = Object.getPrototypeOf(proto);
      }
    }

    if (descriptor) {
      Object.defineProperty(obj, prop, {
        get: descriptor.get
          ? function () {
              return descriptor.get.call(this);
            }
          : function () {
              return descriptor.value;
            },
        set: function (value) {
          if (descriptor.set) {
            descriptor.set.call(this, value);
          } else if (descriptor.writable) {
            descriptor.value = value;
          }
          callback(prop);
        },
        configurable: true,
        enumerable: descriptor.enumerable,
      });
    }
  });
}

export function wrapMethods(obj, methods, wrapper) {
  methods.forEach((methodName) => {
    const originalMethod = obj[methodName];
    obj[methodName] = function (...args) {
      return wrapper.call(this, () => originalMethod.apply(this, args));
    };
  });
}
