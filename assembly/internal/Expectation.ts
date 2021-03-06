// @ts-ignore: Decorators *are* valid here
@external("__aspect", "tryCall")
declare function tryCall(func: () => void): bool;

// @ts-ignore: Decorators *are* valid here!
@external("__aspect", "clearExpected")
declare function clearExpected(): void;

// @ts-ignore: Decorators *are* valid here!
@external("__aspect", "reportActualNull")
declare function reportActualNull(): void;

// @ts-ignore: Decorators *are* valid here!
@external("__aspect", "reportExpectedNull")
declare function reportExpectedNull(negated: i32): void;

// @ts-ignore: Decorators *are* valid here!
@external("__aspect", "reportActualValue")
declare function reportActualFloat(value: f64): void;

// @ts-ignore: Decorators *are* valid here!
@external("__aspect", "reportActualValue")
declare function reportActualInteger(value: i32): void;

// @ts-ignore: Decorators *are* valid here!
@external("__aspect", "reportExpectedValue")
declare function reportExpectedFloat(value: f64, negated: i32): void;

// @ts-ignore: Decorators *are* valid here!
@external("__aspect", "reportExpectedValue")
declare function reportExpectedInteger(value: i32, negated: i32): void;

// @ts-ignore: Decorators *are* valid here!
@external("__aspect", "reportActualReference")
declare function reportActualReference(value: usize, offset: i32): void;

// @ts-ignore: Decorators *are* valid here!
@external("__aspect", "reportExpectedReference")
declare function reportExpectedReference(value: usize, offset: i32, negated: i32): void;

// @ts-ignore: Decorators *are* valid here!
@external("__aspect", "reportActualString")
declare function reportActualString(value: string): void;

// @ts-ignore: Decorators *are* valid here!
@external("__aspect", "reportExpectedString")
declare function reportExpectedString(value: string, negated: i32): void;

// @ts-ignore: Decorators *are* valid here!
@external("__aspect", "reportExpectedTruthy")
declare function reportExpectedTruthy(negated: i32): void;

// @ts-ignore: Decorators *are* valid here!
@external("__aspect", "reportExpectedFalsy")
declare function reportExpectedFalsy(negated: i32): void;

// @ts-ignore: Decorators *are* valid here!
@external("__aspect", "reportExpectedFinite")
declare function reportExpectedFinite(negated: i32): void;

/**
 * The AssemblyScript class that represents an expecation.
 */
// @ts-ignore: Decorators *are* valid here
@global
export class Expectation<T> {
  /**
   * This i32 is set to 1 if the expectation is negated. Using the _not (xor) condition assertion
   * makes assertions very easy to write and understand.
   */
  _not: i32 = 0;

  /** This is the actual value. */
  actual: T;

  /**
   * Construct an assertion.
   *
   * @param {T} actual - The actual value.
   */
  constructor(actual: T) {
    this.actual = actual;
  }

  /**
   * This property negates the assertion by setting the internal _not property.
   */
  public get not(): Expectation<T> {
    this._not = 1;
    return this;
  }

  /**
   * This method reports value and reference equality.
   *
   * @param {T} expected - The expected value.
   * @param {string} message - The message that describes this assertion.
   */
  @inline
  public toBe(expected: T, message: string = ""): void {
    // use default reporting methods
    this.reportActual();
    this.reportExpected(expected);

    // assert value or reference equality
    assert(this._not ^ i32(expected == this.actual), message);

    this.cleanup();
  }

