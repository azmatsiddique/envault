# EnvVault for Visual Studio Code

<p align="center">
  <img src="https://raw.githubusercontent.com/azmatsiddique/envault/main/logo.png" width="128" alt="EnvVault Logo">
</p>

**EnvVault** is a VS Code extension that solves one of the most common — and costly — mistakes in data engineering: accidentally running pipelines, queries, or transformation jobs against the wrong environment.

## 🎯 The Core Promise
**Zero accidental prod runs. One click to switch. Always know where you are.**

---

## ✨ Key Features

### 🔒 Encrypted Environment Vault
All your credentials (Snowflake, BigQuery, AWS, etc.) are stored securely using VS Code's `SecretStorage` API, which delegates to your OS keychain (macOS Keychain, Windows Credential Manager, or Linux libsecret). **Secrets are never written to disk in plaintext.**

### ⚡ One-Click Environment Switcher
Switch between `dev`, `staging`, and `production` with a single click. Every switch triggers an automatic update of your configuration files.

### 💉 Auto-Injection Engine
EnvVault identifies and updates your environment-specific values while preserving file formatting and comments. Supported files include:
- **.env**: Key-Value injection.
- **dbt profiles.yml**: YAML path patching.
- **config.yaml / settings.yaml**: Dot-notation key path injection.
- **spark-defaults.conf**: INI-style Spark configuration.

### 🛡️ Production Guard
Switching to a production-tagged environment triggers a mandatory confirmation modal with a **3-second countdown** to prevent accidental mis-clicks.

### 🚨 Visual Safety Indicators
- **Colored Status Bar**: Always-visible pill (Green for dev, Yellow for staging, Red for prod).
- **Icon Decorations**: Warning icons appear in the sidebar when production is active.

---

## 🚀 Quick Start

1. **Open the Sidebar**: Click the EnvVault icon in the Activity Bar.
2. **Add an Environment**: Click the **`+`** icon.
3. **Configure Secrets**: Enter your secrets as a JSON object (e.g., `{"DB_URL": "localhost", "API_KEY": "dev_key"}`).
4. **Define Injection Files**: In VS Code Settings, add your filenames (e.g., `sample.env`, `profiles.yml`) to **EnvVault: Injection Files**.
5. **Switch**: Click the environment name in the sidebar to activate it.

---

## 🛠️ Security First
EnvVault is built with a "Privacy by Design" approach:
- **No plaintext storage**: Secrets live in the system keychain.
- **No telemetry**: Your credentials never leave your machine.
- **No network calls**: Fully offline-first.
- **Automatic Backups**: Creates `.envvault.bak` before any file injection.

---

## 📄 License
MIT License. See [LICENSE](LICENSE) for details.
