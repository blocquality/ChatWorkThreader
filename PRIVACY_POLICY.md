# Privacy Policy (ChatWork Threader)

Last Updated: January 17, 2026

## 1. Information We Collect

This extension may handle the following information:

### 1.1 Information from ChatWork Pages
- Message content, sender names, and timestamps
- Message IDs and Room IDs
- Reply relationships (quote information)
- Avatar image URLs
- To/Mention information

This information is **read from the page** to build and display the thread tree.

### 1.2 Locally Stored Settings
- Panel open/close state (per room)
- Speaker filter selection (per room)
- "My Participation Only" toggle state (per room)
- "Flat" display mode state (per room)
- Thread collapse/expand state (per room)

These settings are stored in the browser's local storage (`chrome.storage.local`).

## 2. How We Use Information

The collected information is used solely for the following purposes:

- Visualizing ChatWork message reply relationships in a tree structure
- Filtering to display specific threads
- Saving and restoring user settings (for convenience on subsequent visits)
- Highlighting messages addressed to you (mentions)

## 3. Third-Party Sharing and External Transmission

- This extension **does NOT send any collected information to the developer's servers**.
- This extension **does NOT sell or share any collected information with third parties**.
- This extension **does NOT communicate with any external APIs**.
- All processing is completed locally within the user's browser.

## 4. Data Retention and Deletion

### Retention Period
Settings are stored in the browser's local storage until the user deletes them.

### How to Delete
To delete stored settings, use one of the following methods:

1. **Remove the Extension**
   - Removing this extension from Chrome's "Manage Extensions" will delete all stored data.

2. **Clear Browser Site Data**
   - Go to Chrome Settings > Privacy and Security > Clear browsing data, and delete "Cookies and other site data."

## 5. Security

This extension is committed to protecting user data:

- **No External Communication**: Since no collected information is sent externally, there is no risk of interception.
- **Local Processing**: All data processing occurs within the browser.
- **Minimal Permissions**: Only the minimum required browser permissions are used (`activeTab`, `scripting`, `storage`).
- **Limited Host Permissions**: The extension only operates on the `chatwork.com` domain.

## 6. Contact Us

For questions about this Privacy Policy, please contact us through:

- **GitHub Issues**: [https://github.com/blocquality/ChatWorkThreader/issues](https://github.com/blocquality/ChatWorkThreader/issues)

## 7. Changes to This Policy

If we make changes to this Privacy Policy, we will update this page. For significant changes, we may notify users when updating the extension.
