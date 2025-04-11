const { InstallProvider } = require('@slack/oauth');
const { WebClient } = require('@slack/web-api');
const fs = require('fs');
const path = require('path');

// Create installations directory if it doesn't exist
const installDir = path.join(__dirname, 'installations');
if (!fs.existsSync(installDir)) {
  fs.mkdirSync(installDir);
}

// For production, use a database instead of file storage
const dataStore = {
  async storeInstallation(installation) {
    const key = installation.team?.id || installation.enterprise?.id;
    if (!key) throw new Error('Could not determine team or enterprise id');
    
    // Store installation data
    const installData = JSON.stringify(installation);
    await fs.promises.writeFile(path.join(installDir, `${key}.json`), installData);
    return true;
  },
  
  async fetchInstallation(installQuery) {
    const key = installQuery.teamId || installQuery.enterpriseId;
    if (!key) throw new Error('Could not determine team or enterprise id');
    
    try {
      const data = await fs.promises.readFile(path.join(installDir, `${key}.json`), 'utf8');
      return JSON.parse(data);
    } catch (error) {
      throw new Error(`Installation not found: ${error}`);
    }
  },
  
  async storeWaveApiKey(teamId, waveApiKey) {
    try {
      // Read existing installation
      const data = await fs.promises.readFile(path.join(installDir, `${teamId}.json`), 'utf8');
      const installation = JSON.parse(data);
      
      // Add WAVE API key
      installation.waveApiKey = waveApiKey;
      
      // Save back to storage
      await fs.promises.writeFile(path.join(installDir, `${teamId}.json`), JSON.stringify(installation));
      return true;
    } catch (error) {
      throw new Error(`Failed to store WAVE API key: ${error}`);
    }
  },
  
  async getWaveApiKey(teamId) {
    try {
      const data = await fs.promises.readFile(path.join(installDir, `${teamId}.json`), 'utf8');
      const installation = JSON.parse(data);
      return installation.waveApiKey;
    } catch (error) {
      throw new Error(`Failed to get WAVE API key: ${error}`);
    }
  }
};

// Initialize the OAuth installer
const installer = new InstallProvider({
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  stateSecret: process.env.SLACK_STATE_SECRET,
  installationStore: dataStore,
  scopes: ['commands', 'chat:write'],
});

// Create a Slack Web client (will be initialized per team)
const getSlackClient = async (teamId) => {
  const installation = await dataStore.fetchInstallation({ teamId });
  return new WebClient(installation.bot.token);
};

module.exports = { installer, dataStore, getSlackClient };