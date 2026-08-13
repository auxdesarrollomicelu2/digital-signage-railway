package com.digitalsignage.player

import android.util.Log
import android.webkit.JavascriptInterface

class UpdateBridge(private val activity: MainActivity) {
    
    @JavascriptInterface
    fun downloadAndInstallAPK(downloadUrl: String, sha256: String, versionName: String) {
        Log.i("UpdateBridge", "Comando recibido desde WebView: v$versionName")
        
        activity.runOnUiThread {
            UpdateManager.startDownload(
                context = activity,
                downloadUrl = downloadUrl,
                expectedSha256 = sha256,
                versionName = versionName
            )
        }
    }
    
    @JavascriptInterface
    fun getApkVersion(): Int {
        return try {
            val packageInfo = activity.packageManager.getPackageInfo(activity.packageName, 0)
            @Suppress("DEPRECATION")
            packageInfo.versionCode
        } catch (e: Exception) {
            Log.e("UpdateBridge", "Error obteniendo versión APK", e)
            1 // Valor por defecto si falla
        }
    }
}
