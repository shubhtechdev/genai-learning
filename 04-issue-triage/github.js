import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";
dotenv.config();

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const OWNER = process.env.GITHUB_OWNER;
const REPO = process.env.GITHUB_REPO;

export async function getIssue(issueNumber) {
    const { data } = await octokit.issues.get({
        owner: OWNER, repo: REPO,
        issue_number: issueNumber,
    });
    return {
        number: data.number,
        title: data.title,
        body: data.body,
        state: data.state,
        labels: data.labels.map((l) => l.name),
        created_at: data.created_at,
        user: data.user.login,
    };
}

export async function searchIssues(queryString) {
    // GitHub search: repo-scoped, returns issues + PRs
    const { data } = await octokit.search.issuesAndPullRequests({
        q: `${queryString} repo:${OWNER}/${REPO} is:issue`,
        per_page: 5,
    });
    return data.items.map((i) => ({
        number: i.number,
        title: i.title,
        state: i.state,
        labels: i.labels.map((l) => l.name),
        url: i.html_url,
    }));
}

export async function getLabels() {
    const { data } = await octokit.issues.listLabelsForRepo({
        owner: OWNER, repo: REPO, per_page: 50,
    });
    return data.map((l) => ({ name: l.name, description: l.description }));
}

export async function applyLabels(issueNumber, labels) {
    await octokit.issues.setLabels({
        owner: OWNER, repo: REPO,
        issue_number: issueNumber,
        labels,
    });
    return { success: true, labels_applied: labels };
}

export async function postComment(issueNumber, body) {
    const { data } = await octokit.issues.createComment({
        owner: OWNER, repo: REPO,
        issue_number: issueNumber,
        body,
    });
    return { success: true, comment_id: data.id };
}

export async function closeIssue(issueNumber, reason = "duplicate") {
    await octokit.issues.update({
        owner: OWNER, repo: REPO,
        issue_number: issueNumber,
        state: "closed",
        state_reason: reason,
    });
    return { success: true, closed: issueNumber };
}

export async function getContributors() {
    const { data } = await octokit.repos.listContributors({
        owner: OWNER, repo: REPO, per_page: 20,
    });
    return data.map((c) => ({ login: c.login, contributions: c.contributions }));
}