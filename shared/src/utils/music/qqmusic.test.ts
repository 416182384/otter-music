import { describe, expect, it } from "vitest";
import {
  buildVkeyRequestBody,
  orderQqQualityKeys,
  qqBrToQualityKey,
} from "./qqmusic";

describe("buildVkeyRequestBody", () => {
  it("uses anonymous credentials by default", () => {
    const body = buildVkeyRequestBody("song-mid", ["320k"]);

    expect(body.loginUin).toBe("0");
    expect(body.comm.uin).toBe("0");
    expect(body.req_1.param.uin).toBe("0");
  });

  it("uses the authenticated uin when provided", () => {
    const body = buildVkeyRequestBody("song-mid", ["320k"], "123456");

    expect(body.loginUin).toBe("123456");
    expect(body.comm.uin).toBe("123456");
    expect(body.req_1.param.uin).toBe("123456");
  });
});

describe("qqBrToQualityKey", () => {
  it("caps at 320k for high bitrates", () => {
    expect(qqBrToQualityKey(320)).toBe("320k");
    expect(qqBrToQualityKey(999)).toBe("320k");
  });

  it("falls back to 128k below 320 (no 192 tier on QQ)", () => {
    expect(qqBrToQualityKey(192)).toBe("128k");
    expect(qqBrToQualityKey(128)).toBe("128k");
  });

  it("defaults to 320k", () => {
    expect(qqBrToQualityKey()).toBe("320k");
  });
});

describe("orderQqQualityKeys", () => {
  it("puts the preferred key first and keeps the rest in default order", () => {
    expect(orderQqQualityKeys("128k")).toEqual(["128k", "320k", "m4a"]);
  });

  it("returns the default order when preferred is unknown", () => {
    expect(orderQqQualityKeys("flac")).toEqual(["320k", "128k", "m4a"]);
  });
});
