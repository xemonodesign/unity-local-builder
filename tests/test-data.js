export const mockPullRequest = {
  number: 42,
  title: "テスト用のPR",
  html_url: "https://github.com/testuser/testrepo/pull/42",
  user: {
    login: "testuser"
  },
  head: {
    ref: "feature/test-branch",
    repo: {
      clone_url: "https://github.com/testuser/testrepo.git"
    }
  },
  base: {
    repo: {
      full_name: "testuser/testrepo"
    }
  }
};

export const mockWebhookPayload = {
  action: "opened",
  pull_request: mockPullRequest
};