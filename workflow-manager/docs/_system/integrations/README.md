# Integration Guide

## Overview

This guide provides information about free and community-driven integrations that can enhance your feature tracking workflow. All integrations are designed to work with the markdown-based tracking system and GitHub Issues.

## 🔄 Core Integrations

### GitHub Integration (Built-in)
- **Tool**: GitHub Issues & Projects
- **Cost**: Free for public repos, included in GitHub plans
- **Features**:
  - Automatic issue creation from markdown templates
  - Label management and categorization
  - Milestone tracking for epics
  - Project boards for visual management
  - Pull request linking

**Setup**:
1. Set environment variables: `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`
2. Run: `node scripts/sync-github.js --ensure-labels`
3. Sync documents: `node scripts/sync-github.js --sync-all`

---

## ⏱️ Time Tracking Integrations

### 1. Toggl Track (Free Tier)
- **Cost**: Free up to 5 users
- **Features**: Time tracking, reporting, project categorization
- **Integration**: Manual or via Toggl API

**Setup**:
```bash
# Install Toggl CLI (optional)
npm install -g toggl-cli

# Track time for a task
toggl start "[AGENT-001] Connect Agent Implementation" --project "UT Tools Manager"
toggl stop
```

**Markdown Integration**:
Add time tracking section to task templates:
```markdown
## ⏱️ Time Tracking
- **Toggl Project**: UT Tools Manager
- **Toggl Task**: [AGENT-001] Connect Agent Implementation
- **Time Entries**: [Link to Toggl](https://track.toggl.com/timer)
```

### 2. Clockify (Free)
- **Cost**: Completely free
- **Features**: Unlimited users, time tracking, reporting
- **Integration**: Clockify API or manual entry

**Setup**:
```bash
# Using Clockify API
curl -X POST https://api.clockify.me/api/v1/workspaces/{workspaceId}/time-entries \
  -H "X-Api-Key: {your-api-key}" \
  -H "Content-Type: application/json" \
  -d '{
    "start": "2024-01-01T09:00:00.000Z",
    "description": "[AGENT-001] Connect Agent Implementation",
    "projectId": "{projectId}",
    "taskId": "{taskId}"
  }'
```

### 3. WakaTime (Free Tier)
- **Cost**: Free for personal use
- **Features**: Automatic coding time tracking
- **Integration**: IDE plugins, automatic detection

**Setup**:
1. Install WakaTime plugin in your IDE
2. Configure project mapping in `.wakatime-project`
3. View reports at https://wakatime.com/dashboard

---

## 📊 Project Management Integrations

### 1. GitHub Projects (Free)
- **Cost**: Free with GitHub
- **Features**: Kanban boards, automation, custom fields
- **Integration**: Native GitHub integration

**Setup**:
1. Create project in GitHub repository
2. Link issues automatically
3. Configure automation rules
4. Use project views for different perspectives

### 2. Notion (Free Tier)
- **Cost**: Free for personal use
- **Features**: Database views, templates, automation
- **Integration**: Notion API + custom scripts

**Notion Database Schema**:
```
Tasks Database:
- Title (Title)
- Task ID (Text)
- Status (Select: Pending, In Progress, Completed, Blocked)
- Priority (Select: High, Medium, Low)
- Entity (Select: Agent, Manager, Task, Auth)
- GitHub Issue (Number)
- Estimated Hours (Number)
- Actual Hours (Number)
- Assignee (Person)
```

### 3. Trello (Free Tier)
- **Cost**: Free up to 10 team boards
- **Features**: Kanban boards, power-ups, automation
- **Integration**: Trello API + webhooks

**Board Structure**:
- **Lists**: Backlog, In Progress, Review, Done, Blocked
- **Cards**: One per task with GitHub issue link
- **Labels**: Priority and entity-based

---

## 🤖 Automation Integrations

### 1. GitHub Actions (Free Tier)
- **Cost**: Free for public repos, 2000 minutes/month for private
- **Features**: CI/CD, automation, scheduled tasks
- **Integration**: Built-in GitHub integration

