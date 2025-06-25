# Webhook Setup Guide

This guide will help you set up webhooks for Slack and Discord to receive notifications from the GitHub Action.

## Slack Webhook Setup

### Step 1: Create a Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App"
3. Choose "From scratch"
4. Enter an app name and select your workspace
5. Click "Create App"

### Step 2: Enable Incoming Webhooks

1. In your app settings, go to "Features" → "Incoming Webhooks"
2. Toggle "Activate Incoming Webhooks" to On
3. Click "Add New Webhook to Workspace"
4. Select the channel where you want to receive notifications
5. Click "Allow"
6. Copy the webhook URL (it will look like: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX`)

### Step 3: Add to Repository Secrets

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `SLACK_WEBHOOK_URL`
5. Value: Paste your webhook URL
6. Click "Add secret"

## Discord Webhook Setup

### Step 1: Create a Webhook

1. Go to your Discord server
2. Right-click on the channel where you want notifications
3. Select "Edit Channel"
4. Go to "Integrations" tab
5. Click "Webhooks"
6. Click "New Webhook"
7. Give it a name (e.g., "GitHub Issues")
8. Click "Copy Webhook URL"
9. Click "Save"

### Step 2: Add to Repository Secrets

1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `DISCORD_WEBHOOK_URL`
5. Value: Paste your webhook URL
6. Click "Add secret"

## Testing Your Webhooks

### Test Slack Webhook

```bash
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test message from GitHub Action"}' \
  YOUR_SLACK_WEBHOOK_URL
```

### Test Discord Webhook

```bash
curl -X POST -H 'Content-type: application/json' \
  --data '{"content":"Test message from GitHub Action"}' \
  YOUR_DISCORD_WEBHOOK_URL
```

## Security Best Practices

1. **Never commit webhook URLs to your repository**
2. **Use repository secrets** to store webhook URLs
3. **Rotate webhook URLs** periodically
4. **Limit webhook permissions** to only what's necessary
5. **Monitor webhook usage** for any suspicious activity

## Troubleshooting

### Common Issues

**Slack:**

- "Invalid webhook URL" - Check that the URL is correct and the webhook is active
- "Channel not found" - Make sure the webhook is configured for the correct channel
- "App not installed" - Ensure the Slack app is installed in your workspace

**Discord:**

- "Invalid webhook" - Verify the webhook URL is correct
- "Missing permissions" - Check that the webhook has permission to post in the channel
- "Rate limited" - Discord has rate limits; consider reducing notification frequency

### Debugging

1. Check the GitHub Actions logs for error messages
2. Verify webhook URLs are correctly set in repository secrets
3. Test webhooks manually using curl commands above
4. Ensure the action has the necessary permissions to read issues

## Advanced Configuration

### Custom Message Formatting

You can customize the notification messages using placeholders:

```yaml
- uses: your-username/github-action-issue-ack@v1
  with:
    slack_webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
    message_template: |
      🚨 Issue Alert!

      **{title}**
      Author: {author}
      Engagement: {reactions} reactions, {comments} comments
      Link: {url}
```

### Multiple Channels

To send to multiple channels, create separate webhooks and use multiple action steps:

```yaml
- name: Notify General Channel
  uses: your-username/github-action-issue-ack@v1
  with:
    slack_webhook_url: ${{ secrets.SLACK_GENERAL_WEBHOOK }}
    title_keywords: "urgent,security"

- name: Notify Dev Channel
  uses: your-username/github-action-issue-ack@v1
  with:
    slack_webhook_url: ${{ secrets.SLACK_DEV_WEBHOOK }}
    required_labels: "bug,enhancement"
```
