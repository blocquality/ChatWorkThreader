# ChatWork Threader

A Chrome extension that displays ChatWork messages as threaded trees. It helps you grasp complex conversation flows at a glance and streamlines teamwork.

## 🎯 Overview

ChatWork Threader visualizes reply-related messages in ChatWork as a Reddit/YouTube-comment-style tree structure.

### Core Features

* **Thread Tree View**: Displays reply-related messages in a hierarchical tree
* **Real-time Updates**: Automatically detects message additions/deletions and refreshes the view
* **Cross-session Persistence**: Saves per-room filter settings and collapse/expand states

---

## 🖥️ User Interface

### Thread Panel

A slide-in panel on the right side of the screen, consisting of the following elements:

| Element                   | Description                                                                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Resize Handle**         | A draggable handle (three-line icon) on the left edge of the panel. The panel width can be adjusted from 550px to 90% of the screen width |
| **Tab UI**                | Three tabs: Threads / Settings / Help                                                                                                     |
| **Speaker Filter**        | A dropdown to show threads from a specific speaker only (saved per room)                                                                  |
| **My Participation Only** | A toggle that shows only threads you participate in (as the reply source/target)                                                          |
| **Flat**                  | Toggles flat view mode. When ON, all replies are displayed in a single level (simplifies deep nesting)                                    |
| **Search Bar**            | Real-time search within threads. Searches user names, message text, quotes, and To recipients                                             |
| **Refresh Button**        | Manually re-fetch thread information                                                                                                      |
| **Close Button**          | Closes the panel                                                                                                                          |

### Toggle Button

A floating button always shown at the bottom-right of the screen.

* **Icon**: Extension icon image (icon128.png)
* **Shortcut Display**: Shows the shortcut key “Shift+S”
* **Click**: Toggles the thread panel open/closed
* **On Hover**: Scales up to 1.05×

### Toolbar Popup

A popup shown when you click the extension icon in the Chrome toolbar (popup.html).

* **How-to Guide**: Displays basic usage instructions
* **Badge Legend**: Explains Root / Reply / Root+Reply
* **Version Info**: Displays the current version

### Message Card Buttons

Each message card has the following action buttons:

| Button | Description |
|--------|-------------|
| **Pin** | Pins the thread to the top of the panel. Saved per room |
| **Copy** | Copies the message text to the clipboard. Shows a checkmark on success |
| **Track Origin** | Shown for placeholder messages (reply source not loaded). Clicks trigger high-speed scrolling in ChatWork to find the origin message |

### Settings Tab

The "Settings" tab in the panel allows you to configure global settings:

| Setting | Description |
|---------|-------------|
| **Language** | Switch between Japanese / English |
| **Theme** | Light / Dark / System |
| **Max collapsed lines** | Limits displayed lines when thread heads are collapsed (1–100) |

Settings are auto-saved and synced via `chrome.storage.sync`.

### Help Tab

The "Help" tab in the panel provides:

* Basic usage instructions
* Feature list
* Badge explanations
* Shortcut key reference

### “Show in Thread” Button

An icon button shown at the top-left of messages (in the ChatWork message list) that belong to a thread.

* **Display Condition**: Shown only if the message has a reply relationship (reply source or reply target)
* **On Click**: Opens the thread panel and scrolls to & highlights the corresponding message

---

## 🎨 Display Specifications

### Message Card

Each message displays the following information:

| Item              | Description                                                                    |
| ----------------- | ------------------------------------------------------------------------------ |
| **Avatar**        | User profile image (24x24px, circular)                                         |
| **User Name**     | Display name of the message sender                                             |
| **Timestamp**     | In “yyyy/MM/dd hh:mm” format                                                   |
| **Reply Toggle**  | Shown for root messages only. Displays reply count and toggles expand/collapse |
| **Message Body**  | Body text (URLs are auto-linkified)                                            |
| **Quote Display** | If a quoted message exists, it’s shown with speaker info                       |
| **File Preview**  | Preview button for attached files                                              |
| **External Link** | External URL and a preview button                                              |

