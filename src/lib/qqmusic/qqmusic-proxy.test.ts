import { beforeEach, describe, expect, it, vi } from "vitest";

// 模拟原生平台（让 Capacitor.isNativePlatform() 返回 true）
vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => true,
  },
}));

// 模拟 QQ 音频代理插件
const getProxyUrlMock = vi.fn();
const stopServerMock = vi.fn();
vi.mock("@/plugins/qq-proxy", () => ({
  QqAudioProxy: {
    isRunning: vi.fn().mockResolvedValue({ running: false }),
    startServer: vi.fn().mockResolvedValue({ success: true, port: 8766 }),
    getProxyUrl: (...args: unknown[]) => getProxyUrlMock(...args),
    stopServer: (...args: unknown[]) => stopServerMock(...args),
  },
}));

import { getNativeQqStreamUrl, stopQqProxyServer } from "./qqmusic-proxy";

describe("qqmusic-proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 默认插件返回一个可用的代理 URL
    getProxyUrlMock.mockResolvedValue({
      success: true,
      url: "http://localhost:8766/proxy?url=x&cookie=y",
    });
    stopServerMock.mockResolvedValue({ success: true });
  });

  it("returns the proxied stream URL on native platforms", async () => {
    const url = await getNativeQqStreamUrl(
      "https://ws.stream.qqmusic.qq.com/C400abc.mp3",
      "uin=123; qm_keyst=secret"
    );

    expect(url).toBe("http://localhost:8766/proxy?url=x&cookie=y");
    expect(getProxyUrlMock).toHaveBeenCalledWith({
      audioUrl: "https://ws.stream.qqmusic.qq.com/C400abc.mp3",
      cookie: "uin=123; qm_keyst=secret",
    });
  });

  it("returns null when the plugin fails to generate a proxy URL", async () => {
    getProxyUrlMock.mockResolvedValueOnce({ success: false });

    const url = await getNativeQqStreamUrl(
      "https://ws.stream.qqmusic.qq.com/C400abc.mp3",
      "uin=123"
    );

    expect(url).toBeNull();
  });

  it("returns null when the plugin throws", async () => {
    getProxyUrlMock.mockRejectedValueOnce(new Error("bridge error"));

    const url = await getNativeQqStreamUrl(
      "https://ws.stream.qqmusic.qq.com/C400abc.mp3",
      "uin=123"
    );

    expect(url).toBeNull();
  });

  it("stops the proxy server", async () => {
    await stopQqProxyServer();
    expect(stopServerMock).toHaveBeenCalled();
  });
});
