package io.github.twomars4096.sticky_todo

import android.app.Activity
import android.content.Intent
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.ByteArrayOutputStream
import java.util.concurrent.Executors

class MainActivity : FlutterActivity() {
    private var pending: MethodChannel.Result? = null
    private var pendingContent: String? = null
    private val fileWorker = Executors.newSingleThreadExecutor()

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "sticky_todo/files")
            .setMethodCallHandler { call, result ->
                if (pending != null) {
                    result.error("busy", "A file picker is already open.", null)
                } else when (call.method) {
                    "read" -> {
                        pending = result
                        try {
                            startActivityForResult(Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                                addCategory(Intent.CATEGORY_OPENABLE)
                                type = "*/*"
                                putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("application/json", "text/plain"))
                            }, 41)
                        } catch (_: Exception) {
                            pending = null
                            result.error("picker", "No file picker is available.", null)
                        }
                    }
                    "write" -> {
                        val content = call.argument<String>("content")
                        if (content == null || content.length > 20 * 1024 * 1024) {
                            result.error("size", "The export exceeds 20 MB.", null)
                        } else {
                            pending = result
                            pendingContent = content
                            try {
                                startActivityForResult(Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                                    addCategory(Intent.CATEGORY_OPENABLE)
                                    type = call.argument<String>("mime") ?: "application/json"
                                    putExtra(Intent.EXTRA_TITLE, call.argument<String>("filename") ?: "sticky-todo.json")
                                }, 42)
                            } catch (_: Exception) {
                                pending = null
                                pendingContent = null
                                result.error("picker", "No file picker is available.", null)
                            }
                        }
                    }
                    else -> result.notImplemented()
                }
            }
    }

    @Deprecated("Used for Storage Access Framework compatibility")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != 41 && requestCode != 42) return
        val callback = pending ?: return
        val content = pendingContent
        pending = null
        pendingContent = null
        val uri = data?.data
        if (resultCode != Activity.RESULT_OK || uri == null) {
            callback.success(null)
            return
        }
        fileWorker.execute {
            try {
                if (requestCode == 41) {
                    val bytes = contentResolver.openInputStream(uri)?.use { stream ->
                        val out = ByteArrayOutputStream()
                        val buffer = ByteArray(8192)
                        while (true) {
                            val count = stream.read(buffer)
                            if (count < 0) break
                            if (out.size() + count > 20 * 1024 * 1024) throw IllegalArgumentException("size")
                            out.write(buffer, 0, count)
                        }
                        out.toByteArray()
                    } ?: throw IllegalStateException("read")
                    val text = String(bytes, Charsets.UTF_8)
                    runOnUiThread { callback.success(text) }
                } else {
                    contentResolver.openOutputStream(uri, "wt")?.use { stream ->
                        stream.write((content ?: throw IllegalStateException("content")).toByteArray(Charsets.UTF_8))
                        stream.flush()
                    } ?: throw IllegalStateException("write")
                    runOnUiThread { callback.success(null) }
                }
            } catch (_: Exception) {
                runOnUiThread { callback.error("file", "The file could not be read or saved. Check its size, location and available storage.", null) }
            }
        }
    }
}
