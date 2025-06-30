const core = require("@actions/core");
const github = require("@actions/github");

// Mock the modules
jest.mock("@actions/core");
jest.mock("@actions/github");
jest.mock("axios");

describe("IssueNotificationAction", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Mock core.getInput
    core.getInput.mockImplementation((name) => {
      const inputs = {
        slack_webhook_url: "",
        discord_webhook_url: "",
        title_keywords: "",
        required_labels: "",
        excluded_labels: "",
        issues_only: "false",
        reaction_threshold: "5",
        comment_threshold: "3",
        message_template: "Test message {title}",
        notify_on_create: "true",
        notify_on_threshold: "true",
      };
      return inputs[name] || "";
    });

    // Mock github context
    github.context = {
      eventName: "issues",
      payload: {
        action: "opened",
        issue: {
          number: 1,
          title: "Test issue",
          user: { login: "testuser" },
          html_url: "https://github.com/test/repo/issues/1",
          labels: [],
          reactions: { total_count: 0 },
          comments: 0,
        },
      },
      repo: {
        owner: "test",
        repo: "repo",
      },
    };

    // Mock octokit
    github.getOctokit.mockReturnValue({
      rest: {
        issues: {
          get: jest.fn().mockResolvedValue({
            data: {
              number: 1,
              title: "Test issue",
              user: { login: "testuser" },
              html_url: "https://github.com/test/repo/issues/1",
              labels: [],
              reactions: { total_count: 0 },
              comments: 0,
            },
          }),
        },
      },
    });
  });

  test("should filter issues by title keywords", () => {
    core.getInput.mockImplementation((name) => {
      if (name === "title_keywords") return "urgent,security";
      return "";
    });

    const { IssueNotificationAction } = require("../index");
    const action = new IssueNotificationAction();

    const issue = {
      title: "This is an urgent security issue",
      labels: [],
      reactions: { total_count: 0 },
      comments: 0,
    };

    expect(action.shouldNotifyForIssue(issue)).toBe(true);
  });

  test("should not notify for issues without required keywords", () => {
    core.getInput.mockImplementation((name) => {
      if (name === "title_keywords") return "urgent,security";
      return "";
    });

    const { IssueNotificationAction } = require("../index");
    const action = new IssueNotificationAction();

    const issue = {
      title: "This is a regular feature request",
      labels: [],
      reactions: { total_count: 0 },
      comments: 0,
    };

    expect(action.shouldNotifyForIssue(issue)).toBe(false);
  });

  test("should check reaction thresholds", () => {
    const { IssueNotificationAction } = require("../index");
    const action = new IssueNotificationAction();

    const issue = {
      reactions: { total_count: 6 },
      comments: 2,
    };

    expect(action.shouldNotifyForThresholds(issue)).toBe(true);
  });

  test("should check comment thresholds", () => {
    const { IssueNotificationAction } = require("../index");
    const action = new IssueNotificationAction();

    const issue = {
      reactions: { total_count: 2 },
      comments: 5,
    };

    expect(action.shouldNotifyForThresholds(issue)).toBe(true);
  });

  test("should notify for regular issues when issues_only is false", () => {
    core.getInput.mockImplementation((name) => {
      if (name === "issues_only") return "false";
      return "";
    });

    const { IssueNotificationAction } = require("../index");
    const action = new IssueNotificationAction();

    const issue = {
      title: "Test issue",
      labels: [],
      reactions: { total_count: 20 },
      comments: 2,
    };

    expect(action.shouldNotifyForIssue(issue)).toBe(true);
  });

  test("should notify for pull requests when issues_only is false", () => {
    core.getInput.mockImplementation((name) => {
      if (name === "issues_only") return "false";
      return "";
    });

    const { IssueNotificationAction } = require("../index");
    const action = new IssueNotificationAction();

    const pullRequest = {
      title: "Test pull request",
      labels: [],
      reactions: { total_count: 20 },
      comments: 2,
      pull_request: {}, // This indicates it's a pull request
    };

    expect(action.shouldNotifyForIssue(pullRequest)).toBe(true);
  });

  test("should notify for regular issues when issues_only is true", () => {
    core.getInput.mockImplementation((name) => {
      if (name === "issues_only") return "true";
      return "";
    });

    const { IssueNotificationAction } = require("../index");
    const action = new IssueNotificationAction();

    const issue = {
      title: "Test issue",
      labels: [],
      reactions: { total_count: 20 },
      comments: 2,
    };

    expect(action.shouldNotifyForIssue(issue)).toBe(true);
  });

  test("should not notify for pull requests when issues_only is true", () => {
    core.getInput.mockImplementation((name) => {
      if (name === "issues_only") return "true";
      return "";
    });

    const { IssueNotificationAction } = require("../index");
    const action = new IssueNotificationAction();

    const pullRequest = {
      title: "Test pull request",
      labels: [],
      reactions: { total_count: 20 },
      comments: 20,
      pull_request: {}, // This indicates it's a pull request
    };

    expect(action.shouldNotifyForIssue(pullRequest)).toBe(false);
  });

  test("should not notify for acknowledged issues", () => {
    core.getInput.mockImplementation((name) => {
      if (name === "excluded_labels") return "acknowledged";
      return "";
    });

    const { IssueNotificationAction } = require("../index");
    const action = new IssueNotificationAction();

    const acknowledgedIssue = {
      title: "This is an urgent security issue",
      labels: [{ name: "acknowledged" }],
      reactions: { total_count: 10 },
      comments: 5,
    };

    expect(action.shouldNotifyForIssue(acknowledgedIssue)).toBe(false);
  });

  test("should notify for non-acknowledged issues", () => {
    core.getInput.mockImplementation((name) => {
      if (name === "excluded_labels") return "acknowledged";
      return "";
    });

    const { IssueNotificationAction } = require("../index");
    const action = new IssueNotificationAction();

    const regularIssue = {
      title: "This is an urgent security issue",
      labels: [{ name: "bug" }],
      reactions: { total_count: 10 },
      comments: 5,
    };

    expect(action.shouldNotifyForIssue(regularIssue)).toBe(true);
  });

  test("should not send notification for acknowledged issues on comment events", async () => {
    core.getInput.mockImplementation((name) => {
      if (name === "excluded_labels") return "acknowledged";
      if (name === "notify_on_threshold") return "true";
      return "";
    });

    const { IssueNotificationAction } = require("../index");
    const action = new IssueNotificationAction();

    // Mock the sendNotification method to track calls
    action.sendNotification = jest.fn();

    // Mock getIssueWithDetails to return an acknowledged issue
    action.getIssueWithDetails = jest.fn().mockResolvedValue({
      number: 1,
      title: "Test issue",
      labels: [{ name: "acknowledged" }],
      reactions: { total_count: 10 },
      comments: 5,
    });

    const payload = {
      action: "created",
      issue: { number: 1 },
    };

    await action.handleIssueCommentEvent(payload);

    // Should not call sendNotification because the issue is acknowledged
    expect(action.sendNotification).not.toHaveBeenCalled();
  });
});
