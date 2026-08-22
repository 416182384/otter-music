package com.otterhub.music;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.IOException;

/**
 * QQ音乐音频代理插件
 * 管理本地HTTP代理服务器的启动/停止，提供代理URL生成
 */
@CapacitorPlugin(name = "QqAudioProxy")
public class QqAudioProxyPlugin extends Plugin {

    private static QqAudioProxyServer proxyServer;
    private static final Object lock = new Object();

    @PluginMethod
    public void startServer(PluginCall call) {
        synchronized (lock) {
            if (proxyServer != null && proxyServer.isAlive()) {
                JSObject result = new JSObject();
                result.put("success", true);
                result.put("port", proxyServer.getListeningPort());
                call.resolve(result);
                return;
            }

            try {
                proxyServer = new QqAudioProxyServer();
                proxyServer.start();

                int retries = 0;
                while (!proxyServer.isAlive() && retries < 50) {
                    Thread.sleep(100);
                    retries++;
                }

                if (proxyServer.isAlive()) {
                    JSObject result = new JSObject();
                    result.put("success", true);
                    result.put("port", proxyServer.getListeningPort());
                    call.resolve(result);
                } else {
                    call.reject("Server failed to start");
                }
            } catch (IOException | InterruptedException e) {
                call.reject("Failed to start server: " + e.getMessage());
            }
        }
    }

    @PluginMethod
    public void stopServer(PluginCall call) {
        synchronized (lock) {
            if (proxyServer != null) {
                proxyServer.stop();
                proxyServer = null;
            }
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        }
    }

    @PluginMethod
    public void getProxyUrl(PluginCall call) {
        String audioUrl = call.getString("audioUrl");
        String cookie = call.getString("cookie");

        if (audioUrl == null) {
            call.reject("Missing audioUrl parameter");
            return;
        }

        synchronized (lock) {
            if (proxyServer == null || !proxyServer.isAlive()) {
                call.reject("Proxy server not running");
                return;
            }

            String proxyUrl = proxyServer.getProxyUrl(audioUrl, cookie == null ? "" : cookie);
            if (proxyUrl != null) {
                JSObject result = new JSObject();
                result.put("success", true);
                result.put("url", proxyUrl);
                call.resolve(result);
            } else {
                call.reject("Failed to generate proxy URL");
            }
        }
    }

    @PluginMethod
    public void isRunning(PluginCall call) {
        synchronized (lock) {
            boolean running = proxyServer != null && proxyServer.isAlive();
            JSObject result = new JSObject();
            result.put("running", running);
            if (running) {
                result.put("port", proxyServer.getListeningPort());
            }
            call.resolve(result);
        }
    }
}
