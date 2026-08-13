import { describe, expect, it } from "vitest";
import { buildVkeyRequestBody } from "./qqmusic";

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
