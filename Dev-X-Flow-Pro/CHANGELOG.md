# Changelog

All notable changes to Dev-X-Flow-Pro will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### Planned
- Additional AI provider integrations
- Enhanced terminal features
- Customizable themes
- Plugin system

---

## [7.0] - 2026-02-08

### Added
- **Initial Release of Dev-X-Flow-Pro**: Professional Git GUI with AI-Powered Commit Messages & Database Management
  - Modern dark UI with tabbed interface
  - Repository management (status, commit, history, remote, stash)
  - AI-powered commit message generation (7 providers supported)
  - Integrated terminal with project-type detection
  - Debug tools for Laravel log monitoring
  - Git diff viewer and merge conflict resolver
  - Interactive rebase support
  - Database Import Tab: MySQL database management integration
    - Connection configuration (host, user, password, custom port)
    - Database list fetching and selection
    - View database status (tables, sizes)
    - Export schema and sample data to TXT
    - Selective restore from SQL dump
    - Full database import with progress feedback
    - Connection test functionality
    - Dynamic timeout handling based on file size
  - Custom branding with devXflowpro.png logo and app.ico

## [6.4] - 2026-02-07

### Added
- **Interactive Rebase Tab**: Visual interactive rebase for commit history management
  - Load commits from HEAD~N or any reference
  - Select/deselect commits with checkboxes
  - Per-commit actions: pick, reword, edit, squash, fixup, drop
  - Start, abort, and continue rebase operations
  - Real-time commit list with action dropdowns

---

## [6.3] - 2026-02-07

### Added
- **Git Diff Viewer Tab**: Visual diff visualization for code review
  - Compare working directory, staged changes, or any commits
  - File list showing all changed files
  - Color-coded diff output (green=additions, red=deletions)
  - Click any file to see its specific diff
  - Support for comparing any two commits/branches

- **Merge Conflict Resolver Tab**: Visual 3-way merge conflict resolution
  - Scan for files with merge conflicts
  - 3-way view: BASE (common ancestor), THEIRS (incoming), OURS (your changes)
  - One-click resolution: "Accept Theirs" or "Accept Ours"
  - Manual edit option for complex conflicts
  - Mark resolved and stage files

---

## [6.2.1] - 2026-02-07

### Fixed
- **Git Author Dialog Minimize Issue**: Fixed dialog not reappearing after Windows+D minimize
  - Removed modal `grab_set()` to allow proper window management
  - Added dialog instance tracking to prevent duplicate windows
  - Added `lift()` and `focus_force()` to bring existing dialog to front

---

## [6.2] - 2026-02-07

### Added
- **Git Author Configuration Dialog**: Configure git author name and email directly from the GUI
  - Added "👤 Git Author" button in Status & Commit tab
  - Shows current author name and email settings
  - Updates global git config with validation
  - Provides success/error feedback messages
- Added CHANGELOG.md file for tracking all modifications (Created: February 2, 2026)

### Changed
- Version bump from 6.1.1 to 6.2
- Updated all version references in documentation
- Rebuilt executable with new version: GitFlow-Pro-v6.2.exe

---

## [6.1.1] - 2026-02-07

### Fixed
- **Icon Display Issues**: Resolved custom icon not showing in Windows Explorer
  - Converted logo to proper multi-size ICO format
  - Fixed window icon loading in bundled executable
  - Fixed splash screen image display
  - Changed executable filename to bypass Windows icon cache

### Changed
- Regenerated app.ico with multi-size format (256→16px)
- Updated window_icon.png from correct source image
- Rebuilt executable as GitFlow-Pro-v6.1.1.exe

---

## [6.1] - 2026-02-06

### Added
- **AI-Powered Commit Message Generation**
  - "✨ AI Generate" button for contextual commit messages
  - Configuration UI for API keys
  - Secure API key storage in `~/.gitflow_ai_config.json`

### Changed
- Initial stable release with version 6.1
- Professional README.md documentation

---

## [6.0] - 2026-02-05

### Added
- **7 AI Provider Support**: OpenAI, Google Gemini, Anthropic Claude, Moonshot Kimi, ChatGLM, DeepSeek, Azure OpenAI
- Multi-provider AI integration with dynamic API request construction
- Custom model input support per provider

---

## [5.0] - 2026-02-04

### Added
- **Debug Tools**
  - Laravel log file monitoring
  - Auto-refresh log display
  - Error/Warning/Info level highlighting with color coding
  - Log file path configuration
- **Application Branding**
  - Custom application icon (gitflowprof.png)
  - Splash screen on startup with loading animation
  - Window icon in title bar
  - Version display in window title

---

## [4.0] - 2026-02-03

### Added
- **Integrated Terminal**
  - Project-type detection (Laravel, Node.js, Python, General)
  - Command history persistence
  - Command suggestions based on project type
  - Auto-complete for common commands
  - Terminal color scheme matching dark theme

---

## [3.0] - 2026-02-02

### Added
- **Complete Repository Management**
  - Repository initialization with "⚡ Init Repo" button
  - Repository browsing with folder picker
  - Branch creation, switching, and deletion
  - Git status visualization with color coding
  - Stash operations (save, pop, list)
  - Remote management (add, remove, view)
  - Pull, push, and fetch operations
- **Sync to Main Workflow**: One-click commit → merge → push → pull

---

## [2.0] - 2026-02-01

### Added
- **Modern Dark UI Theme**
  - Sleek, professional interface design with dark color scheme
  - Tabbed navigation interface:
    - Status & Commit tab
    - History tab with commit log
    - Remote tab for remote management
    - Stash tab for stash operations
    - Terminal tab for command line
    - Debug tab for log monitoring
  - Color-coded Git status indicators (green=success, red=danger, orange=warning)
  - Responsive layout with modern padding and spacing
  - Custom-styled buttons (Action, Secondary, Success, Danger)

---

## [1.0] - 2026-01-31

### Added
- **Basic Git Operations**
  - Stage all changes
  - Commit with custom message
  - Push to remote
  - Refresh/status check
  - Basic error handling and user feedback

---

## [0.1] - 2026-01-30

### Added
- **Initial Project Setup**
  - Project structure creation
  - Basic tkinter window setup
  - Git repository directory selection
  - Initial configuration file support
  - Basic UI layout foundation

---

## Version History Summary

| Version | Date | Key Features |
|---------|------|--------------|
| 6.2 | 2026-02-07 | Git Author Config, Version Update |
| 6.1.1 | 2026-02-07 | Icon Fix, Windows Explorer Support |
| 6.1 | 2026-02-06 | AI Commit Messages, Initial Stable Release |
| 6.0 | 2026-02-05 | Multi-Provider AI Support |
| 5.0 | 2026-02-04 | Debug Tools, Application Branding |
| 4.0 | 2026-02-03 | Integrated Terminal |
| 3.0 | 2026-02-02 | Repository Management, Sync Workflow |
| 2.0 | 2026-02-01 | Modern Dark UI Theme |
| 1.0 | 2026-01-31 | Basic Git Operations |
| 0.1 | 2026-01-30 | Initial Project Setup |

---

## Contributing to Changelog

When adding new features or fixes:
1. Add entry under [Unreleased] section first
2. Move to version section when released
3. Follow the format: `### Added/Changed/Fixed`
4. Include clear description of changes
5. Reference commit hashes when applicable

---

**Note**: This changelog documents the complete development history from version 0.1 to present.