### Highlighting Messages Addressed to You

Messages addressed to you (mentions) use a special style:

* **Background Color**: Light green (#E4F6F3)
* **Right Border**: 4px green border (#57CAB3)
* **Detection Logic**: Detects ChatWork’s `mentioned` class

### Tree Connector Lines

Reddit/YouTube-comment-style visual connectors:

* **Vertical Line**: If there are subsequent messages at the same depth, a line extends downward from the avatar center
* **L-shaped Line**: Connects the parent avatar center to the child message’s avatar
* **Color**: Gray (#e0e0e0) normally, darker gray (#909090) on hover

### Automatic Panel Width Calculation

Automatically adjusts panel width based on the maximum nesting depth:

```
Panel width = 380px + (max depth × 44px)
```

* **Minimum Width**: 550px
* **Maximum Width**: 90% of the screen width
* **Flat Mode**: Fixed at 550px
* **Mobile Support**: Full width (100%) when screen width is 500px or less

### Thread Ordering

Threads are sorted in the following priority:

1. **Pinned threads are shown at the top**
2. Compare by the root message timestamp (**newest first**)
3. If no timestamp exists, compare by message ID (mid)

Child messages are sorted **oldest first** (ascending).

### Integration with ChatWork Layout

When the thread panel is shown, the ChatWork layout is adjusted automatically:

* **Message Area**: Adds a right margin to reserve space for the panel
* **Summary Area Integration**: Considers the width of the summary area (`_subContentArea`) and subtracts overlaps from the shift distance
* **Animation**: Smooth movement with 0.25s easing

---

## 🔍 Search Feature

### Search Targets

* Message body text
* User name
* Quoted messages
* To-recipient users

### Search Behavior

| Action           | Behavior                                |
| ---------------- | --------------------------------------- |
| **Typing**       | Real-time search after a 200ms debounce |
| **Enter**        | Executes search immediately             |
| **Escape**       | Clears the search                       |
| **▲/▼ Buttons**  | Cycles through search results           |
| **Clear Button** | Clears the search query                 |

### Search Result Display

* **Matched Messages**: Highlighted with a yellow background
* **Non-matching Threads**: Shown semi-transparent (opacity: 0.35)
* **Current Position**: Emphasized with an orange outline
* **Count Display**: Shows current index/total like “1/10”

---

## 📎 File & Link Preview

### File Preview

Shows a preview button for files attached in ChatWork:

* **Supported Types**: Image files (uses ChatWork’s preview feature)
* **Format**: “📎 filename (size) [Preview]”
* **Behavior**: Clicking opens ChatWork’s preview modal

### External Link Preview

If ChatWork supports previewing an external URL, a preview button is shown:

* **Supported Services**: External services supported by ChatWork previews (e.g., Google Docs)
* **Format**: Adds a “[Preview]” button right after the URL
* **Behavior**: Clicking opens ChatWork’s preview feature

### Behavior While Preview Is Open

While the preview modal is open, the thread panel and toggle button are temporarily hidden for better usability:

* **Hidden Elements**: Both the thread panel and the toggle button
* **Restore Triggers**: Click, Esc key, or after 30 seconds
* **Rapid-click Protection**: Clicking the preview button itself does not trigger restoration

---

## ⌨️ Shortcut Key

| Key           | Action                               |
| ------------- | ------------------------------------ |
| **Shift + S** | Toggles the thread panel open/closed |

Disabled when focus is in an input field (textbox, textarea, or contenteditable element).

---

## 💾 Data Storage

### Storage Location

Uses the Chrome Storage API (`chrome.storage.local`)

### Stored Data

| Key                         | Content                                                         | Scope                |
| --------------------------- | --------------------------------------------------------------- | -------------------- |
| `cw-threader-toggle-states` | Thread collapse/expand states                                   | Room ID × Thread MID |
| `cw-threader-room-settings` | Room settings (speaker filter, flat mode, participation filter) | Room ID              |
| `pinned_{roomId}`           | List of pinned thread message IDs                               | Room ID              |

#### chrome.storage.sync (Global Settings)

| Key                    | Content                                      |
| ---------------------- | -------------------------------------------- |
| `cw-threader-settings` | Language, theme, collapsed max lines         |

Settings changes from popup.js are also reflected in the content script in real time.

### Save Timing

* When filter settings change
* When a thread is collapsed/expanded

---

## 📐 Technical Specifications

### Message Collection

Collects message data by parsing ChatWork’s DOM structure:

| Attribute             | How It’s Retrieved                                        |
| --------------------- | --------------------------------------------------------- |
| **Message ID (mid)**  | `data-mid` attribute                                      |
| **Room ID (rid)**     | `data-rid` attribute                                      |
| **Parent Message ID** | Parses `data-cwtag="[rp aid=XXX to=ROOMID-MESSAGEID]"`    |
| **User Name**         | `[data-testid="timeline_user-name"]` element              |
| **Avatar URL**        | `src` attribute of `.userIconImage`                       |
| **Timestamp**         | `[data-tm]` attribute                                     |
| **Message Body**      | Text inside `<pre>` (excluding quotes/reply badges, etc.) |
| **Quoted Message**    | `[data-cwtag^="[qt"]`, `.chatQuote` elements              |
| **To Recipients**     | `[data-cwtag^="[to"]` elements                            |
| **Sender AID**        | `[data-aid]` attribute, or extracted from the avatar URL  |

### Handling Omitted User Names in Consecutive Posts

In ChatWork, the user name may be omitted for consecutive posts, so the extension fills it in with this logic:

* If the user name cannot be retrieved, reuse the previous message’s user name
* The avatar URL is inherited in the same way

### Message Segments

To preserve the order of text and quotes within a message, content is managed as segments:

* **text segment**: Normal text portion
* **quote segment**: Quoted portion (includes speaker info and external link info)

This accurately reproduces complex structures like “text → quote → text”.

### “Me” Detection Logic

#### Messages Addressed to You (isToMe)

Evaluated as true if any of the following applies:

1. The message element has the `mentioned` class
2. The class name includes `mention` (for styled-components)
3. A parent element has the `timelineMessage--mention` class

#### Messages Sent by You (isFromMe)

Evaluated as true if any of the following applies:

1. An edit button exists (`[data-testid="message-edit-button"]`, etc.)
2. A delete button exists (`[data-testid="message-delete-button"]`, etc.)
3. A parent element has a class like `myMessage`, `my-message`, etc.

### Thread Construction Algorithm

1. Collect all messages and store them in a Map keyed by `mid`
2. Parse reply relations (`parentMid`) and build `replyMap` (child → parent) and `childrenMap` (parent → children list)
3. Recursively build trees starting from root messages (messages with no parent)
4. If the reply source cannot be found, generate a placeholder message

### Placeholder Messages

When the parent message does not exist in the DOM (out of scroll range, deleted, etc.):

* **User Name**: Use the child message’s `parentUserName` or “Unknown User”
* **Message Body**: “(Could not load the message)”
* **Style**: Semi-transparent, italic, not clickable

### MutationObserver

Automatically refreshes by watching these DOM changes:

* **Message Add/Delete**: Changes to elements with a `data-mid` attribute
* **Room Switch**: URL (hash) changes
* **Debounce**: Throttles processing to 500ms intervals
* **Exclude Self Changes**: Ignores changes caused by elements injected by the extension itself

### Initialization Timing

* **Page Load**: Starts at `document_idle` (after DOMContentLoaded)
* **Message Detection**: Checks every second for elements with a `data-mid` attribute
* **Timeout**: Stops initialization if no messages are found within 30 seconds
* **Delayed Button Injection**: Waits 1 second after initialization completes before adding “Show in Thread” buttons

---

## 🚀 How to Use

### Basic Steps

1. Open ChatWork ([https://www.chatwork.com/](https://www.chatwork.com/))
2. Open a chat room
3. Click the toggle button at the bottom-right (or press `Shift + S`)
4. The thread panel opens on the right
5. Click a message in the thread to scroll to that message in ChatWork

### Scroll & Highlight Behavior

#### When Clicking a Message in the Thread Panel (scrolling in ChatWork)

1. Smooth scroll so the message reaches the top of the screen
2. When the element is at least 50% visible and scrolling has stopped for 200ms, start a shake animation
3. Shake left and right by 5px **3 times**
4. After shaking, fade highlight from blue to transparent (1.5s)
5. Timeout after up to 8 seconds (forces execution even if scrolling isn’t fully completed)

#### When Clicking the “Show in Thread” Button (scrolling inside the thread panel)

1. If the thread panel is closed, open it
2. Expand the target thread if collapsed
3. Smooth scroll so the message reaches the bottom of the panel
4. Shake left and right by 5px **2 times**

### Filtering

1. **Speaker Filter**: Select a specific user from the dropdown in the header
2. **My Participation Only**: Turn ON to show only threads you’re involved in
3. **Flat Mode**: Turn ON to simplify deep nesting

### Search

1. Enter a keyword in the search bar
2. Matched messages are highlighted in yellow
3. Use ▲/▼ buttons to move through results

---

## 📦 Installation

### Install in Developer Mode

1. Clone this repository:

   ```bash
   git clone https://github.com/blocquality/ChatWorkThreader.git
   ```

2. Open `chrome://extensions/` in Chrome

3. Turn ON “Developer mode” (top-right)

4. Click “Load unpacked”

5. Select the cloned folder

---

## 📁 File Structure

```
ChatWorkThreader/
├── manifest.json      # Extension manifest (Manifest V3)
│ ├── content.js         # Content script (~5600 lines)
│ ├── styles.css         # Stylesheet
│ ├── popup.html         # Toolbar popup
│ ├── popup.js           # Popup script
├── icon128.png        # Extension icon (128x128, root)
├── icons/             # Icon image directory
│   ├── icon16.png     # Favicon (16x16)
│   ├── icon48.png     # Extensions page icon (48x48)
│   └── icon128.png    # Chrome Web Store icon (128x128)
└── README.md          # This document
```

### Main Class Structure (content.js)

| Class/Function              | Role                                           |
| --------------------------- | ---------------------------------------------- |
| `ThreadBuilder`             | Message collection & thread building logic     |
| `ThreadUI`                  | Panel UI management, rendering, event handling |
| `ShowInThreadButtonManager` | Adds/manages “Show in Thread” buttons          |
| `createToggleButton()`      | Creates the toggle button                      |
| `setupShortcutKey()`        | Registers shortcut key handling                |
| `observeMessages()`         | MutationObserver-based watching                |
| `init()`                    | Initialization logic                           |

---

## 🛠️ Development

### Requirements

* Chrome / Edge or other Chromium-based browsers
* Git

### Local Development

1. Edit the code
2. Reload the extension at `chrome://extensions/` (click the refresh icon)
3. Reload the ChatWork page and test

### Debugging

* Check logs in DevTools (F12) Console
* `console.log` statements are commented out (enable if needed)

---

## 🔧 Manifest V3 Settings

```json
{
  "manifest_version": 3,
  "name": "ChatWork Threader",
  "version": "1.0.2",
  "description": "Visualize ChatWork reply threads as a tree to track complex conversations at a glance and streamline teamwork.",
  "permissions": ["storage"],
  "host_permissions": ["https://www.chatwork.com/*"],
  "content_scripts": [{
    "matches": ["https://www.chatwork.com/*"],
    "js": ["content.js"],
    "css": ["styles.css"],
    "run_at": "document_idle"
  }],
  "action": {
    "default_popup": "popup.html"
  },
  "icons": {
    "128": "icon128.png"
  },
  "web_accessible_resources": [{
    "resources": [
      "icons/chat-round-line-svgrepo-com.svg",
      "icons/settings-svgrepo-com.svg",
      "icons/book-minimalistic-svgrepo-com.svg",
      "icons/user-svgrepo-com.svg",
      "icons/layers-minimalistic-svgrepo-com.svg",
      "icons/maximize-square-minimalistic-svgrepo-com.svg",
      "icons/minimize-square-minimalistic-svgrepo-com.svg",
      "icons/add-square-svgrepo-com.svg",
      "icons/minus-square-svgrepo-com.svg",
      "icons/align-left-svgrepo-com.svg",
      "icons/refresh-svgrepo-com.svg"
    ],
    "matches": ["https://www.chatwork.com/*"]
  }]
}
```

### Permission Details

| Permission         | Usage                                           |
| ------------------ | ----------------------------------------------- |
| `storage`          | Persist settings/state (`chrome.storage.local`) |
| `host_permissions` | Access to `https://www.chatwork.com/*`          |

---

## 📝 Message Types

| Type                | Internal Type Value | Description                                                 |
| ------------------- | ------------------- | ----------------------------------------------------------- |
| Standalone Message  | 1                   | A message not included in a thread (not shown in the panel) |
| Root                | 2                   | A message that has at least one reply                       |
| Reply               | 3                   | A reply to another message                                  |
| Both (Root + Reply) | 4                   | A message that is a reply and also has replies              |

---

## 🔄 Changelog

### v1.0.2

* Pin/unpin threads (pin threads to the top of the panel)
* Track origin message (high-speed scroll to find reply sources outside scroll range)
* Copy message button
* Settings panel (Language / Theme / Collapsed max lines)
* Help panel (Usage / Feature list / Badge legend)
* Tab UI (Threads / Settings / Help)
* Multi-language support (Japanese / English)
* Theme switching (Light / Dark / System)
* Collapsed max lines setting
* Pinned thread priority sorting
* "Show in Thread" button (hover on ChatWork messages)
* Placeholder messages (when reply source is not loaded)
* Quoted message segment display
* To/Re target display with avatars
* Auto-hide panel during preview
* Incomplete data detection & auto-retry
* Settings sync from popup.js

### v1.0.0

* Initial release
* Thread tree view
* Speaker filter
* My participation filter
* Flat mode
* Search
* File/link preview integration
* Shortcut key support
* Per-room settings persistence

---

## 📜 License

MIT License

### Third-Party Assets

The icons used in this extension are from the **Solar Linear Icons** collection (by [480 Design](https://www.svgrepo.com/author/480%20Design/)), available on [SVG Repo](https://www.svgrepo.com/).

- **License**: [CC Attribution License (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)

| Icon Name | Source |
|-----------|--------|
| Chat Round Line | https://www.svgrepo.com/svg/529480/chat-round-line |
| GPS | https://www.svgrepo.com/svg/524610/gps |
| Copy | https://www.svgrepo.com/svg/528917/copy |
| Pin | https://www.svgrepo.com/svg/529135/pin |
| Settings | https://www.svgrepo.com/svg/529867/settings |
| Book Minimalistic | https://www.svgrepo.com/svg/529408/book-minimalistic |
| Layers Minimalistic | https://www.svgrepo.com/svg/529043/layers-minimalistic |
| User | https://www.svgrepo.com/svg/529293/user |
| Align Left | https://www.svgrepo.com/svg/528841/align-left |
| Refresh | https://www.svgrepo.com/svg/529799/refresh |
| Add Square | https://www.svgrepo.com/svg/529372/add-square |
| Minus Square | https://www.svgrepo.com/svg/529080/minus-square |
| Maximize Square Minimalistic | https://www.svgrepo.com/svg/529063/maximize-square-minimalistic |
| Minimize Square Minimalistic | https://www.svgrepo.com/svg/529072/minimize-square-minimalistic |

---

## 🤝 Contributing

Issues and pull requests are welcome!

### Bug Reports

1. Include reproduction steps
2. Describe expected behavior vs actual behavior
3. Include your browser version

### Feature Requests

1. Overview of the proposed feature
2. Use cases / scenarios
3. Implementation approach if possible