**Example Workflow** (`.github/workflows/sync-tracking.yml`):
```yaml
name: Sync Tracking Documents

on:
  push:
    paths:
      - 'docs/features/**'
      - 'docs/tasks/**'
      - 'docs/epics/**'
  schedule:
    - cron: '0 9 * * 1' # Weekly sync

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install @octokit/rest
      - run: node scripts/sync-github.js --sync-all
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 2. Zapier (Free Tier)
- **Cost**: Free up to 100 tasks/month
- **Features**: Connect 5000+ apps, automation workflows
- **Integration**: GitHub webhooks + target apps

**Example Zaps**:
- GitHub Issue Created → Slack Notification
- GitHub Issue Closed → Time tracking stop
- New Feature → Create Trello card

### 3. IFTTT (Free)
- **Cost**: Free with limitations
- **Features**: Simple automation, mobile integration
- **Integration**: GitHub webhooks + mobile apps

---

## 📱 Mobile & Communication Integrations

### 1. Slack (Free Tier)
- **Cost**: Free up to 10,000 messages
- **Features**: Channels, notifications, bot integration
- **Integration**: GitHub app + custom webhooks

**Setup**:
1. Install GitHub app in Slack workspace
2. Configure notifications for issues and PRs
3. Create dedicated channels per entity/feature

### 2. Discord (Free)
- **Cost**: Completely free
- **Features**: Voice, text, bot integration
- **Integration**: Discord webhooks + GitHub

**Webhook Example**:
```javascript
// Send notification when task is completed
const webhook = 'https://discord.com/api/webhooks/...';
fetch(webhook, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    content: `✅ Task completed: [AGENT-001] Connect Agent Implementation`
  })
});
```

### 3. Telegram Bot (Free)
- **Cost**: Free
- **Features**: Instant notifications, bot commands
- **Integration**: Telegram Bot API + GitHub webhooks

---

## 📈 Analytics & Reporting Integrations

### 1. Google Sheets (Free)
- **Cost**: Free with Google account
- **Features**: Spreadsheets, charts, automation
- **Integration**: Google Sheets API + Apps Script

**Data Export Script**:
```javascript
// Export GitHub issues to Google Sheets
function exportIssues() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const response = UrlFetchApp.fetch('https://api.github.com/repos/owner/repo/issues', {
    headers: { 'Authorization': 'token YOUR_TOKEN' }
  });
  const issues = JSON.parse(response.getContentText());
  
  issues.forEach((issue, index) => {
    sheet.getRange(index + 2, 1, 1, 4).setValues([[
      issue.number,
      issue.title,
      issue.state,
      issue.created_at
    ]]);
  });
}
```

### 2. Grafana (Free)
- **Cost**: Free self-hosted
- **Features**: Dashboards, metrics, alerting
- **Integration**: GitHub API + Prometheus metrics

### 3. Metabase (Free)
- **Cost**: Free open-source version
- **Features**: Business intelligence, SQL queries
- **Integration**: Database connections, API data

---

## 🔧 Development Tool Integrations

### 1. VS Code Extensions (Free)
- **GitHub Pull Requests and Issues**: Native GitHub integration
- **GitLens**: Enhanced Git capabilities
- **Markdown All in One**: Better markdown editing
- **Todo Tree**: Highlight TODO comments

### 2. JetBrains IDEs (Community Editions Free)
- **GitHub Integration**: Built-in GitHub support
- **Markdown Plugin**: Enhanced markdown editing
- **Task Management**: Built-in task tracking

### 3. Vim/Neovim Plugins (Free)
- **vim-fugitive**: Git integration
- **vim-github-dashboard**: GitHub dashboard in Vim
- **markdown-preview.nvim**: Live markdown preview

---

## 🚀 Quick Setup Scripts

### Environment Setup
```bash
#!/bin/bash
# setup-integrations.sh

echo "Setting up UT Tools Manager integrations..."

# Install required dependencies
npm install @octokit/rest

# Create environment file
cat > .env << EOF
GITHUB_TOKEN=your_github_token_here
GITHUB_OWNER=your_username
GITHUB_REPO=ut-tools-manager
TOGGL_API_TOKEN=your_toggl_token_here
CLOCKIFY_API_KEY=your_clockify_key_here
SLACK_WEBHOOK_URL=your_slack_webhook_here
EOF

echo "✅ Integration setup complete!"
echo "📝 Please update .env with your actual tokens"
```

### Daily Sync Script
```bash
#!/bin/bash
# daily-sync.sh

echo "🔄 Running daily sync..."

# Sync with GitHub
node scripts/sync-github.js --sync-all

# Generate reports (if configured)
# node scripts/generate-reports.js

echo "✅ Daily sync complete!"
```

---

## 📋 Integration Checklist

### Initial Setup
- [ ] GitHub token configured
- [ ] Labels created in GitHub
- [ ] Project board set up
- [ ] Sync script tested

### Time Tracking Setup
- [ ] Choose time tracking tool (Toggl/Clockify/WakaTime)
- [ ] Configure API access
- [ ] Test time entry creation
- [ ] Update task templates

### Project Management Setup
- [ ] Choose PM tool (GitHub Projects/Notion/Trello)
- [ ] Configure board/database structure
- [ ] Set up automation rules
- [ ] Test issue synchronization

### Communication Setup
- [ ] Choose communication tool (Slack/Discord/Telegram)
- [ ] Configure webhooks
- [ ] Test notifications
- [ ] Set up team channels

### Analytics Setup
- [ ] Choose analytics tool (Google Sheets/Grafana)
- [ ] Configure data export
- [ ] Create dashboard templates
- [ ] Schedule regular reports

---

## 🆘 Troubleshooting

### Common Issues

#### GitHub Sync Fails
```bash
# Check token permissions
curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user

# Verify repository access
curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/repos/OWNER/REPO
```

#### Time Tracking Not Working
- Verify API tokens are valid
- Check rate limits
- Ensure project/workspace exists
- Test with minimal API calls

#### Automation Not Triggering
- Check webhook URLs
- Verify event types
- Test with manual triggers
- Review logs and error messages

### Support Resources
- **GitHub API**: https://docs.github.com/en/rest
- **Toggl API**: https://developers.track.toggl.com/
- **Clockify API**: https://clockify.me/developers-api
- **Slack API**: https://api.slack.com/
- **Discord Webhooks**: https://discord.com/developers/docs/resources/webhook

---

*Last Updated*: 2024-01-01  
*Version*: 1.0