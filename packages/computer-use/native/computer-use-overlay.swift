import AppKit
import Foundation
import QuartzCore

private struct Frame: Decodable {
    let x: Double
    let y: Double
    let width: Double
    let height: Double
}

private struct Point: Decodable {
    let x: Double
    let y: Double
}

private struct Update: Decodable {
    let frame: Frame
    let point: Point?
}

private final class ComputerUseOverlay {
    private let cursor = ComputerUseOverlay.makePanel()
    // HeroUI 默认主题的 --accent: oklch(0.6204 0.195 253.83)。
    private let primary = NSColor(srgbRed: 4.0 / 255.0, green: 133.0 / 255.0, blue: 247.0 / 255.0, alpha: 1)
    private let glow = CAGradientLayer()
    private let pointer = NSImageView(frame: CGRect(x: 6, y: 6, width: 16, height: 16))
    private var hideTimer: Timer?
    private var idleTimer: Timer?
    private var lastPoint: Point?

    init() {
        guard let content = cursor.contentView else { return }
        content.wantsLayer = true

        glow.frame = CGRect(x: 0, y: 0, width: 28, height: 28)
        glow.type = .radial
        glow.startPoint = CGPoint(x: 0.5, y: 0.5)
        glow.endPoint = CGPoint(x: 0.86, y: 0.86)
        glow.colors = [primary.withAlphaComponent(0.5).cgColor,
                       primary.withAlphaComponent(0.18).cgColor,
                       primary.withAlphaComponent(0).cgColor]
        glow.locations = [0, 0.48, 1]
        content.layer?.addSublayer(glow)

        let imagePath = URL(fileURLWithPath: CommandLine.arguments[0])
            .deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("Resources/cursor.svg").path
        guard let image = NSImage(contentsOfFile: imagePath) else {
            fatalError("Computer Use cursor SVG is missing")
        }
        image.isTemplate = true
        pointer.image = image
        pointer.contentTintColor = primary
        pointer.imageScaling = .scaleProportionallyUpOrDown
        pointer.wantsLayer = true
        content.addSubview(pointer)
    }

    func show(_ update: Update) {
        let frame = update.frame
        guard [frame.x, frame.y, frame.width, frame.height].allSatisfy(\.isFinite),
              frame.width > 0, frame.height > 0 else { return }
        guard let point = update.point,
              point.x.isFinite, point.y.isFinite,
              (frame.x...frame.x + frame.width).contains(point.x),
              (frame.y...frame.y + frame.height).contains(point.y) else {
            cursor.orderOut(nil)
            glow.removeAnimation(forKey: "breath")
            pointer.layer?.removeAnimation(forKey: "idleSway")
            idleTimer?.invalidate()
            lastPoint = nil
            return
        }

        let top = NSScreen.screens.first?.frame.maxY ?? 0
        cursor.setFrameOrigin(NSPoint(x: point.x - 6, y: top - point.y - 22))
        cursor.orderFrontRegardless()
        updateMotion()

        if lastPoint.map({ abs($0.x - point.x) > 1 || abs($0.y - point.y) > 1 }) ?? true {
            pointer.layer?.removeAnimation(forKey: "idleSway")
            idleTimer?.invalidate()
            if !NSWorkspace.shared.accessibilityDisplayShouldReduceMotion {
                idleTimer = Timer.scheduledTimer(withTimeInterval: 0.7, repeats: false) { [weak self] _ in
                    self?.startSway()
                }
            }
        }
        lastPoint = point

        hideTimer?.invalidate()
        hideTimer = Timer.scheduledTimer(withTimeInterval: 12, repeats: false) { [weak self] _ in
            self?.cursor.orderOut(nil)
            self?.glow.removeAnimation(forKey: "breath")
            self?.pointer.layer?.removeAnimation(forKey: "idleSway")
            self?.idleTimer?.invalidate()
            self?.lastPoint = nil
        }
    }

    private func updateMotion() {
        if NSWorkspace.shared.accessibilityDisplayShouldReduceMotion {
            glow.removeAnimation(forKey: "breath")
            pointer.layer?.removeAnimation(forKey: "idleSway")
            idleTimer?.invalidate()
        } else if glow.animation(forKey: "breath") == nil {
            let scale = CABasicAnimation(keyPath: "transform.scale")
            scale.fromValue = 0.88
            scale.toValue = 1.12
            let opacity = CABasicAnimation(keyPath: "opacity")
            opacity.fromValue = 0.55
            opacity.toValue = 0.95
            let breath = CAAnimationGroup()
            breath.animations = [scale, opacity]
            breath.duration = 2.2
            breath.autoreverses = true
            breath.repeatCount = .infinity
            breath.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
            glow.add(breath, forKey: "breath")
        }
    }

    private func startSway() {
        guard cursor.isVisible, !NSWorkspace.shared.accessibilityDisplayShouldReduceMotion else { return }
        let sway = CAKeyframeAnimation(keyPath: "transform.rotation.z")
        sway.values = [0, -0.055, 0, 0.055, 0]
        sway.keyTimes = [0, 0.25, 0.5, 0.75, 1]
        sway.duration = 2.8
        sway.repeatCount = .infinity
        sway.timingFunctions = Array(repeating: CAMediaTimingFunction(name: .easeInEaseOut), count: 4)
        pointer.layer?.add(sway, forKey: "idleSway")
    }

    private static func makePanel() -> NSPanel {
        let panel = NSPanel(
            contentRect: NSRect(x: 0, y: 0, width: 28, height: 28),
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.level = .statusBar
        panel.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary, .ignoresCycle]
        panel.ignoresMouseEvents = true
        panel.hidesOnDeactivate = false
        panel.hasShadow = false
        return panel
    }
}

let application = NSApplication.shared
application.setActivationPolicy(.accessory)
private let overlay = ComputerUseOverlay()
DispatchQueue.global(qos: .userInitiated).async {
    while let line = readLine(), !line.isEmpty {
        guard let data = line.data(using: .utf8),
              let update = try? JSONDecoder().decode(Update.self, from: data) else { continue }
        DispatchQueue.main.async { overlay.show(update) }
    }
    DispatchQueue.main.async { application.terminate(nil) }
}
application.run()
