# GitHub Action Issue Notifications

A GitHub Action that automatically posts notifications to Slack or Discord channels when GitHub issues meet certain criteria.

## Features

- **New Issue Notifications**: Get notified when new issues are created with specific keywords or labels
- **Engagement Thresholds**: Receive alerts when issues reach certain reaction or comment counts
- **Flexible Filtering**: Filter issues by title keywords, required labels, or excluded labels
- **Multi-Platform Support**: Send notifications to both Slack and Discord
- **Customizable Messages**: Use custom message templates with placeholders

## Quick Start

### 1. Set up Webhooks

#### Slack Webhook

1. Go to your Slack workspace
2. Create a new app or use an existing one
3. Enable "Incoming Webhooks"
4. Create a webhook for your desired channel
5. Copy the webhook URL

#### Discord Webhook

1. Go to your Discord server
2. Edit a channel → Integrations → Webhooks
3. Create a new webhook
4. Copy the webhook URL

### 2. Add Secrets to Your Repository

Go to your repository → Settings → Secrets and variables → Actions, and add:

- `SLACK_WEBHOOK_URL` (your Slack webhook URL)
- `DISCORD_WEBHOOK_URL` (your Discord webhook URL)

### 3. Create Workflow File

Create `.github/workflows/issue-notifications.yml`:

```yaml
name: Issue Notifications

on:
  issues:
    types: [opened, edited]
  issue_comment:
    types: [created]

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Issue Notification Action
        uses: your-username/github-action-issue-ack@v1
        with:
          slack_webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
          discord_webhook_url: ${{ secrets.DISCORD_WEBHOOK_URL }}
          title_keywords: "urgent,security,bug"
          required_labels: "high-priority"
          reaction_threshold: "5"
          comment_threshold: "3"
```

## Configuration Options

### Webhook Configuration

| Input                 | Description         | Required | Default |
| --------------------- | ------------------- | -------- | ------- |
| `slack_webhook_url`   | Slack webhook URL   | No       | -       |
| `discord_webhook_url` | Discord webhook URL | No       | -       |

### Issue Filters

| Input             | Description                                          | Required | Default |
| ----------------- | ---------------------------------------------------- | -------- | ------- |
| `title_keywords`  | Comma-separated keywords to filter issues by title   | No       | -       |
| `required_labels` | Comma-separated labels that must be present          | No       | -       |
| `excluded_labels` | Comma-separated labels that should exclude the issue | No       | -       |

### Thresholds

| Input                | Description                               | Required | Default |
| -------------------- | ----------------------------------------- | -------- | ------- |
| `reaction_threshold` | Minimum reactions to trigger notification | No       | 5       |
| `comment_threshold`  | Minimum comments to trigger notification  | No       | 3       |

### Message Customization

| Input              | Description                               | Required | Default   |
| ------------------ | ----------------------------------------- | -------- | --------- |
| `message_template` | Custom message template with placeholders | No       | See below |

### Notification Settings

| Input                 | Description                                 | Required | Default |
| --------------------- | ------------------------------------------- | -------- | ------- |
| `notify_on_create`    | Send notification when new issue is created | No       | true    |
| `notify_on_threshold` | Send notification when thresholds are met   | No       | true    |

## Message Template Placeholders

You can customize the notification message using these placeholders:

- `{title}` - Issue title
- `{url}` - Issue URL
- `{author}` - Issue author username
- `{reactions}` - Number of reactions
- `{comments}` - Number of comments

### Default Message Template

```
🚨 High-engagement issue detected!

**{title}**
By: {author}
Reactions: {reactions} | Comments: {comments}
{url}
```

## Examples

### Basic Usage

Notify on urgent issues with 3+ reactions:

```yaml
- uses: your-username/github-action-issue-ack@v1
  with:
    slack_webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
    title_keywords: "urgent,security"
    reaction_threshold: "3"
```

### Advanced Filtering

Notify on high-priority bugs with custom message:

```yaml
- uses: your-username/github-action-issue-ack@v1
  with:
    slack_webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
    title_keywords: "bug,crash,error"
    required_labels: "high-priority,needs-attention"
    excluded_labels: "wontfix,duplicate"
    message_template: |
      🐛 Bug Alert!

      **{title}**
      Reported by: {author}
      Engagement: {reactions} reactions, {comments} comments
      {url}
```

### Discord Only

Send notifications only to Discord:

```yaml
- uses: your-username/github-action-issue-ack@v1
  with:
    discord_webhook_url: ${{ secrets.DISCORD_WEBHOOK_URL }}
    title_keywords: "urgent"
    reaction_threshold: "5"
```

## Events Handled

The action responds to these GitHub events:

- **`issues.opened`**: New issue created
- **`issues.edited`**: Issue edited (checks thresholds)
- **`issue_comment.created`**: New comment added (checks thresholds)

## Development

### Building the Action

```bash
npm install
npm run build
```

### Testing

```bash
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.
