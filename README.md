# AI Toolbox

An AI tools dashboard for managing and accessing various AI generation platforms.

## Features

- **Centralized Dashboard**: Access all your AI tools from one app
- **Built-in Browser**: Dedicated browsing experience with automatic login retention
- **AI Assistant**: Get help with using AI tools and generating effective prompts
- **Customizable**: Add and remove AI tools as needed
- **Cross-platform**: Works on macOS, Windows, and Linux (macOS setup initially provided)

## Screenshots

(Screenshots will be added once the app is built)

## Installation

```bash
npm install
```

## Running the App

There are two main ways to run the application:

### Development Mode

For development with hot reloading:

```bash
npm run dev
```

This starts the app in development mode with webpack dev server for hot reloading and enables developer tools.

### Production Mode

To build and run the production version:

```bash
npm start
```

This builds the app for production and then runs the Electron app with the production build.

## Building

To only build the production version without running:

```bash
npm run build
```

## Packaging the App

To create distributable packages for the current platform:

```bash
npm run package
```

## Troubleshooting

- If you see a white screen when running `npm start`, make sure you've built the app first with `npm run build`.
- If tools reload every time they're clicked, check that the correct WebViewPage caching is implemented.

## Integrating AI Services

To connect the AI Assistant to a real AI service:

1. Go to Settings in the app
2. Select your preferred AI provider (OpenAI, Anthropic, etc.)
3. Enter your API key
4. Save settings

## Adding Custom AI Tools

You can add any AI tool that has a web interface:

1. Go to Settings in the app
2. Under "Manage AI Tools", enter the name and URL of the tool
3. Click "Add Tool"
4. The new tool will appear in your dashboard and sidebar

## App Updates

The application includes an auto-update mechanism that checks for new versions from the GitHub repository. When a new version is available, users can download and install it directly from the Settings page.

### How it works:

1. The app uses `electron-updater` to check for updates from the GitHub repository at `https://github.com/jpaquino3/AI_Toolbox`
2. Updates are checked automatically when the app starts and can be manually checked from the Settings page
3. When a new version is available, users can download it with a single click
4. After downloading, users need to restart the app to apply the update

### For developers:

To release a new version, update the version number in `package.json` and push to the GitHub repository. Make sure to:

1. Follow semantic versioning (MAJOR.MINOR.PATCH)
2. Create a GitHub release with the same version number
3. Upload the built application files to the GitHub release

### Troubleshooting Update Issues:

If updates aren't working properly after building the app, check that:

1. The `main.js` and `preload.js` files are being copied to the build directory during the build process
2. The `electron-updater` dependency is included in your final package
3. The `publish` configuration is correctly set in `package.json`
4. You're creating proper GitHub releases with the same version as in your `package.json`

The build process includes verification steps to ensure these files are present. You can manually run the verification with:

```bash
node scripts/verify-build.js
```

## License

ISC

## Acknowledgements

- Built with [Electron](https://www.electronjs.org/)
- UI components with [React](https://reactjs.org/)
- Styling with [Tailwind CSS](https://tailwindcss.com/) 