  /**
   * This method reports strict equality on bytes. It has a special path for ArrayBuffers.
   *
   * @param {T} expected - The expected value.
   * @param {string} message - The message that describes this assertion.
   */
  @inline
  public toStrictEqual(expected: T, message: string = ""): void {

    // special path for strict equality on ArrayBuffer
    if (expected instanceof ArrayBuffer) {
      this.toStrictEqualArrayBuffer(expected, message);
      return;
    }

    // report the actual and expected values
    this.reportActual();
    this.reportExpected(expected);

    // fast path, the value is itself
    if (expected == this.actual) {
      assert(!this._not, message);
      this.cleanup();
      return;
    }
    // slow path, assert a memcompare
    if (isReference<T>()) {
      // fast path, both values aren't null together, so if any of them are null, they do not equal
      if (expected == null || this.actual == null) {
        assert(this._not, message);
        this.cleanup();
        return;
      }

      let compareResult = memory.compare(
        changetype<usize>(expected),
        changetype<usize>(this.actual),
        offsetof<T>(),
      );
      assert(this._not ^ i32(compareResult == 0), message);
      this.cleanup();
      return;
    } else { // delegate toBe
      this.toBe(expected);
    }
  }

  /**
   * This in internal helper to compare two array buffers.
   *
   * @param {ArrayBuffer} expected - This is the expected array buffer value.
   * @param {string} message - The message that describes this expectation.
   */
  @inline
  private toStrictEqualArrayBuffer(expected: T, message: string = ""): void {
    // cast the values to ArrayBuffer | null
    let expectedBuff: ArrayBuffer | null = changetype<ArrayBuffer>(changetype<usize>(expected));
    let actualBuff: ArrayBuffer | null = changetype<ArrayBuffer>(changetype<usize>(this.actual));

    // report the expected rederence
    if (expectedBuff == null) {
      reportExpectedNull(this._not);
    } else {
      reportExpectedReference(expectedBuff.data, expectedBuff.byteLength, this._not);
    }

    // report the actual reference
    if (actualBuff == null) {
      reportActualNull();
    } else {
      reportActualReference(actualBuff.data, actualBuff.byteLength);
    }

    var expectedNull: i32 = i32(expectedBuff == null);
    var actualNull: i32 = i32(actualBuff == null);

    if (expectedNull ^ actualNull) {
      assert(this._not, message);
    } else {
      let lengthEqual = actualBuff.byteLength == expectedBuff.byteLength;
      let bytesEqual = memory.compare(changetype<usize>(actualBuff), changetype<usize>(expectedBuff), actualBuff.byteLength) == 0;


      assert(this._not ^ i32(lengthEqual && bytesEqual), message);
    }
    this.cleanup();
  }


  @inline
  public toBeTruthy(message: string = ""): void {
    this.reportActual();
    reportExpectedTruthy(this._not);

    if (isReference<T>()) {
      // if the reference is null
      if (this.actual == null) {
        // it should throw if it's not negated
        assert(this._not, message);
      } else if (this.actual instanceof String) {
        // it should throw if it's an empty string
        assert(this._not ^ i32(this.actual.length != 0), message);
      } else {
        // it should throw it's negated
        assert(!this._not, message);
      }
    } else {
      if (isFloat<T>()) {
        // @ts-ignore T is a float type
        let isFalsy: bool = isNaN<T>(this.actual) || this.actual == <T>0;
        assert(this._not ^ i32(!isFalsy), message);
      } else {
        // @ts-ignore: T is integer type and the cast is safe
        let isFalsy: bool = this.actual == <T>0;
        assert(this._not ^ i32(!isFalsy), message);
      }
    }

    this.cleanup();
  }

  @inline
  public toBeFalsy(message: string = ""): void {
    this.reportActual();
    reportExpectedFalsy(this._not);

    if (isReference<T>()) {
      // if the reference is null
      if (this.actual == null) {
        // it should throw if it's not negated
        assert(!this._not, message);
      } else if (this.actual instanceof String) {
        // it should throw if it's an empty string
        assert(this._not ^ i32(this.actual.length == 0), message);
      } else {
        // it should throw it's not negated
        assert(this._not, message);
      }
    } else {
      if (isFloat<T>()) {
        // @ts-ignore T is a float type
        var isFalsy = isNaN<T>(this.actual) || this.actual == <T>0;
        assert(this._not ^ i32(isFalsy), message);
      } else {
        assert(this._not ^ i32(!this.actual), message);
      }
    }

    this.cleanup();
  }

