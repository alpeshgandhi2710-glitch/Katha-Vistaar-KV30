package com.kathavistaar.kv30

import android.Manifest
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Bundle
import androidx.core.app.ActivityCompat
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File
import java.io.FileOutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder

class MainActivity : FlutterActivity() {
    private val permissionChannel = "kv30/native_permissions"
    private val fmChannel = "kv30/native_fm"
    private var recorder: AudioRecord? = null
    private var recordingThread: Thread? = null
    private var recording = false
    private var paused = false
    private var pcm = ByteArrayOutputStreamCompat()
    private var sampleRate = 48000
    private var channels = 1
    private var startedAt = 0L
    private var lastFile: File? = null
    private var pendingPermissionResult: MethodChannel.Result? = null
    private var pendingPermissionCode: Int? = null

    override fun configureFlutterEngine(engine: FlutterEngine) {
        super.configureFlutterEngine(engine)
        MethodChannel(engine.dartExecutor.binaryMessenger, permissionChannel).setMethodCallHandler { call, result ->
            val permission = call.argument<String>("permission") ?: ""
            val androidPermission = when (permission) {
                "microphone" -> Manifest.permission.RECORD_AUDIO
                "camera" -> Manifest.permission.CAMERA
                "location" -> Manifest.permission.ACCESS_FINE_LOCATION
                "nearbyDevices" -> if (android.os.Build.VERSION.SDK_INT >= 31) Manifest.permission.BLUETOOTH_CONNECT else null
                "notifications" -> if (android.os.Build.VERSION.SDK_INT >= 33) Manifest.permission.POST_NOTIFICATIONS else null
                else -> null
            }
            if (androidPermission == null) { result.success("unavailable"); return@setMethodCallHandler }
            if (call.method == "status") {
                result.success(permissionState(androidPermission)); return@setMethodCallHandler
            }
            if (call.method != "request") { result.notImplemented(); return@setMethodCallHandler }
            if (ActivityCompat.checkSelfPermission(this, androidPermission) == PackageManager.PERMISSION_GRANTED) {
                result.success(true); return@setMethodCallHandler
            }
            if (pendingPermissionResult != null) { result.success(false); return@setMethodCallHandler }
            val requestCode = permissionRequestCode(androidPermission)
            pendingPermissionResult = result
            pendingPermissionCode = requestCode
            ActivityCompat.requestPermissions(this, arrayOf(androidPermission), requestCode)
        }
        MethodChannel(engine.dartExecutor.binaryMessenger, fmChannel).setMethodCallHandler { call, result ->
            when (call.method) {
                "startRecording" -> result.success(startRecording(call.argument<Int>("sampleRate") ?: 48000, call.argument<Int>("channels") ?: 1))
                "pauseRecording" -> { val ok = recording && !paused; if (ok) paused = true; result.success(ok) }
                "resumeRecording" -> { val ok = recording && paused; if (ok) paused = false; result.success(ok) }
                "stopRecording" -> result.success(stopRecording())
                // Mixing/rendering is canonical-server work; native capture only produces uploadable source media.
                "renderMix" -> result.error("server_render_required", "Upload recorded assets and request the canonical server audio mix.", null)
                else -> result.notImplemented()
            }
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != pendingPermissionCode) return
        val granted = grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED
        pendingPermissionResult?.success(granted)
        pendingPermissionResult = null
        pendingPermissionCode = null
    }

    private fun permissionRequestCode(p: String): Int = p.hashCode() and 0x7fff
    private fun permissionState(p: String): String = when {
        ActivityCompat.checkSelfPermission(this, p) == PackageManager.PERMISSION_GRANTED -> "granted"
        else -> "denied"
    }

