const core = require("@actions/core");
const github = require("@actions/github");
const axios = require("axios");

class IssueNotificationAction {
  constructor() {
    this.octokit = github.getOctokit(process.env.GITHUB_TOKEN);
    this.context = github.context;

    // Get inputs
    this.slackWebhookUrl = core.getInput("slack_webhook_url");
    this.discordWebhookUrl = core.getInput("discord_webhook_url");
    this.titleKeywords = core
      .getInput("title_keywords")
      .split(",")
      .map((k) => k.trim())
      .filter((k) => k);
    this.requiredLabels = core
      .getInput("required_labels")
      .split(",")
      .map((l) => l.trim())
      .filter((l) => l);
    this.excludedLabels = core
      .getInput("excluded_labels")
      .split(",")
      .map((l) => l.trim())
      .filter((l) => l);
    this.reactionThreshold = parseInt(core.getInput("reaction_threshold")) || 5;
    this.commentThreshold = parseInt(core.getInput("comment_threshold")) || 3;
    this.messageTemplate = core.getInput("message_template");
    this.notifyOnCreate = core.getInput("notify_on_create") === "true";
    this.notifyOnThreshold = core.getInput("notify_on_threshold") === "true";
  }

  async run() {
    try {
      const eventName = this.context.eventName;
      const payload = this.context.payload;

      core.info(`Processing event: ${eventName}`);

      if (eventName === "issues") {
        await this.handleIssueEvent(payload);
      } else if (eventName === "issue_comment") {
        await this.handleIssueCommentEvent(payload);
      } else {
        core.info(`Event ${eventName} is not supported`);
      }
    } catch (error) {
      core.setFailed(`Action failed: ${error.message}`);
    }
  }

  async handleIssueEvent(payload) {
    const { action, issue } = payload;

    if (action === "opened" && this.notifyOnCreate) {
      if (this.shouldNotifyForIssue(issue)) {
        await this.sendNotification(issue, "created");
      }
    } else if (action === "edited" && this.notifyOnThreshold) {
      // Check if thresholds are met after edit
      const updatedIssue = await this.getIssueWithDetails(issue.number);
      if (this.shouldNotifyForThresholds(updatedIssue)) {
        await this.sendNotification(updatedIssue, "threshold_reached");
      }
    }
  }

  async handleIssueCommentEvent(payload) {
    if (!this.notifyOnThreshold) return;

    const { action, issue } = payload;

    if (action === "created") {
      // Check if comment threshold is now met
      const updatedIssue = await this.getIssueWithDetails(issue.number);
      if (this.shouldNotifyForThresholds(updatedIssue)) {
        await this.sendNotification(updatedIssue, "threshold_reached");
      }
    }
  }

  shouldNotifyForIssue(issue) {
    // Check title keywords
    if (this.titleKeywords.length > 0) {
      const titleLower = issue.title.toLowerCase();
      const hasKeyword = this.titleKeywords.some((keyword) =>
        titleLower.includes(keyword.toLowerCase())
      );
      if (!hasKeyword) {
        core.info(`Issue ${issue.number} does not contain required keywords`);
        return false;
      }
    }

    // Check required labels
    if (this.requiredLabels.length > 0) {
      const issueLabels = issue.labels.map((label) => label.name);
      const hasRequiredLabel = this.requiredLabels.some((label) =>
        issueLabels.includes(label)
      );
      if (!hasRequiredLabel) {
        core.info(`Issue ${issue.number} does not have required labels`);
        return false;
      }
    }

    // Check excluded labels
    if (this.excludedLabels.length > 0) {
      const issueLabels = issue.labels.map((label) => label.name);
      const hasExcludedLabel = this.excludedLabels.some((label) =>
        issueLabels.includes(label)
      );
      if (hasExcludedLabel) {
        core.info(`Issue ${issue.number} has excluded labels`);
        return false;
      }
    }

    return true;
  }

  shouldNotifyForThresholds(issue) {
    const reactionCount = issue.reactions?.total_count || 0;
    const commentCount = issue.comments || 0;

    const meetsReactionThreshold = reactionCount >= this.reactionThreshold;
    const meetsCommentThreshold = commentCount >= this.commentThreshold;

    core.info(
      `Issue ${issue.number}: ${reactionCount} reactions, ${commentCount} comments`
    );

    return meetsReactionThreshold || meetsCommentThreshold;
  }

  async getIssueWithDetails(issueNumber) {
    const { data: issue } = await this.octokit.rest.issues.get({
      owner: this.context.repo.owner,
      repo: this.context.repo.repo,
      issue_number: issueNumber,
    });
    return issue;
  }

  async sendNotification(issue, reason) {
    const message = this.formatMessage(issue, reason);

    core.info(`Sending notification for issue ${issue.number}: ${reason}`);

    if (this.slackWebhookUrl) {
      await this.sendSlackNotification(message);
    }

    if (this.discordWebhookUrl) {
      await this.sendDiscordNotification(message);
    }
  }

  formatMessage(issue, reason) {
    const reactionCount = issue.reactions?.total_count || 0;
    const commentCount = issue.comments || 0;

    let message = this.messageTemplate
      .replace("{title}", issue.title)
      .replace("{url}", issue.html_url)
      .replace("{author}", issue.user.login)
      .replace("{reactions}", reactionCount)
      .replace("{comments}", commentCount);

    if (reason === "created") {
      message = `🆕 New issue created!\n\n${message}`;
    } else if (reason === "threshold_reached") {
      message = `🚨 High-engagement issue detected!\n\n${message}`;
    }

    return message;
  }

  async sendSlackNotification(message) {
    try {
      const payload = {
        text: message,
        unfurl_links: false,
      };

      await axios.post(this.slackWebhookUrl, payload, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      core.info("Slack notification sent successfully");
    } catch (error) {
      core.error(`Failed to send Slack notification: ${error.message}`);
    }
  }

  async sendDiscordNotification(message) {
    try {
      const payload = {
        content: message,
      };

      await axios.post(this.discordWebhookUrl, payload, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      core.info("Discord notification sent successfully");
    } catch (error) {
      core.error(`Failed to send Discord notification: ${error.message}`);
    }
  }
}

// Export for testing
module.exports = { IssueNotificationAction };

// Run the action
const action = new IssueNotificationAction();
action.run();
