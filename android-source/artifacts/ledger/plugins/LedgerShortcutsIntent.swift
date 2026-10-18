import AppIntents
import Foundation

enum LedgerLocalFileProtection {
    private static let protection: FileProtectionType = .completeUntilFirstUserAuthentication
    private static let storageDirectoryName = "RCTAsyncLocalStorage_V1"

    static func apply() {
        guard
            let bundleIdentifier = Bundle.main.bundleIdentifier,
            let applicationSupport = FileManager.default.urls(
                for: .applicationSupportDirectory,
                in: .userDomainMask
            ).first
        else { return }

        let storageDirectory = applicationSupport
            .appendingPathComponent(bundleIdentifier, isDirectory: true)
            .appendingPathComponent(storageDirectoryName, isDirectory: true)

        do {
            try FileManager.default.createDirectory(
                at: storageDirectory,
                withIntermediateDirectories: true,
                attributes: [.protectionKey: protection]
            )
            try FileManager.default.setAttributes(
                [.protectionKey: protection],
                ofItemAtPath: storageDirectory.path
            )

            if let files = FileManager.default.enumerator(
                at: storageDirectory,
                includingPropertiesForKeys: nil
            ) {
                for case let fileURL as URL in files {
                    try FileManager.default.setAttributes(
                        [.protectionKey: protection],
                        ofItemAtPath: fileURL.path
                    )
                }
            }
        } catch {
            NSLog("Ledger could not apply iOS file protection to its local store: %@", error.localizedDescription)
        }
    }
}

private struct LedgerShortcutSpoolItem: Encodable {
    let version = 1
    let messageText: String
    let senderID: String
    let receivedAt: String
}

private enum LedgerShortcutSpool {
    static func write(messageText: String, senderID: String, receivedAt: Date?) throws {
        let message = messageText.trimmingCharacters(in: .whitespacesAndNewlines)
        let sender = senderID.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !message.isEmpty, !sender.isEmpty, message.count <= 12_000, sender.count <= 256 else {
            throw SpoolError.invalidMessage
        }

        let directory = try inboxDirectory()
        let item = LedgerShortcutSpoolItem(
            messageText: message,
            senderID: sender,
            receivedAt: ISO8601DateFormatter().string(from: receivedAt ?? Date())
        )
        let data = try JSONEncoder().encode(item)
        let file = directory.appendingPathComponent("\(UUID().uuidString.lowercased()).json")

        try data.write(to: file, options: .atomic)
        try FileManager.default.setAttributes(
            [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication],
            ofItemAtPath: file.path
        )
    }

    private static func inboxDirectory() throws -> URL {
        let documents = try FileManager.default.url(
            for: .documentDirectory,
            in: .userDomainMask,
            appropriateFor: nil,
            create: true
        )
        let directory = documents.appendingPathComponent("ledger-shortcut-inbox", isDirectory: true)
        try FileManager.default.createDirectory(
            at: directory,
            withIntermediateDirectories: true,
            attributes: [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication]
        )
        return directory
    }

    private enum SpoolError: LocalizedError {
        case invalidMessage

        var errorDescription: String? {
            "The message or sender is empty or too long to save."
        }
    }
}

struct LogBankMessageIntent: AppIntent {
    static var title: LocalizedStringResource = "Log Bank Message"
    static var description = IntentDescription("Save an incoming bank SMS on this iPhone for Ledger to import.")
    static var openAppWhenRun = false

    @Parameter(title: "Message text")
    var messageText: String

    @Parameter(title: "Sender ID")
    var senderID: String

    @Parameter(title: "Received at", description: "Optional. Leave blank to use the automation time.")
    var receivedAt: Date?

    static var parameterSummary: some ParameterSummary {
        Summary("Save a bank message from \(\.$senderID)")
    }

    func perform() async throws -> some IntentResult {
        try LedgerShortcutSpool.write(
            messageText: messageText,
            senderID: senderID,
            receivedAt: receivedAt
        )
        return .result()
    }
}

struct LedgerAppShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: LogBankMessageIntent(),
            phrases: ["Log a bank message with \(.applicationName)"],
            shortTitle: "Log Bank Message",
            systemImageName: "tray.and.arrow.down"
        )
    }
}
