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
    this.newIssuePrefix = core.getInput("new_issue_prefix");
    this.thresholdPrefix = core.getInput("threshold_prefix");
    this.notifyOnCreate = core.getInput("notify_on_create") === "true";
    this.notifyOnThreshold = core.getInput("notify_on_threshold") === "true";

    // Batch checking configuration
    this.checkAllOpenIssues = core.getInput("check_all_open_issues") === "true";
    this.maxIssuesToCheck =
      parseInt(core.getInput("max_issues_to_check")) || 100;
    this.issueState = core.getInput("issue_state") || "open"; // open, closed, all
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
      } else if (eventName === "schedule" || this.checkAllOpenIssues) {
        await this.handleBatchCheckEvent();
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

  async handleBatchCheckEvent() {
    if (!this.notifyOnThreshold) {
      core.info("Batch checking disabled - notify_on_threshold is false");
      return;
    }

    core.info("Starting batch check for issues that meet thresholds...");

    try {
      const issues = await this.getAllIssues();
      core.info(`Found ${issues.length} issues to check`);

      let notifiedCount = 0;
      for (const issue of issues) {
        // Apply all filters (keywords, labels, excluded labels) AND thresholds
        if (
          this.shouldNotifyForIssue(issue) &&
          this.shouldNotifyForThresholds(issue)
        ) {
          await this.sendNotification(issue, "threshold_reached");
          notifiedCount++;
        }
      }

      core.info(
        `Batch check complete: ${notifiedCount} issues met thresholds and were notified`
      );
    } catch (error) {
      core.error(`Batch check failed: ${error.message}`);
    }
  }

  async getAllIssues() {
    const issues = [];
    let page = 1;
    const perPage = Math.min(100, this.maxIssuesToCheck);

    while (issues.length < this.maxIssuesToCheck) {
      try {
        const { data: pageIssues } = await this.octokit.rest.issues.listForRepo(
          {
            owner: this.context.repo.owner,
            repo: this.context.repo.repo,
            state: this.issueState,
            per_page: perPage,
            page: page,
            sort: "updated",
            direction: "desc",
          }
        );

        if (pageIssues.length === 0) {
          break; // No more issues
        }

        // Get full issue details including reactions
        for (const issue of pageIssues) {
          if (issues.length >= this.maxIssuesToCheck) {
            break;
          }

          const fullIssue = await this.getIssueWithDetails(issue.number);
          issues.push(fullIssue);
        }

        page++;
      } catch (error) {
        core.error(`Failed to fetch issues page ${page}: ${error.message}`);
        break;
      }
    }

    return issues;
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
    const repoName = `${this.context.repo.owner}/${this.context.repo.repo}`;
    const repoUrl = `https://github.com/${repoName}`;

    let message = this.messageTemplate
      .replace("{title}", issue.title)
      .replace("{url}", issue.html_url)
      .replace("{author}", issue.user.login)
      .replace("{reactions}", reactionCount)
      .replace("{comments}", commentCount)
      .replace("{repo}", repoName)
      .replace("{repo_url}", repoUrl)
      .replace("{repo_link}", `[${repoName}](${repoUrl})`);

    if (reason === "created") {
      const prefix = this.newIssuePrefix
        .replace("{repo}", repoName)
        .replace("{repo_url}", repoUrl)
        .replace("{repo_link}", `[${repoName}](${repoUrl})`);
      message = `${prefix}\n\n${message}`;
    } else if (reason === "threshold_reached") {
      const prefix = this.thresholdPrefix
        .replace("{repo}", repoName)
        .replace("{repo_url}", repoUrl)
        .replace("{repo_link}", `[${repoName}](${repoUrl})`);
      message = `${prefix}\n\n${message}`;
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
