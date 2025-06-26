# GitHub Action Issue Notifications

A GitHub Action that automatically posts notifications to Slack or Discord channels when GitHub issues meet certain criteria.

## Features

- **New Issue Notifications**: Get notified when new issues are created with specific keywords or labels
- **Engagement Thresholds**: Receive alerts when issues reach certain reaction or comment counts
- **Batch Checking**: Periodically check all open issues for thresholds (perfect for reactions!)
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
  # Optional: Add batch checking for reactions
  schedule:
    - cron: "0 * * * *" # Every hour

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
          excluded_labels: "acknowledged"
          reaction_threshold: "5"
          comment_threshold: "3"
          # Enable batch checking for reactions
          check_all_open_issues: "true"
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

| Input              | Description                               | Required | Default                                           |
| ------------------ | ----------------------------------------- | -------- | ------------------------------------------------- |
| `message_template` | Custom message template with placeholders | No       | See below                                         |
| `new_issue_prefix` | Prefix for new issue notifications        | No       | 🆕 New issue created on {repo_link}!              |
| `threshold_prefix` | Prefix for threshold notifications        | No       | 🚨 High-engagement issue detected on {repo_link}! |

### Notification Settings

| Input                 | Description                                 | Required | Default |
| --------------------- | ------------------------------------------- | -------- | ------- |
| `notify_on_create`    | Send notification when new issue is created | No       | true    |
| `notify_on_threshold` | Send notification when thresholds are met   | No       | true    |

### Batch Checking Configuration

| Input                   | Description                                               | Required | Default |
| ----------------------- | --------------------------------------------------------- | -------- | ------- |
| `check_all_open_issues` | Check all open issues for thresholds when action runs     | No       | false   |
| `max_issues_to_check`   | Maximum number of issues to check during batch processing | No       | 100     |
| `issue_state`           | Which issues to check (open, closed, all)                 | No       | open    |

## Message Template Placeholders

You can customize the notification message using these placeholders:

- `{title}` - Issue title
- `{url}` - Issue URL
- `{author}` - Issue author username
- `{reactions}` - Number of reactions
- `{comments}` - Number of comments
- `{repo}` - Repository name (owner/repo)
- `{repo_name}` - Repository name only (without owner)
- `{repo_url}` - Repository URL
- `{repo_link}` - Repository name as hyperlink [repo](url)
- `{created_minutes_ago}` - Minutes since issue was created
- `{created_hours_ago}` - Hours since issue was created
- `{created_days_ago}` - Days since issue was created
- `{created_at}` - Original creation timestamp
- `{created_ago}` - Smart time format (e.g., "2 hours ago", "3 days ago")

### Default Message Template

```
🚨 High-engagement issue detected!

**{title}**
By: {author}
Reactions: {reactions} | Comments: {comments}
Repository: {repo_link}
Created: {created_hours_ago} hours ago
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

### Batch Checking for Reactions

Since reactions don't trigger GitHub events, use batch checking to catch them:

```yaml
name: Issue Notifications with Batch Checking

on:
  issues:
    types: [opened, edited]
  issue_comment:
    types: [created]
  schedule:
    - cron: "0 * * * *" # Every hour

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Issue Notification Action
        uses: your-username/github-action-issue-ack@v1
        with:
          slack_webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
          title_keywords: "urgent,security"
          reaction_threshold: "5"
          comment_threshold: "3"
          check_all_open_issues: "true"
          max_issues_to_check: "50"
```

### Batch Checking Only

Check all open issues periodically without real-time events:

```yaml
name: Batch Check Only

on:
  schedule:
    - cron: "*/30 * * * *" # Every 30 minutes

jobs:
  check-issues:
    runs-on: ubuntu-latest
    steps:
      - name: Issue Notification Action
        uses: your-username/github-action-issue-ack@v1
        with:
          slack_webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
          notify_on_create: "false"
          notify_on_threshold: "true"
          check_all_open_issues: "true"
          reaction_threshold: "3"
          comment_threshold: "2"
```

### Custom Message Formatting

You can customize the notification messages using placeholders:

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
      Age: {created_days_ago} days, {created_hours_ago} hours old
      {url}
    new_issue_prefix: "🆕 New bug reported on {repo_link}!"
    threshold_prefix: "🚨 High-engagement bug on {repo_link}!"
```

### Time-Based Examples

```yaml
# Show age in different formats
message_template: |
  **{title}**
  Created: {created_minutes_ago} minutes ago
  Age: {created_hours_ago} hours, {created_days_ago} days
  {url}

# Only show if issue is older than 1 hour
message_template: |
  **{title}** ({created_hours_ago}h old)
  {url}
```

## Events Handled

The action responds to these GitHub events:

- **`issues.opened`**: New issue created
- **`issues.edited`**: Issue edited (checks thresholds)
- **`issue_comment.created`**: New comment added (checks thresholds)
- **`schedule`**: Periodic batch checking (when enabled)

## Why Batch Checking?

GitHub doesn't provide webhook events for:

- **Reactions added/removed** - No webhook events
- **Reaction count changes** - No real-time notifications

The batch checking feature solves this by:

- ✅ **Checking all open issues** periodically
- ✅ **Catching reaction thresholds** that would otherwise be missed
- ✅ **Configurable intervals** (every 30 minutes, hour, etc.)
- ✅ **Efficient pagination** to handle large repositories

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
