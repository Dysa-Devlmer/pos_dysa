/**
 * Unit tests — lib/version.ts (semver compare + force-update flag)
 */
import {
  compareVersions,
  isUpdateAvailable,
  isForceUpdate,
} from "../lib/version";

describe("compareVersions", () => {
  test("igualdad", () => {
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
  });
  test("major < major", () => {
    expect(compareVersions("1.0.0", "2.0.0")).toBeLessThan(0);
  });
  test("minor diff", () => {
    expect(compareVersions("1.2.0", "1.10.0")).toBeLessThan(0);
  });
  test("patch diff", () => {
    expect(compareVersions("1.0.5", "1.0.10")).toBeLessThan(0);
  });
  test("input invalido → 0 (fail-safe)", () => {
    expect(compareVersions("not-a-version", "1.0.0")).toBe(0);
  });
});

describe("isUpdateAvailable", () => {
  test("hay update", () => {
    expect(isUpdateAvailable("1.0.0", "1.0.4")).toBe(true);
  });
  test("misma version", () => {
    expect(isUpdateAvailable("1.0.4", "1.0.4")).toBe(false);
  });
  test("instalada > disponible (downgrade)", () => {
    expect(isUpdateAvailable("2.0.0", "1.0.4")).toBe(false);
  });
});

describe("isForceUpdate", () => {
  test("instalada < min → force", () => {
    expect(isForceUpdate("1.0.0", "1.0.4")).toBe(true);
  });
  test("instalada >= min → no force", () => {
    expect(isForceUpdate("1.0.4", "1.0.4")).toBe(false);
  });
  test("min null → no force", () => {
    expect(isForceUpdate("1.0.0", null)).toBe(false);
  });
  test("min undefined → no force", () => {
    expect(isForceUpdate("1.0.0", undefined)).toBe(false);
  });
});
