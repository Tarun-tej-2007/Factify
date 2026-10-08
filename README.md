# Factify

Factify is an AI-assisted content verification project that helps users assess
links, text, news, and media for authenticity, phishing risk, misinformation,
or other suspicious indicators. It includes:

- A cross-platform Expo/React Native application.
- An Express proxy server that sends verification prompts to Google Gemini
  without exposing the Gemini API key in the mobile app.
- A Chrome extension for quick website, news, and media checks from the
  browser.

> Factify provides an automated assessment, not a definitive fact-check. Treat
> `unknown` results and low-confidence results cautiously, and confirm
> important information with reliable sources.

## Features

### Mobile app

- Verify a URL or a text claim from a simple Expo interface.
- Automatically detect whether entered content is a link or text.
- View a result as `Verified`, `Suspicious`, or `Unable to Verify`.
- See the model's explanation and confidence score.
- Open the original link after reviewing the result.
- Store up to 50 verification results locally and revisit or delete them from
  History.
- Support Android, iOS, and web through Expo.
- Accept incoming `http` and `https` links on Android through the configured
  intent filters.

### Chrome extension

- Analyze the active website from the extension popup.
- Check URLs with Google Safe Browsing and VirusTotal.
- Apply local URL-pattern and heuristic checks.
- Check pasted news text or URLs.
- Upload image or video files for media analysis.
- Show a status, confidence score, detected threats, and analysis details.

## Technology

- **Mobile:** React Native, Expo SDK 54, Expo Router, TypeScript
- **State and persistence:** TanStack Query, AsyncStorage, React Context
- **Backend:** Node.js, Express, CORS, dotenv
- **AI verification:** Google Gemini through the backend proxy
- **Browser extension:** Chrome Manifest V3, vanilla JavaScript, HTML, and CSS
- **Builds:** Expo Application Services (EAS)

## Repository structure

```text
Factify/
├── README.md
└── factify/
    ├── app/                  # Expo Router screens
    ├── components/           # Reusable React Native UI
    ├── contexts/             # Verification state and local history
    ├── services/             # Mobile-to-server verification client
    ├── types/                # Shared TypeScript verification types
    ├── server/               # Express/Gemini verification proxy
    ├── FactifyExtension/     # Chrome extension
    ├── assets/               # Logos, icons, and splash assets
    ├── app.json              # Expo configuration
    ├── eas.json              # EAS build profiles
    └── package.json          # Mobile app scripts and dependencies
```

## Prerequisites

- Node.js 18 or newer
- npm
- A Google Gemini API key
- Expo Go for quick device testing, or an Android emulator/iOS simulator
- Chrome or another Chromium-based browser for the extension
- EAS CLI only when creating production builds:

  ```bash
  npm install --global eas-cli
  ```

## Installation

Install dependencies for both the mobile app and the server:

```bash
cd factify
npm install

cd server
npm install
```

## Configure the verification server

Create `factify/server/.env` from the example file:

```bash
cd factify/server
copy .env.example .env
```

On macOS or Linux, use `cp .env.example .env` instead of `copy`.

Set the Gemini credentials in `server/.env`:

```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
MODEL_NAME=gemini-1.5-flash
```

Never commit `.env` files or API keys to source control.

## Run locally

Start the verification proxy in one terminal:

```bash
cd factify/server
npm start
```

Start the Expo app in a second terminal:

```bash
cd factify
npx expo start
```

Then choose one of the options shown by Expo:

- Press `a` for an Android emulator.
- Press `i` for an iOS simulator on macOS.
- Press `w` for the web version.
- Scan the QR code with Expo Go.

### Connecting from a physical device

The mobile app uses these default proxy addresses:

- Web and iOS simulator: `http://localhost:3000/api/verify`
- Android emulator: `http://10.0.2.2:3000/api/verify`

For a physical device, set `VERIFICATION_PROXY_URL` to the server's LAN
address, for example:

```env
VERIFICATION_PROXY_URL=http://192.168.1.10:3000/api/verify
```

The device and development computer must be on the same network, and the
server port must be reachable through the computer's firewall.

## Load the Chrome extension

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the `factify/FactifyExtension` directory.
5. Pin Factify to the browser toolbar.
6. Open a website and select the Factify extension icon.

The extension uses its configured third-party analysis services for website
checks. Review the extension configuration before distributing it and use
rotatable, restricted API credentials rather than embedding personal or
production secrets in client-side code.

## Verification response

The proxy returns a normalized response with this shape:

```json
{
  "status": "true",
  "reason": "The claim is consistent with reliable sources.",
  "confidence": 92
}
```

Possible `status` values are:

- `true` - the content appears legitimate or supported.
- `fake` - the content appears suspicious, misleading, or unsafe.
- `unknown` - the service could not establish a reliable result.

The confidence value is a number from `0` to `100`; it is an estimate and
should not be treated as proof.

## Useful commands

Run these from `factify/`:

```bash
npm run start              # Start Expo
npm run android            # Start Expo on Android
npm run ios                # Start Expo on iOS
npm run web                # Start Expo for web
npm run lint               # Run Expo linting
npm run build:android-apk  # Build an Android APK with EAS
npm run build:android-aab  # Build an Android App Bundle with EAS
```

Run these from `factify/server/`:

```bash
npm start                  # Start the Express proxy
```

## Android builds

Authenticate with Expo, configure EAS if needed, and choose a build profile:

```bash
cd factify
eas login
eas build:configure
eas build --platform android --profile preview
```

The available Android-oriented profiles are:

- `development` - internal development client.
- `preview` - installable internal-testing APK.
- `android-apk` - release APK.
- `production` - Play Store-oriented Android App Bundle.

See [`factify/BUILD_GUIDE.md`](factify/BUILD_GUIDE.md) for the detailed build
and troubleshooting guide.

## Troubleshooting

- **The app cannot connect to the server:** confirm that the proxy is running,
  use the correct device-specific URL, and check the firewall.
- **The server exits during startup:** verify that `GEMINI_API_KEY` is present
  in `factify/server/.env`.
- **The model response is marked unknown:** inspect the server logs and confirm
  that the Gemini model and API quota are available.
- **An Android link does not open in Factify:** verify the app is installed
  and selected as the handler for supported links.
- **An EAS upload fails:** retry on a stable network or use the local build
  option documented in [`factify/BUILD_GUIDE.md`](factify/BUILD_GUIDE.md).

## License

No project license has been specified yet.
