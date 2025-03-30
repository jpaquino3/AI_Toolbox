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

## License

ISC

## Acknowledgements

- Built with [Electron](https://www.electronjs.org/)
- UI components with [React](https://reactjs.org/)
- Styling with [Tailwind CSS](https://tailwindcss.com/) 