import { describe, expect, it } from "vitest";
import { getQqUinFromCookie, normalizeQqCookie } from "./qqmusic-auth";

describe("normalizeQqCookie", () => {
  it("removes a Cookie header prefix before persistence", () => {
    expect(normalizeQqCookie(" Cookie: uin=123456; qm_keyst=secret ")).toBe(
      "uin=123456; qm_keyst=secret"
    );
  });
});

describe("getQqUinFromCookie", () => {
  it("reads uin from a complete Cookie", () => {
    expect(getQqUinFromCookie("uin=123456; qm_keyst=secret")).toBe("123456");
  });

  it("supports the wxuin fallback", () => {
    expect(getQqUinFromCookie("wxuin=oABC123; qm_keyst=secret")).toBe(
      "1ABC123"
    );
  });

  it("accepts a Cookie header prefix", () => {
    expect(getQqUinFromCookie("Cookie: uin=123456; qm_keyst=secret")).toBe(
      "123456"
    );
  });

  it("returns null when no QQ identity is present", () => {
    expect(getQqUinFromCookie("qm_keyst=secret")).toBeNull();
  });
});
