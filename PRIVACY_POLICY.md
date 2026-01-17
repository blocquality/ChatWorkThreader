# Privacy Policy - ChatWork Threader

**Last Updated: January 17, 2026**

## Overview

ChatWork Threader ("the Extension") is a Chrome browser extension that visualizes ChatWork reply threads as a tree structure for better conversation tracking. This Privacy Policy describes how we handle user data.

---

## 1. Information We Collect

The Extension may process the following information locally within your browser:

- **ChatWork Message Content**: Message text, sender names, timestamps, reply relationships, and quoted content displayed on ChatWork pages
- **User Settings**: Your preferences such as filter selections, panel width, and thread collapse states stored in Chrome's local storage (`chrome.storage.local`)

---

## 2. How We Use Information

The collected information is used solely for the following purposes:

- **Thread Visualization**: To display ChatWork messages in a hierarchical tree structure showing reply relationships
- **Settings Persistence**: To save and restore your preferences (e.g., selected filters, collapsed threads) across browser sessions on a per-room basis
- **UI Functionality**: To enable features like search, filtering by sender, and "My Participation Only" mode

---

## 3. Data Sharing and Transmission

- **We do NOT transmit any data to external servers**: All data processing occurs entirely within your browser. The Extension does not send any user data to the developer's servers or any third-party services.
- **We do NOT sell or share your data**: Your information is never sold, shared, or transferred to any third parties.
- **No analytics or tracking**: The Extension does not include any analytics, telemetry, or tracking mechanisms.

---

## 4. Data Storage and Retention

- **Local Storage Only**: All settings and preferences are stored locally in your browser using Chrome's `chrome.storage.local` API.
- **Retention Period**: Settings are retained until you manually clear them or uninstall the Extension.
- **How to Delete Your Data**: 
  - Uninstall the Extension from Chrome to remove all stored settings
  - Alternatively, use Chrome's "Clear browsing data" feature to clear extension data

---

## 5. Security

The Extension is designed with security in mind:

- **No External Communication**: The Extension does not make any network requests or send data outside your browser
- **Minimal Permissions**: The Extension only requests permissions necessary for its core functionality:
  - `activeTab`: To interact with the current ChatWork tab
  - `scripting`: To inject the thread visualization UI
  - `storage`: To save your preferences locally
- **Host Permissions**: Limited to `https://*.chatwork.com/*` only

---

## 6. Children's Privacy

The Extension does not knowingly collect any personal information from children under 13 years of age.

---

## 7. Changes to This Privacy Policy

We may update this Privacy Policy from time to time. Any changes will be reflected on this page with an updated "Last Updated" date.

---

## 8. Contact Us

If you have any questions or concerns about this Privacy Policy, please contact us at:

- **GitHub Issues**: [https://github.com/blocquality/ChatWorkThreader/issues](https://github.com/blocquality/ChatWorkThreader/issues)
- **Email**: [blocquality@gmail.com](mailto:blocquality@gmail.com)

---

## 9. Consent

By installing and using ChatWork Threader, you consent to this Privacy Policy.