    private fun startRecording(rate: Int, ch: Int): Boolean {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) return false
        if (recording) return false
        sampleRate = rate.coerceIn(8000, 96000)
        channels = if (ch == 2) 2 else 1
        val channelMask = if (channels == 2) AudioFormat.CHANNEL_IN_STEREO else AudioFormat.CHANNEL_IN_MONO
        val min = AudioRecord.getMinBufferSize(sampleRate, channelMask, AudioFormat.ENCODING_PCM_16BIT)
        if (min <= 0) return false
        val nextRecorder = try {
            AudioRecord(MediaRecorder.AudioSource.MIC, sampleRate, channelMask, AudioFormat.ENCODING_PCM_16BIT, min * 2)
        } catch (_: RuntimeException) { return false }
        if (nextRecorder.state != AudioRecord.STATE_INITIALIZED) { nextRecorder.release(); return false }
        pcm = ByteArrayOutputStreamCompat()
        return try {
            nextRecorder.startRecording()
            recorder = nextRecorder
            recording = true; paused = false; startedAt = System.currentTimeMillis()
            recordingThread = Thread {
                val buf = ByteArray(min.coerceAtLeast(2048))
                while (recording) {
                    if (paused) { try { Thread.sleep(20) } catch (_: InterruptedException) { break }; continue }
                    val n = try { recorder?.read(buf, 0, buf.size) ?: AudioRecord.ERROR_INVALID_OPERATION } catch (_: RuntimeException) { break }
                    if (n > 0) pcm.write(buf, 0, n) else if (n < 0) break
                }
            }.also { it.name = "kv30-audio-capture"; it.start() }
            true
        } catch (_: RuntimeException) {
            recording = false
            try { nextRecorder.release() } catch (_: RuntimeException) {}
            recorder = null; recordingThread = null
            false
        }
    }

    private fun stopRecording(): Map<String, Any>? {
        val activeRecorder = recorder ?: return null
        if (!recording && pcm.size() == 0) return null
        recording = false
        try { activeRecorder.stop() } catch (_: RuntimeException) {}
        try { recordingThread?.join(2000) } catch (_: InterruptedException) { Thread.currentThread().interrupt() }
        val worker = recordingThread
        activeRecorder.release(); recorder = null; recordingThread = null; paused = false
        if (worker?.isAlive == true) { worker.interrupt(); return null }
        if (pcm.size() == 0) return null
        val out = File(filesDir, "kv30-fm-${System.currentTimeMillis()}.wav")
        writeWav(out, pcm.toByteArray(), sampleRate, channels)
        lastFile = out
        return mapOf("durationMs" to (System.currentTimeMillis() - startedAt).coerceAtLeast(0), "sampleRate" to sampleRate, "channels" to channels, "localPath" to out.absolutePath, "mimeType" to "audio/wav")
    }

    private fun writeWav(file: File, data: ByteArray, rate: Int, ch: Int) {
        val byteRate = rate * ch * 2
        val block = ch * 2
        FileOutputStream(file).use { out ->
            out.write("RIFF".toByteArray()); out.write(intLE(36 + data.size)); out.write("WAVEfmt ".toByteArray()); out.write(intLE(16)); out.write(shortLE(1)); out.write(shortLE(ch)); out.write(intLE(rate)); out.write(intLE(byteRate)); out.write(shortLE(block)); out.write(shortLE(16)); out.write("data".toByteArray()); out.write(intLE(data.size)); out.write(data)
        }
    }
    private fun intLE(v: Int) = ByteBuffer.allocate(4).order(ByteOrder.LITTLE_ENDIAN).putInt(v).array()
    private fun shortLE(v: Int) = ByteBuffer.allocate(2).order(ByteOrder.LITTLE_ENDIAN).putShort(v.toShort()).array()
    override fun onDestroy() {
        recording = false
        try { recorder?.stop() } catch (_: RuntimeException) {}
        try { recordingThread?.join(1000) } catch (_: InterruptedException) { Thread.currentThread().interrupt() }
        recorder?.release(); recorder = null; recordingThread?.interrupt(); recordingThread = null
        super.onDestroy()
    }
}

private class ByteArrayOutputStreamCompat {
    private val out = java.io.ByteArrayOutputStream()
    fun write(b: ByteArray, off: Int, len: Int) = out.write(b, off, len)
    fun toByteArray(): ByteArray = out.toByteArray()
    fun size(): Int = out.size()
}
