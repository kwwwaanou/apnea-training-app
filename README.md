# Apnea Training App MVP

A specialized freediving training application for CO2 and O2 tables.

## Features
- **Pure Dark UI**: AMOLED-friendly black background for zero distraction.
- **Timer Engine**: Precise CO2/O2 table logic with automated phase transitions.
- **Web Audio API**: High-frequency beeps and countdown warnings.
- **Wake Lock API**: Prevents screen sleep during active sessions.
- **Session History**: Locally persisted logs of your training sessions.

## Tech Stack
- **Framework**: React 18 (via Vite)
- **Styling**: Tailwind CSS
- **State Management**: Zustand (with Persist middleware)
- **Icons**: Lucide React

## Development

### Setup
```bash
npm install
```

### Run Locally
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

## Project Structure
- `src/store`: Application state and logic (Zustand).
- `src/components`: UI components (Dashboard, TimerView).
- `src/lib`: Core utility libraries (Audio Engine).
- `src/hooks`: Custom React hooks (Wake Lock).
- `src/index.css`: Tailwind and global styles.
