const fs = require('fs');
const path = require('path');
const { withAppDelegate, withXcodeProject } = require('expo/config-plugins');

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

  return withXcodeProject(config, (modConfig) => {
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
};