  @inline
  public toThrow(message: string = ""): void {
    // todo: Follow up support on this

    // @ts-ignore: this.value is assumed to be a function, and this could cause many problems
    var throws: bool = !tryCall(this.actual);
    reportActualString(throws ? "throws" : "not throws");
    reportExpectedString((this._not ? "not throws" : "throws"), this._not);
    assert(this._not ^ i32(throws), message);
    this.cleanup();

    /*if(isFunction<T>()) {
      
    } else {
      assert(false, "toThrow must be called with an actual function.");
    }*/
    // assert(isFunction<T>(), "toThrow expectation must be called on a function type.");

  }

  @inline
  public toBeGreaterThan(expected: T, message: string = ""): void {
    this.reportActual();
    this.reportExpected(expected);

    if (isReference<T>()) {
      // Perform reference type null checks
      assert(expected != null, "Nullable comparison fails, expected value is null.");
      assert(this.actual != null, "Nullable comparison fails, actual value is null.");
    }

    // Compare float types
    if (isFloat<T>(this.actual)) {
      assert(!isNaN<T>(expected), "Value comparison fails, expected value is NaN.");
      assert(!isNaN<T>(this.actual), "Value comparison fails, actual value is NaN.");
    }

    // do actual greater than comparison
    assert(this._not ^ i32(this.actual > expected), message);
    this.cleanup();
  }

  @inline
  public toBeGreaterThanOrEqualTo(expected: T, message: string = ""): void {
    this.reportActual();
    this.reportExpected(expected);

    if (isReference<T>()) {
      // Perform reference type null checks
      assert(expected != null, "Nullable comparison fails, expected value is null.");
      assert(this.actual != null, "Nullable comparison fails, actual value is null.");
    }

    // Compare float types
    if (isFloat<T>(this.actual)) {
      assert(!isNaN<T>(expected), "Value comparison fails, expected value is NaN.");
      assert(!isNaN<T>(this.actual), "Value comparison fails, actual value is NaN.");
    }

    // do actual greater than or equal to comparison
    assert(this._not ^ i32(this.actual >= expected), message);
    this.cleanup();
  }

  @inline
  public toBeLessThan(expected: T, message: string = ""): void {
    this.reportActual();
    this.reportExpected(expected);

    if (isReference<T>()) {
      // Perform reference type null checks
      assert(expected != null, "Nullable comparison fails, expected value is null.");
      assert(this.actual != null, "Nullable comparison fails, actual value is null.");
    }

    // Compare float types
    if (isFloat<T>(this.actual)) {
      assert(!isNaN<T>(expected), "Value comparison fails, expected value is NaN.");
      assert(!isNaN<T>(this.actual), "Value comparison fails, actual value is NaN.");
    }

    // do actual less than comparison
    assert(this._not ^ i32(this.actual < expected), message);
    this.cleanup();
  }

  @inline
  public toBeLessThanOrEqualTo(expected: T, message: string = ""): void {
    this.reportActual();
    this.reportExpected(expected);

    if (isReference<T>()) {
      // Perform reference type null checks
      assert(expected != null, "Nullable comparison fails, expected value is null.");
      assert(this.actual != null, "Nullable comparison fails, actual value is null.");
    }

    // Compare float types
    if (isFloat<T>(this.actual)) {
      assert(!isNaN<T>(expected), "Value comparison fails, expected value is NaN.");
      assert(!isNaN<T>(this.actual), "Value comparison fails, actual value is NaN.");
    }

    // do actual less than comparison
    assert(this._not ^ i32(this.actual <= expected), message);
    this.cleanup();
  }

  @inline
  public toBeNull(message: string = ""): void {
    this.reportActual();
    reportExpectedNull(this._not);
    if (isReference<T>()) {
      assert(this._not ^ i32(this.actual == null), message);
    } else {
      /**
       * Numbers are never null, so the following example is what this line tests for. If this
       * assertion is not negated for value types, it will throw.
       *
       * @example
       * expect<i32>(1).not.toBeNull();
       */
      assert(this._not, message);
    }
    this.cleanup();
  }

