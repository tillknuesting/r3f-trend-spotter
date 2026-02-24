import { Octokit } from '@octokit/rest';

export class GitHubCommitter {
    private octokit: Octokit;

    constructor(token: string) {
        this.octokit = new Octokit({ auth: token });
    }

    async updateFile(owner: string, repo: string, path: string, content: string, message: string) {
        try {
            // 1. Get current file data (SHA)
            let sha: string | undefined;
            try {
                const { data } = await this.octokit.repos.getContent({
                    owner,
                    repo,
                    path,
                });
                if ('sha' in data) {
                    sha = data.sha;
                }
            } catch (e) {
                console.log(`File ${path} not found, creating new one.`);
            }

            // 2. Create or Update file
            await this.octokit.repos.createOrUpdateFileContents({
                owner,
                repo,
                path,
                message,
                content: btoa(String.fromCharCode(...new TextEncoder().encode(content))),
                sha,
            });

            console.log(`File ${path} updated successfully in ${owner}/${repo}`);
        } catch (e) {
            console.error(`Failed to update GitHub file:`, e);
            throw e;
        }
    }
}
