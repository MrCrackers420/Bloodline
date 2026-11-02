package com.latch98.mobile;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import java.io.ByteArrayInputStream;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.webkit.WebViewAssetLoader;

/** Offline Latch 98 HTML desktop with a native Rust private-disk backend. */
public class MainActivity extends Activity {
    private WebView webView;
    private ValueCallback<Uri[]> uploadCallback;
    private static final int FILE_PICKER = 101;
    private static final String ORIGIN = "https://appassets.androidplatform.net";

    private final class DiskBridge {
        @JavascriptInterface public String readDisk() { return RustDisk.readDisk(getFilesDir().getAbsolutePath()); }
        @JavascriptInterface public boolean writeDisk(String text) { return RustDisk.writeDisk(getFilesDir().getAbsolutePath(), text); }
    }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        webView = new WebView(this);
        setContentView(webView);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        // Bridge exposes ONLY private LatchFS read/write, not filesystem paths or commands.
        // Do not enable arbitrary third-party script execution in app windows.
        webView.addJavascriptInterface(new DiskBridge(), "LatchAndroid");
        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();
        webView.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                // JavascriptInterface is visible to all WebView frames. Deny external frame
                // documents and subresources so third-party origins cannot reach LatchFS.
                if ("https".equals(uri.getScheme()) && "appassets.androidplatform.net".equals(uri.getHost()))
                    return loader.shouldInterceptRequest(uri);
                return new WebResourceResponse("text/plain", "UTF-8", new ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String host = uri.getHost();
                if ("https".equals(uri.getScheme()) && "appassets.androidplatform.net".equals(host)) return false;
                if (!request.isForMainFrame()) return false; // visible YouTube embed, where supported
                if ("https".equals(uri.getScheme()) && ("music.youtube.com".equals(host) || "www.youtube.com".equals(host) || "youtube.com".equals(host))) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); } catch (ActivityNotFoundException ignored) {}
                    return true;
                }
                return true; // Block all other top-level navigation away from our trusted assets.
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (uploadCallback != null) uploadCallback.onReceiveValue(null);
                uploadCallback = cb;
                try {
                    Intent intent = params.createIntent();
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    startActivityForResult(intent, FILE_PICKER);
                    return true;
                } catch (Exception e) {
                    uploadCallback.onReceiveValue(null); uploadCallback = null; return false;
                }
            }
        });
        webView.loadUrl(ORIGIN + "/web/index.html");
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request,result,data);
        if (request == FILE_PICKER && uploadCallback != null) {
            uploadCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, data));
            uploadCallback=null;
        }
    }
    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
    @Override protected void onDestroy() { if(webView!=null){webView.destroy();webView=null;}super.onDestroy(); }
}