  @inline
  public toBeCloseTo(expected: T, decimalPlaces: i32 = 2, message: string = ""): void {
    // T must not be a reference
    if (isReference<T>()) {
      assert(false, "toBeCloseTo cannot be called on value types.");
    } else {
      this.reportActual();
      this.reportExpected(expected);

      // must be a float value
      assert(isFloat<T>(this.actual), "toBeCloseTo assertion must be called on a float value.");

      // actual must be finite
      assert(isFinite<T>(this.actual), "toBeCloseTo assertion fails because a actual value is not finite");

      // expected must be finite
      assert(isFinite<T>(expected), "toBeCloseTo assertion fails because expected value is not finite.");

      /**
       * isCloseTo assertion is calculated by using the formula `|expected - actual| < epsilon`.
       * Epsilon is calculated by using `1 / numberOfDigits` or just `Math.pow(0.1, decimalPlaces)`.
       */

      // @ts-ignore tooling errors because T does not extend a numeric value type. This compiles just fine.
      var isClose: bool = abs<T>(expected - this.actual) < Math.pow(0.1, decimalPlaces);

      assert(this._not ^ i32(isClose), message);
      this.cleanup();
    }

  }

  @inline
  public toBeNaN(message: string = ""): void {
    // toBeNaN must not be called on a reference type.
    if (isReference<T>()) {
      assert(false, "toBeNaN must be called using value types.");
    } else {
      this.reportActual();
      reportExpectedFloat(NaN, this._not);

      // must be a float value
      assert(isFloat<T>(this.actual), "toBeNaN assertion must be called on a float value.");

      let isnan: bool = isNaN<T>(this.actual);

      // Perform the actual isClose assertion
      assert(this._not ^ i32(isnan), message);

      this.cleanup();
    }
  }


  @inline
  public toBeFinite(message: string = ""): void {
    // toBeFinite should not be called on a reference type
    if (isReference<T>()) {
      assert(false, "toBeFinite must not be called on reference types.");
    } else {
      this.reportActual();
      reportExpectedFinite(this._not);

      if (isFloat<T>()) {
        let finite: bool = isFinite<T>(this.actual);
        assert(this._not ^ i32(finite), message);
      } else {
        // must be a float value
        assert(false, "toBeFinite must only be called with float value types.");
      }

      this.cleanup();
    }
  }

  @inline
  public toHaveLength(expected: i32, message: string = ""): void {
    if (isReference<T>()) {
      if (this.actual == null) {
        assert(false, "toHaveLength assertion called on null actual value.");
      } else if (this.actual instanceof Uint8Array) {
        this.assertLength(this.actual.length, expected, message);
      } else if (this.actual instanceof Uint8ClampedArray) {
        this.assertLength(this.actual.length, expected, message);
      } else if (this.actual instanceof Int8Array) {
        this.assertLength(this.actual.length, expected, message);
      } else if (this.actual instanceof Uint16Array) {
        this.assertLength(this.actual.length, expected, message);
      } else if (this.actual instanceof Int16Array) {
        this.assertLength(this.actual.length, expected, message);
      } else if (this.actual instanceof Uint32Array) {
        this.assertLength(this.actual.length, expected, message);
      } else if (this.actual instanceof Int32Array) {
        this.assertLength(this.actual.length, expected, message);
      } else if (this.actual instanceof Uint64Array) {
        this.assertLength(this.actual.length, expected, message);
      } else if (this.actual instanceof Int64Array) {
        this.assertLength(this.actual.length, expected, message);
      } else if (this.actual instanceof Float32Array) {
        this.assertLength(this.actual.length, expected, message);
      } else if (this.actual instanceof Float64Array) {
        this.assertLength(this.actual.length, expected, message);
      } else if (this.actual instanceof ArrayBuffer) {
        this.assertLength(this.actual.byteLength, expected, message);
      } else if (isArray<T>()) {
        // @ts-ignore this value is an array
        this.assertLength(this.actual.length, expected, message);
      } else {
        this.assertLength(
          load<i32>(changetype<usize>(this.actual), offsetof<T>("length")),
          expected,
          message,
        );
      }
    } else {
      assert(false, "toHaveLength should be called on TypedArrays, ArrayBuffers, Arrays, and classes that have a length property.");
    }
  }

