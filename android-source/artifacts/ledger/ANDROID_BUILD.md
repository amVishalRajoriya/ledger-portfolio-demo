# Ledger Android test build

The public portfolio repository contains this app source under `android-source/` and a GitHub Actions workflow named **Build Ledger Android APK**.

To download a test APK:

1. Open the public repository's **Actions** tab.
2. Select **Build Ledger Android APK**, then choose **Run workflow**.
3. When the run completes, download the `ledger-android-debug` artifact and extract `app-debug.apk`.
4. Open the APK on an Android device. Android may ask you to allow installs from the browser or file manager.

The APK is debug-signed for sideloaded testing and is not a Play Store release. It is built for `arm64-v8a` physical Android phones; it will not run on 32-bit ARM phones or x86 emulators.

The Android app can optionally import new bank notifications and, after a separate Android `READ_SMS` permission prompt, scan received SMS from the last 90 days. Historical matches are sent to Review and must be confirmed before they affect transaction totals. Message processing stays on-device; no transaction data is sent to Gemini or a server.

Settings also lets the user save a Ledger JSON backup to a folder they choose and restore it after reinstalling. Backup files are not encrypted and should be kept private.
