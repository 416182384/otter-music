package com.otterhub.music;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.Dialog;
import android.os.Handler;
import android.os.Looper;
import android.view.Window;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.LinkedHashSet;
import java.util.Set;

/**
 * B站 WebView 登录插件
 * 打开全屏 WebView 加载 B站登录页，登录成功后从 CookieManager
 * 捕获 SESSDATA Cookie 并返回给 JS 层持久化。
 */
@CapacitorPlugin(name = "BilibiliLogin")
public class BilibiliLoginPlugin extends Plugin {

    private static final String LOGIN_URL = "https://passport.bilibili.com/login";
    private static final String COOKIE_URL = "https://www.bilibili.com/";
    private static final String[] COOKIE_URLS = {
            "https://www.bilibili.com/",
            "https://passport.bilibili.com/",
            "https://bilibili.com/"
    };
    private static final long POLL_INTERVAL_MS = 1000;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private Dialog loginDialog;
    private WebView loginWebView;
    private Runnable pollRunnable;
    private PluginCall pendingCall;

    @PluginMethod
    public void openLogin(PluginCall call) {
        if (pendingCall != null) {
            call.reject("Login dialog is already open");
            return;
        }
        Activity activity = getActivity();
        if (activity == null || activity.isFinishing()) {
            call.reject("Activity not available");
            return;
        }
        pendingCall = call;
        activity.runOnUiThread(() -> openLoginDialog(activity));
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void openLoginDialog(Activity activity) {
        WebView webView = new WebView(activity.getApplicationContext());
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        // 去掉默认 UA 中的 "wv" 标记，降低被 B站风控拦截的概率
        String ua = settings.getUserAgentString();
        if (ua != null && ua.contains("wv")) {
            settings.setUserAgentString(ua.replace("wv", ""));
        }

        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

        webView.setWebViewClient(new WebViewClient());
        webView.loadUrl(LOGIN_URL);

        loginDialog = new Dialog(activity, android.R.style.Theme_NoTitleBar_Fullscreen);
        loginDialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
        loginDialog.setContentView(webView);
        loginWebView = webView;
        loginDialog.setOnCancelListener(dialog -> cancelLogin());
        loginDialog.setOnDismissListener(dialog -> cleanup());
        loginDialog.show();

        startPolling();
    }

    private void startPolling() {
        stopPolling();
        pollRunnable = new Runnable() {
            @Override
            public void run() {
                if (pendingCall == null) return;
                String cookies = CookieManager.getInstance().getCookie(COOKIE_URL);
                if (cookies != null && cookies.contains("SESSDATA=")) {
                    finishLogin(collectCookies());
                    return;
                }
                mainHandler.postDelayed(this, POLL_INTERVAL_MS);
            }
        };
        mainHandler.postDelayed(pollRunnable, POLL_INTERVAL_MS);
    }

    private void stopPolling() {
        if (pollRunnable != null) {
            mainHandler.removeCallbacks(pollRunnable);
            pollRunnable = null;
        }
    }

    private String collectCookies() {
        Set<String> parts = new LinkedHashSet<>();
        for (String url : COOKIE_URLS) {
            String cookies = CookieManager.getInstance().getCookie(url);
            if (cookies == null || cookies.isEmpty()) continue;
            for (String part : cookies.split(";")) {
                String trimmed = part.trim();
                if (!trimmed.isEmpty()) parts.add(trimmed);
            }
        }
        return String.join("; ", parts);
    }

    private void finishLogin(String cookie) {
        stopPolling();
        dismissDialog();
        if (pendingCall != null) {
            PluginCall call = pendingCall;
            pendingCall = null;
            JSObject result = new JSObject();
            result.put("cookie", cookie);
            call.resolve(result);
        }
    }

    private void cancelLogin() {
        stopPolling();
        dismissDialog();
        if (pendingCall != null) {
            PluginCall call = pendingCall;
            pendingCall = null;
            call.resolve(null);
        }
    }

    private void dismissDialog() {
        if (loginDialog != null && loginDialog.isShowing()) {
            loginDialog.dismiss();
        }
    }

    private void cleanup() {
        if (loginWebView != null) {
            loginWebView.stopLoading();
            loginWebView.loadUrl("about:blank");
            loginWebView.removeAllViews();
            loginWebView.destroy();
            loginWebView = null;
        }
        loginDialog = null;
        // 对话框被系统关闭（非主动 resolve）时兜底释放 pendingCall
        if (pendingCall != null) {
            PluginCall call = pendingCall;
            pendingCall = null;
            call.resolve(null);
        }
    }
}