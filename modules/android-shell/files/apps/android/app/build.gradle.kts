plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// CI passes the release's version (-PappVersion=0.2.0); versionCode grows with it, which Android needs to accept an update
val appVersion = (findProperty("appVersion") as String?) ?: "0.1.0"
val parts = appVersion.split(".").map { it.toIntOrNull() ?: 0 }
val code = parts.getOrElse(0) { 0 } * 10000 + parts.getOrElse(1) { 0 } * 100 + parts.getOrElse(2) { 0 }

android {
    namespace = "app.musiccurator.android"
    compileSdk = 35

    defaultConfig {
        applicationId = "app.musiccurator.android"
        minSdk = 26
        targetSdk = 35
        versionCode = code
        versionName = appVersion
        buildConfigField("String", "REPO_OWNER", "\"TurboNZL\"")
        buildConfigField("String", "REPO_NAME", "\"Curator\"")
    }
    buildFeatures { buildConfig = true }

    // One fixed key for every build: Android only installs an update over an app signed with the same key.
    // The repository is private and the app is for personal use, so the key lives in the repository.
    signingConfigs {
        create("curator") {
            storeFile = file("../curator.keystore")
            storePassword = "curator-personal"
            keyAlias = "curator"
            keyPassword = "curator-personal"
        }
    }
    buildTypes {
        release { signingConfig = signingConfigs.getByName("curator"); isMinifyEnabled = false }
        debug { signingConfig = signingConfigs.getByName("curator"); applicationIdSuffix = ".debug"; versionNameSuffix = "-debug" }
    }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    kotlinOptions { jvmTarget = "17" }
    sourceSets["main"].assets.srcDir(layout.buildDirectory.dir("generated/web"))
}

// The web client (apps/web) is bundled into the app and shown in a WebView: build it first with `pnpm --filter @curator/web build`.
val copyWeb by tasks.registering(Copy::class) {
    val dist = file("../../web/dist")
    from(dist)
    into(layout.buildDirectory.dir("generated/web"))
    doFirst { check(dist.resolve("index.html").exists()) { "Build the web client first: pnpm --filter @curator/web build" } }
}
tasks.matching { it.name == "preBuild" }.configureEach { dependsOn(copyWeb) }

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("androidx.media3:media3-exoplayer:1.5.1")
    implementation("androidx.media3:media3-session:1.5.1")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20240303")
}
