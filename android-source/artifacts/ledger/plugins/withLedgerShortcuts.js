const fs = require('fs');
const path = require('path');
const {
  withAndroidManifest,
  withAppDelegate,
  withDangerousMod,
  withMainApplication,
  withXcodeProject,
} = require('expo/config-plugins');

const SWIFT_SOURCE = 'LedgerShortcutsIntent.swift';

module.exports = function withLedgerShortcuts(config) {
  config = withAppDelegate(config, (modConfig) => {
    if (modConfig.modResults.language !== 'swift') {
      throw new Error('The Ledger native Shortcut and file-protection plugin requires a Swift iOS AppDelegate.');
    }

    const marker = 'LedgerLocalFileProtection.apply()';
    let contents = modConfig.modResults.contents;
    if (!contents.includes(marker)) {
      const launchAnchor = '    let delegate = ReactNativeDelegate()';
      if (!contents.includes(launchAnchor)) {
        throw new Error('Could not find the Ledger AppDelegate launch point for iOS file protection.');
      }
      contents = contents.replace(
        launchAnchor,
        `    ${marker}\n    NotificationCenter.default.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) { _ in\n      ${marker}\n    }\n${launchAnchor}`,
      );
      modConfig.modResults.contents = contents;
    }
    return modConfig;
  });

  config = withXcodeProject(config, (modConfig) => {
    const project = modConfig.modResults;
    const projectName = modConfig.modRequest.projectName;
    const appDirectory = path.join(modConfig.modRequest.platformProjectRoot, projectName);
    const destination = path.join(appDirectory, SWIFT_SOURCE);
    fs.mkdirSync(appDirectory, { recursive: true });
    fs.copyFileSync(path.join(__dirname, SWIFT_SOURCE), destination);

    const references = project.pbxFileReferenceSection();
    const alreadyAdded = Object.entries(references).some(([key, value]) =>
      !key.endsWith('_comment') &&
      typeof value === 'object' &&
      String(value.path ?? '').replaceAll('"', '') === SWIFT_SOURCE,
    );

    if (!alreadyAdded) {
      const appGroup = project.findPBXGroupKey({ name: projectName });
      if (!appGroup) {
        throw new Error(`Could not find the ${projectName} Xcode project group for the Ledger Shortcuts intent.`);
      }
      project.addSourceFile(
        `${projectName}/${SWIFT_SOURCE}`,
        { target: project.getFirstTarget().uuid },
        appGroup,
      );
    }

    return modConfig;
  });

  config = withAndroidManifest(config, (modConfig) => {
    const application = modConfig.modResults.manifest.application?.[0];
    if (!application) throw new Error('Could not find the Android application manifest node for Ledger.');
    application.service ??= [];
    const serviceName = '.BankAlertNotificationListener';
    const alreadyAdded = application.service.some(
      (service) => service.$?.['android:name'] === serviceName,
    );
    if (!alreadyAdded) {
      application.service.push({
        $: {
          'android:name': serviceName,
          'android:label': 'Ledger bank alert import',
          'android:permission': 'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.service.notification.NotificationListenerService' } }],
          },
        ],
      });
    }
    return modConfig;
  });

  config = withMainApplication(config, (modConfig) => {
    if (modConfig.modResults.language !== 'kt') {
      throw new Error('Ledger Android notification import requires a Kotlin MainApplication.');
    }
    let contents = modConfig.modResults.contents;
    const packageRegistration = 'add(LedgerNotificationPackage())';
    if (!contents.includes(packageRegistration)) {
      const packageAnchor = '// add(MyReactNativePackage())';
      if (!contents.includes(packageAnchor)) {
        throw new Error('Could not find the React Native package registration point for Ledger notification import.');
      }
      contents = contents.replace(packageAnchor, packageRegistration);
      modConfig.modResults.contents = contents;
    }
    return modConfig;
  });

  config = withDangerousMod(config, ['android', async (modConfig) => {
    const sourceDirectory = path.join(__dirname, 'android', 'com', 'anonymous', 'ledger');
    const targetDirectory = path.join(
      modConfig.modRequest.platformProjectRoot,
      'app',
      'src',
      'main',
      'java',
      'com',
      'anonymous',
      'ledger',
    );
    fs.mkdirSync(targetDirectory, { recursive: true });
    for (const source of [
      'LedgerNotificationPackage.kt',
      'LedgerNotificationModule.kt',
      'BankAlertNotificationListener.kt',
    ]) {
      fs.copyFileSync(path.join(sourceDirectory, source), path.join(targetDirectory, source));
    }
    return modConfig;
  }]);

  return config;
};
