import { exactComparison } from "./exactComparison";
import { reportActual } from "../report/reportActual";
import { reportExpected } from "../report/reportExpected";
import { arrayComparison } from "./arrayComparison";
import { assert } from "./assert";

export function referenceComparison<T>(actual: T, expected: T, negated: i32, message: string): void {
  if (!isReference<T>()) {
    exactComparison<T>(actual, expected, negated, message);
    return;
  }

  if (isArray<T>()) {
    arrayComparison<T>(actual, expected, negated, message);
    return;
  }

  // report the actual and expected values
  reportActual<T>(actual);
  reportExpected<T>(expected, negated);

  // fast path, the value is itself, or both values are null
  if (expected == actual) {
    assert(i32(!negated), message);
    return;
  }

  // fast path, both values aren't null together, so if any of them are null, they do not equal
  if (expected == null || actual == null) {
    assert(negated, message);
    return;
  }

  let compareResult = memory.compare(
    changetype<usize>(expected),
    changetype<usize>(actual),
    offsetof<T>(),
  );
  assert(negated ^ i32(compareResult == 0), message);
}
