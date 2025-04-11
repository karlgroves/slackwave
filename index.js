require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const { installer, dataStore, getSlackClient } = require('./config');

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// OAuth callback endpoint
app.get('/slack/oauth_redirect', async (req, res) => {
  try {
    // Complete the OAuth flow
    const installation = await installer.handleCallback(req, res);
    
    // Redirect to the configuration page
    res.redirect(`/config?teamId=${installation.team.id}`);
  } catch (error) {
    console.error('OAuth error:', error);
    res.status(500).send('OAuth installation failed');
  }
});

// Configuration page for entering WAVE API key
app.get('/config', (req, res) => {
  const teamId = req.query.teamId;
  
  if (!teamId) {
    return res.status(400).send('Team ID is required');
  }
  
  res.send(`
    <html>
      <head>
        <title>WAVE App Configuration</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          h1 { color: #4A154B; }
          form { margin-top: 20px; }
          label { display: block; margin-bottom: 5px; font-weight: bold; }
          input[type="text"] { width: 100%; padding: 8px; margin-bottom: 15px; }
          button { background-color: #4A154B; color: white; border: none; padding: 10px 15px; cursor: pointer; }
          a { color: #1264A3; }
        </style>
      </head>
      <body>
        <h1>WAVE App Configuration</h1>
        <p>Enter your WAVE API key to complete the setup:</p>
        <form method="POST" action="/config">
          <input type="hidden" name="teamId" value="${teamId}" />
          <label>WAVE API Key:</label>
          <input type="text" name="waveApiKey" required />
          <p><a href="https://wave.webaim.org/api/" target="_blank">Get a WAVE API key</a></p>
          <button type="submit">Save Configuration</button>
        </form>
      </body>
    </html>
  `);
});

