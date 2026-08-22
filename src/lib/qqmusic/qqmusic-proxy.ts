import { QqAudioProxy } from "@/plugins/qq-proxy";
import { Capacitor } from "@capacitor/core";
import { logger } from "@/lib/logger";

let serverStarted = false;
let serverStartPromise: Promise<void> | null = null;

const SERVER_START_TIMEOUT = 8000;

/**
 * 确保本地代理服务器已启动（幂等）
 */
async function ensureServerRunning(): Promise<void> {
  if (serverStarted) return;

  if (serverStartPromise) {
    return serverStartPromise;
  }

  serverStartPromise = (async () => {
    try {
      const status = await QqAudioProxy.isRunning();
      if (status.running) {
        serverStarted = true;
        logger.info(
          "[qq-proxy] Proxy server already running on port",
          status.port
        );
        return;
      }

      const result = await Promise.race([
        QqAudioProxy.startServer(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Server start timeout")),
            SERVER_START_TIMEOUT
          )
        ),
      ]);

      if (result.success) {
        serverStarted = true;
        logger.info("[qq-proxy] Proxy server started on port", result.port);
      } else {
        throw new Error("Failed to start proxy server");
      }
    } finally {
      serverStartPromise = null;
    }
  })();

  return serverStartPromise;
}

/**
 * 获取QQ音频的本地代理播放URL。
 * 注入 Referer/Cookie/UA，解决原生直连 CDN 时鉴权失败导致的无限加载。
 */
export async function getNativeQqStreamUrl(
  audioUrl: string,
  cookie: string
): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) {
    throw new Error("This function is only for native platforms");
  }

  try {
    // 确保代理服务器运行
    await ensureServerRunning();

    // 获取代理URL
    const result = await QqAudioProxy.getProxyUrl({ audioUrl, cookie });
    if (result.success) {
      logger.info("[qq-proxy] Got proxy URL for stream playback");
      return result.url;
    }

    logger.error("[qq-proxy] Failed to get proxy URL");
    return null;
  } catch (e) {
    logger.error("[qq-proxy] Error getting stream URL:", e);
    return null;
  }
}

/**
 * 停止代理服务器（应用退出/进入后台时调用）
 */
export async function stopQqProxyServer(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await QqAudioProxy.stopServer();
    serverStarted = false;
    logger.info("[qq-proxy] Proxy server stopped");
  } catch (e) {
    logger.error("[qq-proxy] Error stopping proxy server:", e);
  }
}
