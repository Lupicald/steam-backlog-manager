# Steam Backlog Manager

A mobile app built with React Native + Expo to manage your Steam gaming backlog.

![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## Features

- **Import your Steam library** via the Steam Web API using your SteamID or profile URL
- **Dashboard** showing Currently Playing, Up Next, Paused, Completed, and Abandoned games
- **Game status management** — tap the status icon on any card to cycle through statuses
- **Priority system** — High / Medium / Low to rank your backlog
- **HowLongToBeat integration** — auto-fetches estimated completion times per game
- **Backlog statistics** — total games, completion rate, estimated hours remaining
- **Pick My Next Game** — smart recommendation engine based on priority, play time, and habits
- **Game detail page** — view cover, playtime, HLTB estimates, progress slider, notes
- **Offline-first** — all data stored locally in SQLite, works without internet after import
- **Modern glassmorphism UI** — dark theme with translucent cards and colorful gradients

---

## Screenshots

> Dashboard → Library → Game Detail → Stats → Settings

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native + Expo (~51) |
| Routing | Expo Router (file-based) |
| Language | TypeScript |
| Database | expo-sqlite (SQLite, offline-first) |
| UI effects | expo-blur, expo-linear-gradient |
| Icons | @expo/vector-icons (Ionicons) |
| Build | EAS Build (APK + App Bundle) |

---

## Project Structure

```
steam-backlog-manager/
├── app/                        # Expo Router pages
│   ├── _layout.tsx             # Root layout + DB init
│   ├── (tabs)/                 # Tab navigator
│   │   ├── _layout.tsx         # Tab bar config
│   │   ├── index.tsx           # Dashboard tab
│   │   ├── library.tsx         # Library tab
│   │   ├── stats.tsx           # Statistics tab
│   │   └── settings.tsx        # Settings tab
│   └── game/
│       └── [id].tsx            # Game detail page
│
├── src/
│   ├── types/
│   │   └── index.ts            # All TypeScript types & constants
│   ├── utils/
│   │   ├── colors.ts           # Design system colors
│   │   └── formatters.ts       # Time, date, text helpers
│   ├── database/
│   │   ├── schema.ts           # SQLite init & table creation
│   │   └── queries.ts          # All CRUD operations
│   ├── api/
│   │   ├── steam.ts            # Steam Web API client
│   │   └── hltb.ts             # HowLongToBeat API client
│   ├── services/
│   │   ├── steamService.ts     # Library import orchestration
│   │   └── howLongToBeatService.ts # HLTB enrichment service
│   ├── hooks/
│   │   ├── useDatabase.ts      # DB initialization hook
│   │   ├── useGames.ts         # Games CRUD + state hook
│   │   └── useRecommendation.ts # Smart recommendation hook
│   ├── components/
│   │   ├── GlassCard.tsx       # Glassmorphism card wrapper
│   │   ├── GameCard.tsx        # Game list card (with status toggle)
│   │   ├── GameCover.tsx       # Steam CDN image component
│   │   ├── StatusBadge.tsx     # Colored status pill
│   │   ├── PriorityBadge.tsx   # Colored priority pill
│   │   ├── StatCard.tsx        # Stat metric card
│   │   ├── SectionHeader.tsx   # Section title with icon + count
│   │   └── PickNextGameModal.tsx # "Pick My Next Game" bottom sheet
│   └── screens/
│       ├── DashboardScreen.tsx
│       ├── LibraryScreen.tsx
│       ├── GameDetailScreen.tsx
│       ├── StatsScreen.tsx
│       └── SettingsScreen.tsx
│
├── assets/                     # Icons, splash, fonts
├── app.json                    # Expo config
├── eas.json                    # EAS Build profiles
├── package.json
├── tsconfig.json
└── babel.config.js
```

---

## Setup

### 1. Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Expo CLI](https://docs.expo.dev/get-started/installation/)
- A physical Android/iOS device or emulator

### 2. Clone and install

```bash
git clone https://github.com/your-username/steam-backlog-manager.git
cd steam-backlog-manager
npm install
```

### 3. Start the dev server

```bash
npx expo start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS).

---

## Steam API Setup

1. Get a Steam API key: https://steamcommunity.com/dev/apikey
2. Make sure your **Steam profile** and **Game Details** are set to **Public**
3. Open the app → Settings → enter your SteamID (or profile URL) and API key → Import

Your SteamID can be found at: https://steamid.io/

---

## Building an APK

### Using EAS Build (recommended)

```bash
# Install EAS CLI
npm install -g eas-cli

# Log in to Expo
eas login

# Build a debug/preview APK
eas build --platform android --profile preview

# Build a release APK
eas build --platform android --profile apk
```

The APK will be available for download from the Expo dashboard.

### Using local build (advanced)

```bash
npx expo run:android
```

Requires Android Studio and NDK.

---

## HowLongToBeat

HLTB data is fetched via their unofficial search API (`howlongtobeat.com/api/search`).
Data is cached locally in SQLite after first fetch.

- Go to Settings → **Sync HLTB Data** to enrich all games
- Or tap the refresh icon on any Game Detail page

---

## Game Statuses

| Status | Description |
|---|---|
| Not Started | In library, never played |
| Up Next | Queued to play next |
| Playing | Currently active |
| Paused | Started but on hold |
| Completed | Finished main story |
| Abandoned | Dropped / not finishing |

---

## License

MIT — free to use, fork, and share.