// Handle configuration form submission
app.post('/config', async (req, res) => {
  const { teamId, waveApiKey } = req.body;
  
  if (!teamId || !waveApiKey) {
    return res.status(400).send('Team ID and WAVE API key are required');
  }
  
  try {
    await dataStore.storeWaveApiKey(teamId, waveApiKey);
    res.send(`
      <html>
        <head>
          <title>Configuration Complete</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
            h1 { color: #4A154B; }
          </style>
        </head>
        <body>
          <h1>Configuration Complete!</h1>
          <p>Your WAVE API key has been saved. You can now use the /wave command in your Slack workspace.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Configuration error:', error);
    res.status(500).send('Failed to save configuration');
  }
});

// Slack install URL
app.get('/slack/install', (req, res) => {
  res.redirect(installer.generateInstallUrl({
    scopes: ['commands', 'chat:write'],
    metadata: req.query.metadata,
  }));
});

// Slack slash command handler
app.post('/slack/events', async (req, res) => {
  const { command, text, team_id, response_url } = req.body;
  
  if (command !== '/wave') {
    return res.status(404).send();
  }
  
  try {
    // Get the team's WAVE API key
    const WAVE_API_KEY = await dataStore.getWaveApiKey(team_id);
    
    if (!WAVE_API_KEY) {
      return res.json({
        response_type: 'ephemeral',
        text: 'WAVE API key not configured. Please contact your admin to complete setup.'
      });
    }
    
    // Split the text into URL and report type
    const [url, reporttype] = text.split(' ');
    
    if (!url) {
      console.log('No URL provided');
      return res.json({
        response_type: 'ephemeral',
        text: 'Please provide a URL to check.'
      });
    }
    
    const validReportTypes = ['1', '2', '3', '4'];
    const selectedReportType = reporttype && validReportTypes.includes(reporttype) ? reporttype : '1';
    
    console.log(`URL: ${url}`);
    console.log(`Report Type: ${selectedReportType}`);
    
    // Send an immediate response to Slack
    res.json({
      response_type: 'ephemeral',
      text: 'Processing your request...'
    });
    
    // Perform the WAVE API request
    const waveApiUrl = `https://wave.webaim.org/api/request?key=${WAVE_API_KEY}&url=${url}&reporttype=${selectedReportType}`;
    console.log(`WAVE API URL: ${waveApiUrl}`);
    
    const response = await axios.get(waveApiUrl);
    
    if (response.data.status === 'error') {
      console.log('WAVE API error:', response.data.message);
      await axios.post(response_url, {
        response_type: 'ephemeral',
        text: `Error: ${response.data.message}`
      });
      return;
    }
    
    let summary;
    const filteredCategories = ['feature', 'structure', 'aria'];
    
    if (selectedReportType === '1') {
      const results = response.data.categories;
      summary = `*Accessibility summary (type ${selectedReportType}) for <${url}>:*\n`;
      for (const category in results) {
        if (results.hasOwnProperty(category) && !filteredCategories.includes(category)) {
          summary += `*${category}:* ${results[category].count} issues\n`;
        }
      }
    } else if (selectedReportType === '3') {
      const data = response.data;
      summary = `*Detailed Accessibility Report (type ${selectedReportType}) for <${url}>:*\n`;
      summary += `Page Title: ${data.statistics.pagetitle}\n`;
      summary += `Total Elements: ${data.statistics.totalelements}\n`;
      summary += `Total Issues: ${data.statistics.allitemcount}\n\n`;
      for (const category in data.categories) {
        if (data.categories.hasOwnProperty(category) && !filteredCategories.includes(category)) {
          summary += `*${data.categories[category].description}:* ${data.categories[category].count} issues\n`;
          for (const item in data.categories[category].items) {
            if (data.categories[category].items.hasOwnProperty(item)) {
              summary += `    - ${data.categories[category].items[item].description}: ${data.categories[category].items[item].count}\n`;
              if (data.categories[category].items[item].xpaths) {
                summary += `        XPaths:\n`;
                data.categories[category].items[item].xpaths.forEach((xpath, index) => {
                  summary += `        ${index + 1}. \`${xpath}\`\n`;
                });
              }
              if (data.categories[category].items[item].contrastdata) {
                summary += `        Contrast Data:\n`;
                data.categories[category].items[item].contrastdata.forEach((contrast) => {
                  summary += `        - Ratio: ${contrast[0]}, Foreground: ${contrast[1]}, Background: ${contrast[2]}, Pass: ${contrast[3]}\n`;
                });
              }
            }
          }
        }
      }
    } else {
      const data = response.data;
      summary = `*Detailed Accessibility Report (type ${selectedReportType}) for <${url}>:*\n`;
      summary += `Page Title: ${data.statistics.pagetitle}\n`;
      summary += `Total Elements: ${data.statistics.totalelements}\n`;
      summary += `Total Issues: ${data.statistics.allitemcount}\n\n`;
      for (const category in data.categories) {
        if (data.categories.hasOwnProperty(category) && !filteredCategories.includes(category)) {
          summary += `*${data.categories[category].description}:* ${data.categories[category].count} issues\n`;
          for (const item in data.categories[category].items) {
            if (data.categories[category].items.hasOwnProperty(item)) {
              summary += `    - ${data.categories[category].items[item].description}: ${data.categories[category].items[item].count}\n`;
            }
          }
        }
      }
    }
    
    console.log('Summary:', summary);
    
    // Send the final result to Slack using the response_url
    await axios.post(response_url, {
      response_type: 'in_channel',
      text: summary
    });
    
  } catch (error) {
    console.error('Error handling /wave command:', error);
    await axios.post(req.body.response_url, {
      response_type: 'ephemeral',
      text: 'Internal server error. Please try again later.'
    });
  }
});

// Home route for basic info
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>WAVE Accessibility Slack App</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          h1 { color: #4A154B; }
          .button { background-color: #4A154B; color: white; border: none; padding: 10px 15px; text-decoration: none; display: inline-block; margin-top: 20px; }
        </style>
      </head>
      <body>
        <h1>WAVE Accessibility Slack App</h1>
        <p>This app allows you to check web accessibility with WebAIM WAVE directly from Slack.</p>
        <p>Use the /wave command followed by a URL to check accessibility issues.</p>
        <a href="/slack/install" class="button">Install on Slack</a>
      </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});