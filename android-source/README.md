# Ledger Android test build

The public portfolio repository contains this app source under `android-source/` and a GitHub Actions workflow named **Build Ledger Android APK**.

To download a test APK:

1. Open the public repository's **Actions** tab.
2. Select **Build Ledger Android APK**, then choose **Run workflow**.
3. When the run completes, download the `ledger-android-debug` artifact and extract `app-debug.apk`.
4. Open the APK on an Android device. Android may ask you to allow installs from the browser or file manager.

The APK is debug-signed for sideloaded testing and is not a Play Store release. This MVP imports bank alerts through copy/paste; it does not read SMS automatically or send transaction data to Gemini or a server.
