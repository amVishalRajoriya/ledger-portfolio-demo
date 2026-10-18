package com.anonymous.ledger

import android.content.ComponentName
import android.content.Intent
import android.provider.Settings
import android.provider.Telephony
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray

class LedgerNotificationModule(
  private val appContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(appContext) {
  override fun getName(): String = "LedgerNotificationAccess"

  @ReactMethod
  fun getStatus(promise: Promise) {
    try {
      val result = Arguments.createMap()
      result.putBoolean("accessGranted", hasNotificationAccess())
      result.putBoolean("enabled", LedgerNotificationStore.isEnabled(appContext))
      result.putInt("pendingCount", LedgerNotificationStore.getPending(appContext).size)
      promise.resolve(result)
    } catch (error: Exception) {
      promise.reject("LEDGER_NOTIFICATION_STATUS", "Could not read notification import status.", error)
    }
  }

  @ReactMethod
  fun setEnabled(enabled: Boolean, promise: Promise) {
    try {
      LedgerNotificationStore.setEnabled(appContext, enabled)
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("LEDGER_NOTIFICATION_TOGGLE", "Could not update automatic import.", error)
    }
  }

  @ReactMethod
  fun openSettings(promise: Promise) {
    try {
      val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      appContext.startActivity(intent)
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("LEDGER_NOTIFICATION_SETTINGS", "Could not open Android notification access settings.", error)
    }
  }

  @ReactMethod
  fun getPendingAlerts(promise: Promise) {
    try {
      val alerts = Arguments.createArray()
      LedgerNotificationStore.getPending(appContext).forEach { alert ->
        val item = Arguments.createMap()
        item.putString("id", alert.id)
        item.putString("title", alert.title)
        item.putString("text", alert.text)
        item.putString("packageName", alert.packageName)
        item.putString("receivedAt", alert.receivedAt)
        alerts.pushMap(item)
      }
      promise.resolve(alerts)
    } catch (error: Exception) {
      promise.reject("LEDGER_NOTIFICATION_QUEUE", "Could not read queued bank alerts.", error)
    }
  }

  @ReactMethod
  fun acknowledgeAlerts(ids: ReadableArray, promise: Promise) {
    try {
      val acknowledged = (0 until ids.size()).mapNotNull { index ->
        if (ids.isNull(index)) null else ids.getString(index)
      }.toSet()
      LedgerNotificationStore.removePending(appContext, acknowledged)
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("LEDGER_NOTIFICATION_ACK", "Could not clear saved bank alerts from the local queue.", error)
    }
  }

  @ReactMethod
  fun getRecentSms(sinceMillis: Double, promise: Promise) {
    try {
      val rows = Arguments.createArray()
      val projection = arrayOf(Telephony.Sms._ID, Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE)
      appContext.contentResolver.query(
        Telephony.Sms.CONTENT_URI,
        projection,
        "${Telephony.Sms.DATE} >= ? AND ${Telephony.Sms.DATE} <= ? AND ${Telephony.Sms.TYPE} = ?",
        arrayOf(
          sinceMillis.toLong().toString(),
          System.currentTimeMillis().toString(),
          Telephony.Sms.MESSAGE_TYPE_INBOX.toString(),
        ),
        "${Telephony.Sms.DATE} DESC",
      )?.use { cursor ->
        val idIndex = cursor.getColumnIndexOrThrow(Telephony.Sms._ID)
        val addressIndex = cursor.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)
        val bodyIndex = cursor.getColumnIndexOrThrow(Telephony.Sms.BODY)
        val dateIndex = cursor.getColumnIndexOrThrow(Telephony.Sms.DATE)
        var count = 0
        while (cursor.moveToNext() && count < 5000) {
          val item = Arguments.createMap()
          item.putString("id", cursor.getString(idIndex))
          item.putString("sender", cursor.getString(addressIndex) ?: "")
          item.putString("body", cursor.getString(bodyIndex) ?: "")
          item.putString("receivedAt", java.time.Instant.ofEpochMilli(cursor.getLong(dateIndex)).toString())
          rows.pushMap(item)
          count += 1
        }
      }
      promise.resolve(rows)
    } catch (error: Exception) {
      promise.reject("LEDGER_SMS_HISTORY", "Could not read recent SMS history.", error)
    }
  }

  private fun hasNotificationAccess(): Boolean {
    val enabledListeners = Settings.Secure.getString(
      appContext.contentResolver,
      ENABLED_NOTIFICATION_LISTENERS_KEY,
    ).orEmpty()
    val ownComponent = ComponentName(appContext, BankAlertNotificationListener::class.java)
      .flattenToString()
    return enabledListeners.split(':').any { it.equals(ownComponent, ignoreCase = true) }
  }

  companion object {
    private const val ENABLED_NOTIFICATION_LISTENERS_KEY = "enabled_notification_listeners"
  }
}
