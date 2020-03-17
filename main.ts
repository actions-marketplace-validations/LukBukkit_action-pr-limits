import * as core from '@actions/core';
import * as github from '@actions/github';
import * as Webhooks from '@octokit/webhooks';

function getInputs(name: string): string[] {
    const input = core.getInput(name);

    if (!input) {
        return [];
    }

    return input
        .split('\n')
        .filter(str => str !== '')
        .map(str => str.toLowerCase());
}

function main(): void {
    if (github.context.eventName !== "pull_request") {
        core.warning(`This action should only run, when the event is a pull request, ` +
            `but it's a ${github.context.eventName}`);
        return;
    }

    const allowedBranches = getInputs('whitelist');
    const forbiddenBranches = getInputs('blacklist');
    handlePullRequest(allowedBranches, forbiddenBranches);
}

function handlePullRequest(allowedBranches: string[], forbiddenBranches: string[]): void {
    if (allowedBranches.length > 0 && forbiddenBranches.length > 0) {
        core.warning(
            "You should either specify a whitelist (allowedBranches) or a blacklist (forbiddenBranches). " +
            "Not both at the same time! The whitelist will be used in this case."
        );
    } else if (allowedBranches.length == 0 && forbiddenBranches.length == 0) {
        core.warning("Both the white- and the blacklist are empty.");
    }

    let pullRequest = github.context.payload as Webhooks.WebhookPayloadPullRequest;

    const baseRef = pullRequest.pull_request.base.ref.toLowerCase(); // source
    const headRef = pullRequest.pull_request.head.ref.toLowerCase(); // target

    core.info(`Pull request #${pullRequest.number}: ${baseRef} -> ${headRef}`);
    core.info(`Allowed Branches: ${JSON.stringify(allowedBranches)}`);
    core.info(`Forbidden Branches: ${JSON.stringify(forbiddenBranches)}`);

    const foundForbidden = forbiddenBranches.find(branch => branch === headRef);
    const foundAllowed = allowedBranches.find(branch => branch === headRef);

    if (allowedBranches.length > 0) {
        if (foundAllowed) {
            core.info(`The pull request is allowed. Branch '${baseRef}' has been found on the whitelist.`);
        } else {
            core.error(`The pull request is forbidden. Branch '${baseRef}' hasn't been found on the whitelist.`);
            core.setFailed(`Head branch '${baseRef}' hasn't been found on the whitelist for '${headRef}'.`);
        }
        return;
    }

    if (forbiddenBranches.length > 0) {
        if (foundForbidden) {
            core.error(`The pull request is forbidden. Branch '${baseRef}' has been found on the blacklist.`);
            core.setFailed(`Head branch '${baseRef}' has been found on the blacklist for '${headRef}'.`);
        } else {
            core.info(`The pull request is allowed. Branch '${baseRef}' hasn't been found on the blacklist.`);
        }
        return;
    }
}

main();
