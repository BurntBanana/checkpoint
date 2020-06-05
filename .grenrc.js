var fs = require('fs');

module.exports = {
    "dataSource": "commits",
    "ignoreIssuesWith": [
        "wontfix",
        "duplicate"
    ],
    "override": true,
    "generate": true,
    "includeMessages": "all",
    "template": {
        commit: ({ message, url, author, name }) => `- **${message}** - [${url.substring(url.lastIndexOf('/') + 1)}](${url}) - ${author ? `[${author}](https://github.com/${author})` : name}`,
        issue: "- {{labels}} {{name}} [{{text}}]({{url}})",
        label: "[**{{label}}**]",   
        noLabel: "closed",
        group: "\n#### {{heading}}\n",
        changelogTitle: "",
        release: fs.readFileSync('release_summary.md') + "\n\n## Changes:\n{{body}}",
        releaseSeparator: "\n---\n\n"
    }
}
