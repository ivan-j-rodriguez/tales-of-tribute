// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "TributeCore",
    platforms: [
        .iOS(.v17),
        .macOS(.v13),
    ],
    products: [
        .library(name: "TributeCore", targets: ["TributeCore"]),
    ],
    targets: [
        .target(
            name: "TributeCore",
            resources: [
                .copy("Fixtures"),
            ]
        ),
        .testTarget(
            name: "TributeCoreTests",
            dependencies: ["TributeCore"]
        ),
    ]
)
