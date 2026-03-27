import { execSync } from "child_process";

export function getCommits(repoPath = ".", count = 30) {
    try {
        const log = execSync(
            `git log --oneline -n ${count} --no-merges`,
            {
                cwd: repoPath,
                encoding: "utf8",
            }
        );

        return log
            .trim()
            .split("\n")
            .map((line) => line.replace(/^[a-f0-9]+ /, "").trim())
            .filter(Boolean)
            .join("\n");
    } catch (e) {
        throw new Error(`git log failed: ${e.message}`);
    }
}