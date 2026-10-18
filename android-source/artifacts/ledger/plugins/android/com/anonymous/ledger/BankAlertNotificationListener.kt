package com.anonymous.ledger

import android.app.Notification
import android.content.Context
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant

internal data class QueuedBankAlert(
  val id: String,
  val title: String,
  val text: String,
  val packageName: String,
  val receivedAt: String,
)

internal object LedgerNotificationStore {
  private const val PREFS_NAME = "ledger.android.notification.import"
  private const val ENABLED_KEY = "enabled"
  private const val PENDING_KEY = "pending_alerts"
  private const val MAX_PENDING = 200
  private val lock = Any()

  fun isEnabled(context: Context): Boolean =
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .getBoolean(ENABLED_KEY, false)

  fun setEnabled(context: Context, enabled: Boolean) {
    synchronized(lock) {
      val editor = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        .edit()
        .putBoolean(ENABLED_KEY, enabled)
      if (!enabled) editor.remove(PENDING_KEY)
      editor.apply()
    }
  }

  fun getPending(context: Context): List<QueuedBankAlert> = synchronized(lock) {
    val raw = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      .getString(PENDING_KEY, null) ?: return@synchronized emptyList()
    try {
      val array = JSONArray(raw)
      (0 until array.length()).mapNotNull { index ->
        val item = array.optJSONObject(index) ?: return@mapNotNull null
        val id = item.optString("id")
        if (id.isBlank()) return@mapNotNull null
        QueuedBankAlert(
          id = id,
          title = item.optString("title"),
          text = item.optString("text"),
          packageName = item.optString("packageName"),
          receivedAt = item.optString("receivedAt"),
        )
      }
    } catch (_: Exception) {
      emptyList()
    }
  }

  fun enqueue(context: Context, alert: QueuedBankAlert) {
    synchronized(lock) {
      if (!isEnabled(context)) return
      val current = getPending(context)
      if (current.any { it.id == alert.id }) return
      val next = (current + alert).takeLast(MAX_PENDING)
      val array = JSONArray()
      next.forEach { item ->
        array.put(
          JSONObject()
            .put("id", item.id)
            .put("title", item.title)
            .put("text", item.text)
            .put("packageName", item.packageName)
            .put("receivedAt", item.receivedAt),
        )
      }
      context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        .edit()
        .putString(PENDING_KEY, array.toString())
        .apply()
    }
  }

  fun removePending(context: Context, ids: Set<String>) {
    if (ids.isEmpty()) return
    synchronized(lock) {
      val remaining = getPending(context).filterNot { it.id in ids }
      val array = JSONArray()
      remaining.forEach { item ->
        array.put(
          JSONObject()
            .put("id", item.id)
            .put("title", item.title)
            .put("text", item.text)
            .put("packageName", item.packageName)
            .put("receivedAt", item.receivedAt),
        )
      }
      context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        .edit()
        .putString(PENDING_KEY, array.toString())
        .apply()
    }
  }
}

class BankAlertNotificationListener : NotificationListenerService() {
  override fun onNotificationPosted(statusBarNotification: StatusBarNotification) {
    if (!LedgerNotificationStore.isEnabled(this)) return
    if (statusBarNotification.packageName == packageName) return

    val extras = statusBarNotification.notification.extras ?: return
    val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim().orEmpty()
    val textParts = mutableListOf<String>()
    listOf(
      Notification.EXTRA_BIG_TEXT,
      Notification.EXTRA_TEXT,
      Notification.EXTRA_SUB_TEXT,
    ).forEach { key ->
      extras.getCharSequence(key)?.toString()?.trim()?.takeIf(String::isNotBlank)?.let(textParts::add)
    }
    extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)?.forEach { line ->
      line?.toString()?.trim()?.takeIf(String::isNotBlank)?.let(textParts::add)
    }
    val text = textParts.distinct().joinToString("\n").take(4000)
    if (!looksLikeBankAlert(title, text, statusBarNotification.packageName)) return

    LedgerNotificationStore.enqueue(
      this,
      QueuedBankAlert(
        id = "${statusBarNotification.packageName}:${statusBarNotification.key}:${statusBarNotification.postTime}",
        title = title.take(300),
        text = text,
        packageName = statusBarNotification.packageName,
        receivedAt = Instant.ofEpochMilli(statusBarNotification.postTime).toString(),
      ),
    )
  }

  private fun looksLikeBankAlert(title: String, text: String, packageName: String): Boolean {
    val content = "$title\n$text"
    val source = "$title $packageName"
    if (nonTransactionNotice.containsMatchIn(content)) return false

    val hasTransactionSignal = transactionSignal.containsMatchIn(content)
    val hasBankEvidence = bankEvidence.containsMatchIn(content)
    val hasMoney = amountSignal.containsMatchIn(content)
    val recognizableSource = recognizableBankSource.containsMatchIn(source)
    val cardUpdate = cardUpdateSignal.containsMatchIn(content)

    return (hasTransactionSignal && hasBankEvidence && hasMoney) ||
      (hasTransactionSignal && recognizableSource && hasMoney) ||
      (cardUpdate && recognizableSource)
  }

  companion object {
    private val transactionSignal = Regex(
      """\b(debit(?:ed)?|credit(?:ed)?|spent|paid|purchase(?:d)?|withdrawn|charged|received|refund(?:ed)?|reversal|transaction|txn)\b""",
      RegexOption.IGNORE_CASE,
    )
    private val bankEvidence = Regex(
      """\b(bank|a/c|account|card|upi|neft|imps|rtgs|nfs|atm|pos|nach|ecs|ach|rrn|reference)\b""",
      RegexOption.IGNORE_CASE,
    )
    private val amountSignal = Regex(
      """(?:₹|INR|Rs\.?)\s*[\d,]+(?:\.\d{1,2})?""",
      RegexOption.IGNORE_CASE,
    )
    private val cardUpdateSignal = Regex(
      """\b(amount\s+due|available\s+limit)\b""",
      RegexOption.IGNORE_CASE,
    )
    private val recognizableBankSource = Regex(
      """\b(bank|sbi|state\s+bank|hdfc|icici|axis|kotak|canara|bob|pnb|yes\s+bank|indusind|idfc|federal|paytm|phonepe|google\s*pay|gpay|bhim|cred|mobikwik|amazon\s*pay|slice|jupiter)\b""",
      RegexOption.IGNORE_CASE,
    )
    private val nonTransactionNotice = Regex(
      """\b(otp|one[- ]time password|kyc|pre[- ]approved|eligible for|festive season|reward points|statement generated|offer|cashback request.*(processing|processed)|will be debited|will be deducted|to be debited|transaction declined|txn declined|failed transaction|refund initiated|mandate\s+(created|registered|setup))\b""",
      RegexOption.IGNORE_CASE,
    )
  }
}
