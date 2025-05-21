# SlackWave

A Slack app that allows users to check web pages for accessibility issues using the WebAIM WAVE API directly from Slack.

## Features

- Installable Slack app with per-team configuration
- Allows users to run accessibility checks directly from Slack using the `/wave` command
- Configurable WAVE API key during installation
- Supports different report types from the WAVE API

## Setup Instructions

### 1. Create a Slack App

1. Go to [Slack API Apps Page](https://api.slack.com/apps) and click "Create New App"
2. Choose "From Manifest" and paste the contents of `manifest.json` (modify the URLs as needed)
3. Once created, note the **Client ID** and **Client Secret** from the "Basic Information" page

### 2. Configure the Server

1. Clone this repository
2. Copy `.env.example` to `.env` and add your Slack app credentials:
   ```
   SLACK_CLIENT_ID=your_slack_client_id
   SLACK_CLIENT_SECRET=your_slack_client_secret
   SLACK_STATE_SECRET=some_random_string
   ```
3. Install dependencies and start the server:
   ```
   npm install
   npm start
   ```

### 3. Deploy to a Public Server

The app needs to be accessible from the internet. Deploy to a hosting platform like:

- Heroku
- Render
- Vercel
- AWS/GCP/Azure

Make sure to update the URLs in your Slack app configuration to match your deployed app's domain.

### 4. Install the App

1. Visit your deployed app's homepage (e.g., `https://your-app-domain.com`)
2. Click "Install on Slack"
3. Authorize the app for your workspace
4. You'll be redirected to the configuration page where you'll need to enter your [WAVE API key](https://wave.webaim.org/api/)
5. Once configured, you can use the `/wave` command in your Slack workspace

## Usage

In any Slack channel where the app is installed:

```
/wave https://example.com [reporttype]
```

Where `reporttype` is optional (defaults to 1) and can be:

- 1: Summary of issues
- 2: Detailed report
- 3: Detailed report with references
- 4: Detailed report with HTML content

## Development

Run the app locally with:

```
npm run dev
```

This uses nodemon to automatically restart the server when files change.

## Support

No support is offered for this project. 

## License

MIT
