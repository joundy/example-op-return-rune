export class Option<T> {
  private hasValue: bool;
  private value: T;

  private constructor(hasValue: bool, value: T) {
    this.hasValue = hasValue;
    this.value = value;
  }

  static Some<T>(value: T): Option<T> {
    return new Option<T>(true, value);
  }

  static None<T>(defaultValue: T): Option<T> {
    return new Option<T>(false, defaultValue);
  }

  isSome(): bool {
    return this.hasValue;
  }

  isNone(): bool {
    return !this.hasValue;
  }

  unwrap(): T {
    if (!this.hasValue) {
      throw new Error("errors.when unwraping the value");
    }
    return this.value;
  }

  unwrapOr(defaultValue: T): T {
    return this.hasValue ? this.value : defaultValue;
  }
}
