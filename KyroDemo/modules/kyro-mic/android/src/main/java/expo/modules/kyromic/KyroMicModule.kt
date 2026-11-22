package expo.modules.kyromic

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlin.math.sqrt

/**
 * Minimal microphone stream: 16-bit mono PCM in ~100 ms chunks, sent to JS as base64 together with
 * the chunk's RMS level (0..1). Nothing is written to disk and nothing leaves the device.
 */
class KyroMicModule : Module() {
  @Volatile private var recording = false
  private var worker: Thread? = null

  override fun definition() = ModuleDefinition {
    Name("KyroMic")

    Events("onAudio", "onMicError")

    AsyncFunction("start") { sampleRate: Int ->
      startRecording(sampleRate)
    }

    AsyncFunction("stop") {
      stopRecording()
    }

    OnDestroy {
      recording = false
    }
  }

  private fun startRecording(sampleRate: Int): Boolean {
    if (recording) return true
    worker?.join(600)

    val channel = AudioFormat.CHANNEL_IN_MONO
    val encoding = AudioFormat.ENCODING_PCM_16BIT
    val minBuf = AudioRecord.getMinBufferSize(sampleRate, channel, encoding)
    if (minBuf <= 0) throw IllegalStateException("This device does not support $sampleRate Hz mono recording")
    val chunkBytes = (sampleRate / 10) * 2 // 100 ms of 16-bit samples

    val recorder = try {
      AudioRecord(MediaRecorder.AudioSource.VOICE_RECOGNITION, sampleRate, channel, encoding, maxOf(minBuf, chunkBytes) * 4)
    } catch (e: SecurityException) {
      throw IllegalStateException("Microphone permission has not been granted")
    }
    if (recorder.state != AudioRecord.STATE_INITIALIZED) {
      recorder.release()
      throw IllegalStateException("Could not open the microphone")
    }

    recorder.startRecording()
    recording = true
    val t = Thread {
      val buf = ByteArray(chunkBytes)
      try {
        while (recording) {
          val n = recorder.read(buf, 0, buf.size)
          if (n > 0) {
            var sum = 0.0
            var i = 0
            while (i + 1 < n) {
              val sample = ((buf[i + 1].toInt() shl 8) or (buf[i].toInt() and 0xff)).toShort().toDouble()
              sum += sample * sample
              i += 2
            }
            val samples = maxOf(1, n / 2)
            val level = sqrt(sum / samples) / 32768.0
            sendEvent("onAudio", mapOf(
              "data" to Base64.encodeToString(buf, 0, n, Base64.NO_WRAP),
              "level" to level
            ))
          } else if (n < 0) {
            sendEvent("onMicError", mapOf("message" to "Microphone read failed ($n)"))
            break
          }
        }
      } catch (e: Exception) {
        sendEvent("onMicError", mapOf("message" to (e.message ?: "Microphone error")))
      } finally {
        recording = false
        try { recorder.stop() } catch (_: Exception) {}
        recorder.release()
      }
    }
    t.name = "KyroMic"
    worker = t
    t.start()
    return true
  }

  private fun stopRecording(): Boolean {
    recording = false
    worker?.join(600)
    worker = null
    return true
  }
}