  @inline
  private assertLength(actual: i32, expected: i32, message: string): void {
    reportActualInteger(actual);
    reportExpectedInteger(expected, this._not);
    assert(this._not ^ i32(actual == expected), message);
    this.cleanup();
  }

  /**
   * This function performs reporting to javascript what the actual value of this expectation is.
   */
  private reportActual(): void {
    // if T is a reference type...
    if (isReference<T>()) {
      // check to see if it's null
      if (this.actual == null) {
        reportActualNull();
        // otherwise it might be a string
      } else if (this.actual instanceof String) {
        // @ts-ignore this is already a string, and we can pass up the string reference quickly
        reportActualString(<string>this.actual);
        // it also might be an array buffer
      } else if (this.actual instanceof ArrayBuffer) {
        // reporting the reference is as simple as using the pointer and the byteLength property.
        reportActualReference(changetype<usize>(this.actual.data), this.actual.byteLength);
      } else {
        // otherwise report the reference in a default way
        reportActualReference(changetype<usize>(this.actual), offsetof<T>());
      }
    } else {
      if (isFloat<T>()) {
        // @ts-ignore: this cast is valid because it's already a float and this upcast is not lossy
        reportActualFloat(<f64>this.actual);
      } else {
        // @ts-ignore: this cast is valid because it's already an integer, but this is a lossy conversion
        reportActualInteger(<i32>this.actual);
      }
    }
  }

  /**
   * This function performs reporting to javascript what the expected value of this expectation is.
   */
  private reportExpected(expected: T): void {
    // if T is a reference type...
    if (isReference<T>()) {
      // check to see if it's null
      if (expected == null) {
        reportExpectedNull(this._not);
        // otherwise it might be a string
      } else if (expected instanceof String) {
        // @ts-ignore this is already a string, and we can pass up the string reference quickly
        reportExpectedString(<string>expected, this._not);
        // it also might be an array buffer
      } else if (expected instanceof ArrayBuffer) {
        // reporting the reference is as simple as using the pointer and the byteLength property.
        reportExpectedReference(expected.data, expected.byteLength, this._not);
      } else {
        // otherwise report the reference in a default way
        reportExpectedReference(changetype<usize>(expected), offsetof<T>(), this._not);
      }
    } else {
      if (isFloat<T>()) {
        // @ts-ignore: this cast is valid because it's already a float and this upcast is not lossy
        reportExpectedFloat(<f64>expected, this._not);
      } else {
        // @ts-ignore: this cast is valid because it's already an integer, but this is a lossy conversion
        reportExpectedInteger(<i32>expected, this._not);
      }
    }
  }

  /**
   * This private function removes all the actual and expected values from the host, then frees the
   * Expectation<T> reference to prevent memory leaks.
   */
  private cleanup(): void {
    /**
     * This method clears the actual and expected values from the expectation from the host's cache.
     */
    clearExpected();
    if (!isManaged<Expectation<T>>()) {
      memory.free(changetype<usize>(this));
    }
  }
}

/**
 * Global exported function expected. Used to describe an expectation.
 *
 * @param {T} actual - The actual value of the expectation
 */
// @ts-ignore: decorators *are* valid here
@global
export function expect<T>(actual: T): Expectation<T> {
  return new Expectation<T>(actual);
}

/**
 * A shorthand for `expect<(): => void>(callback: () => void)`.
 *
 * @param {() => void} cb - The callback to be tested.
 */
// @ts-ignore: decorators *are* valid here
@global
export function expectFn(cb: () => void): Expectation<() => void> {
  return new Expectation<() => void>(cb);
}
