package com.digitalsignage.player

import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import android.util.Log
import androidx.core.content.FileProvider
import java.io.File
import java.io.FileInputStream
import java.security.MessageDigest

object UpdateManager {
    private const val TAG = "UpdateManager"
    private const val PREFS_NAME = "update_prefs"
    private const val PREF_DOWNLOAD_ID = "download_id"
    private const val PREF_EXPECTED_SHA256 = "expected_sha256"

    fun startDownload(context: Context, downloadUrl: String, expectedSha256: String, versionName: String) {
        Log.i(TAG, "Iniciando descarga de APK v$versionName")
        
        val downloadManager = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        val request = DownloadManager.Request(Uri.parse(downloadUrl))
            .setTitle("Actualización v$versionName")
            .setDescription("Descargando nueva versión...")
            .setDestinationInExternalFilesDir(context, Environment.DIRECTORY_DOWNLOADS, "update.apk")
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE)
            .setAllowedOverMetered(true)
            .setAllowedOverRoaming(true)

        val downloadId = downloadManager.enqueue(request)
        
        // Guardar info en SharedPreferences
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().apply {
            putLong(PREF_DOWNLOAD_ID, downloadId)
            putString(PREF_EXPECTED_SHA256, expectedSha256)
            apply()
        }
        
        Log.i(TAG, "Descarga iniciada con ID: $downloadId")
    }

    fun handleDownloadComplete(context: Context, downloadId: Long) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val expectedDownloadId = prefs.getLong(PREF_DOWNLOAD_ID, -1)
        
        if (downloadId != expectedDownloadId) {
            Log.d(TAG, "Descarga completada pero no es la nuestra")
            return
        }
        
        val expectedSha256 = prefs.getString(PREF_EXPECTED_SHA256, null)
        if (expectedSha256 == null) {
            Log.e(TAG, "No se encontró SHA256 esperado")
            return
        }
        
        Log.i(TAG, "Descarga completada, verificando checksum...")
        
        val apkFile = File(context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "update.apk")
        if (!apkFile.exists()) {
            Log.e(TAG, "Archivo APK no encontrado")
            return
        }
        
        val calculatedSha256 = calculateSHA256(apkFile)
        if (calculatedSha256 == null) {
            Log.e(TAG, "Error al calcular SHA256")
            apkFile.delete()
            return
        }
        
        if (!calculatedSha256.equals(expectedSha256, ignoreCase = true)) {
            Log.e(TAG, "Checksum NO coincide. Esperado: $expectedSha256, Calculado: $calculatedSha256")
            apkFile.delete()
            return
        }
        
        Log.i(TAG, "Checksum verificado correctamente, lanzando instalador...")
        installApk(context, apkFile)
    }

    private fun installApk(context: Context, apkFile: File) {
        try {
            // Verificar permiso de instalación en Android 8+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (!context.packageManager.canRequestPackageInstalls()) {
                    Log.w(TAG, "No hay permiso para instalar apps. Abriendo configuración...")
                    val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                        data = Uri.parse("package:${context.packageName}")
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                    context.startActivity(intent)
                    return
                }
            }
            
            val apkUri = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", apkFile)
            } else {
                Uri.fromFile(apkFile)
            }
            
            val intent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(apkUri, "application/vnd.android.package-archive")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION
            }
            
            context.startActivity(intent)
            Log.i(TAG, "Instalador de Android lanzado")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error al lanzar instalador: ${e.message}", e)
        }
    }

    private fun calculateSHA256(file: File): String? {
        return try {
            val digest = MessageDigest.getInstance("SHA-256")
            FileInputStream(file).use { fis ->
                val buffer = ByteArray(8192)
                var read: Int
                while (fis.read(buffer).also { read = it } != -1) {
                    digest.update(buffer, 0, read)
                }
            }
            digest.digest().joinToString("") { "%02x".format(it) }
        } catch (e: Exception) {
            Log.e(TAG, "Error calculando SHA256: ${e.message}", e)
            null
        }
    }
}

class DownloadCompleteReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == DownloadManager.ACTION_DOWNLOAD_COMPLETE) {
            val downloadId = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1)
            if (downloadId != -1L) {
                UpdateManager.handleDownloadComplete(context, downloadId)
            }
        }
    }
}
