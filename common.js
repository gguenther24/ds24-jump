const Identifier = class {
    constructor(githubPrId = 0, jiraTicket = '', branchName = '', name = '') {
        this.githubPrId = githubPrId;
        this.branchName = branchName
        this.jiraTicket = jiraTicket;
        this.name = name;
    }
}

String.prototype.firstMatch = function(regexp, alt = '') {
    let matchResult = this.match(regexp);
    return matchResult[1] || alt;
}

const identifierFactory = {
    _queryBranchListing: function (branchQuery) {
        return fetch('https://github.com/hulkag/ds24-digistore/branches/all?query=' + branchQuery).then(r => r.text()).then(result => {
            const dom = document.createElement("body");
            dom.innerHTML = result;
            let branchRow = dom.querySelector('branch-filter-item[branch]');
            let branchName, githubPrId, jiraTicket, name;
            if (branchRow) {
                branchName = branchRow.getAttribute('branch');
                name = branchRow.querySelector('.branch-name').textContent;
                githubPrId = branchRow.querySelector('[data-hovercard-url^="/hulkag/ds24-digistore/pull/"]').dataset.hovercardUrl.matchfirstMatch(/pull\/(\d+)/);
                jiraTicket = branchName.firstMatch(/(DS-\d+)/).toUpperCase();
            } else {
                name = branchQuery;
                if (branchQuery.match(/^DS-\d+$/i)) {
                    jiraTicket = branchQuery;
                }
            }
            return new Identifier(githubPrId, jiraTicket, branchName, name);
        });
    },
    fromJiraTicket: function (jiraTicket) {
        return this._queryBranchListing(jiraTicket);
    },
    fromBranchName: function (branchName) {
        return this._queryBranchListing(branchName);
    },
    fromGithubPrId: function (githubPrId) {
        console.log(githubPrId);
        return fetch(`https://github.com/hulkag/ds24-digistore/pull/${githubPrId}`).then(r => r.text()).then(result => {
            const dom = document.createElement("body");
            dom.innerHTML = result;
            let branchName, jiraTicket, name;
            name = dom.querySelector('h1.gh-header-title > span:first-child').textContent.trim();
            jiraTicket = name.match(/DS[- _]\d{2,4}/);
            branchName = dom.querySelector('.gh-header-meta span.head-ref > a > span').textContent.trim();
            return new Identifier(githubPrId, jiraTicket, branchName, name);
        });
    },
    empty: function () {
        return new Identifier();
    }
}

export function getDefaultOptions() {
    let queryJumpIds = {};
    for (let jumpTarget of JUMP_TARGETS) {
        queryJumpIds[jumpTarget.id] = jumpTarget.activated;
    }
    queryJumpIds['default_jumps'] = JSON.stringify(DEFAULT_JUMPS, null, 2);
    return queryJumpIds;
}

export const JUMP_TARGETS = [
    {
        name: 'Jira Ticket',
        description: 'Jump to the associated Jira Ticket',
        id: 'jira',
        icon: 'assets/icon-jira.png',
        bypassPing: false,
        activated: true,
        matchesCurrentTab: function (tab) {
            return tab.url.startsWith('https://digistore.atlassian.net/browse/');
        },
        getIdentifier: function (tab) {
            const ticketNo = tab.url.firstMatch(/\/browse\/(DS-\d+)/);
            return identifierFactory.fromJiraTicket(ticketNo);
        },
        createUrl: function (identifier) {
            return {
                primary: {
                    link: `https://digistore.atlassian.net/browse/${identifier.jiraTicket}`,
                    label: this.name
                }
            }
        }
    },
    {
        name: 'GitHub PR',
        description: 'Jump to the GitHub Pull Request',
        id: 'github_pr',
        icon: 'assets/icon-merge.png',
        bypassPing: false,
        activated: true,
        matchesCurrentTab: function (tab) {
            return tab.url.startsWith('https://github.com/hulkag/ds24-digistore/pull/');
        },
        getIdentifier: function (tab) {
            const prId = tab.url.firstMatch(/pull\/(\d+)/);
            return identifierFactory.fromGithubPrId(prId);
        },
        createUrl: function (identifier) {
            return {
                primary: {
                    link: identifier.githubPrId ? `https://github.com/hulkag/ds24-digistore/pull/${identifier.githubPrId}` : null,
                    label: this.name
                }
            }
        }
    },
    {
        name: 'GitHub Branch',
        description: 'Jump to the GitHub Branch',
        id: 'github_branch',
        icon: 'assets/icon-branch.png',
        bypassPing: false,
        activated: true,
        matchesCurrentTab: function (tab) {
            return tab.url.startsWith('https://github.com/hulkag/ds24-digistore/tree/') && tab.url.includes('DS-');
        },
        getIdentifier: function (tab) {
            const branchName = tab.url.firstMatch(/ds24-digistore\/tree\/([A-z0-9-_]+)/i);
            return identifierFactory.fromBranchName(branchName);
        },
        createUrl: function (identifier) {
            return {
                primary: {
                    link: `https://github.com/hulkag/ds24-digistore/tree/${identifier.branchName}`,
                    label: this.name
                }
            }
        }
    },
    {
        name: 'GitHub Find',
        description: 'Find Branches and Pull Requests associated with current item',
        id: 'github_find',
        icon: 'assets/icon-github.png',
        bypassPing: true,
        activated: false,
        matchesCurrentTab: function (tab) {
            return false;
        },
        getIdentifier: function (tab) {
            return identifierFactory.empty();
        },
        createUrl: function (identifier) {
            return {
                primary: {
                    link: `https://github.com/hulkag/ds24-digistore/branches/all?query=${identifier.jiraTicket}`,
                    label: 'Find Branches'
                },
                secondary: {
                    link: `https://github.com/hulkag/ds24-digistore/pulls?q=${identifier.jiraTicket}+in%3Atitle`,
                    label: 'Find PRs'
                }
            };
        }
    },
    {
        name: 'GitHub Workflows',
        description: 'Open Github Workflows (Actions) running for current item',
        id: 'github_actions',
        icon: 'assets/icon-workflow.png',
        bypassPing: true,
        activated: true,
        matchesCurrentTab: function (tab) {
            return tab.url.startsWith('https://github.com/hulkag/ds24-digistore/actions') && tab.url.includes('branch%3A');
        },
        getIdentifier: function (tab) {
            const branch = tab.url.match(/DS-\d+/i);
            return branch ? identifierFactory.fromBranchName(branch) : identifierFactory.empty();
        },
        createUrl: function (identifier) {
            return {
                primary: {
                    link: identifier.branchName ? `https://github.com/hulkag/ds24-digistore/actions?query=${encodeURIComponent('event:pull_request branch:' + identifier.branchName)}` : null,
                    label: 'Workflows'
                }
            };
        }
    },
    {
        name: 'DynEnv',
        description: 'Visit the Dynamic Environment',
        id: 'dynenv',
        icon: 'assets/icon-dynenv.png',
        bypassPing: false,
        activated: true,
        matchesCurrentTab: function (tab) {
            return tab.url.startsWith('https://digistore24-app-ds-review-');
        },
        getIdentifier: function (tab) {
            const prId = tab.url.firstMatch(/digistore24-app-ds-review-(\d+)\./);
            return identifierFactory.fromGithubPrId(prId);
        },
        createUrl: function (identifier) {
            return {
                primary: {
                    link: `https://digistore24-app-ds-review-${identifier.githubPrId}.dev.ds25.io`,
                    label: this.name
                }
            };
        }
    },
    {
        name: 'Sonarcloud',
        description: 'Jump to Sonarcloud overview',
        id: 'sonarcloud',
        icon: 'assets/icon-sonarcloud.png',
        bypassPing: true,
        activated: false,
        matchesCurrentTab: function (tab) {
            return tab.url.startsWith('https://sonarcloud.io/') && tab.url.includes('pullRequest=');
        },
        getIdentifier: function (tab) {
            const prId = tab.url.firstMatch(/pullRequest=(\d+)/);
            return identifierFactory.fromGithubPrId(prId);
        },
        createUrl: function (identifier) {
            return {
                primary: {
                    link: identifier.githubPrId ? `https://sonarcloud.io/summary/new_code?id=ds24-symfony&pullRequest=${identifier.githubPrId}` : null,
                    label: this.name
                }
            };
        }
    },
    {
        name: 'Elastic APM',
        description: 'Jump to Elastic APM Dashboard',
        id: 'elastic_apm',
        icon: 'assets/icon-apm.png',
        bypassPing: true,
        activated: true,
        matchesCurrentTab: function (tab) {
            return tab.url.startsWith('https://hulk-observability-staging.kb.europe-west1.gcp.cloud.es.io:9243/app/apm') && tab.url.includes('environment=review-');
        },
        getIdentifier: function (tab) {
            const prId = tab.url.firstMatch(/environment=review-(\d+)/);
            return identifierFactory.fromGithubPrId(prId);
        },
        createUrl: function (identifier) {
            return {
                primary: {
                    link: identifier.githubPrId
                        ? `https://hulk-observability-staging.kb.europe-west1.gcp.cloud.es.io:9243/app/apm/services?rangeFrom=now-15m&rangeTo=now&comparisonEnabled=true&comparisonType=day&environment=review-${identifier.githubPrId}-ds`
                        : null,
                    label: this.name
                }
            };
        }
    },
    {
        name: 'GMail',
        description: 'Find Emails containing the Jira Ticket Number or Pull Request ID',
        id: 'gmail',
        icon: 'assets/icon-gmail.png',
        bypassPing: true,
        activated: false,
        matchesCurrentTab: function (tab) {
            return tab.url.startsWith('https://mail.google.com/');
        },
        getIdentifier: function (tab) {
            const ticketNo = tab.title.firstMatch(/ (DS-\d+)/);
            return identifierFactory.fromJiraTicket(ticketNo);
        },
        createUrl: function (identifier) {

            let url = identifier.jiraTicket
                ? {
                    link: `https://mail.google.com/mail/#search/${identifier.jiraTicket}`,
                    label: identifier.jiraTicket
                } : {
                    link: identifier.githubPrId ? `https://mail.google.com/mail/#search/${encodeURIComponent('#' + identifier.githubPrId)}` : null,
                    label: '#' + identifier.githubPrId
                }

            return { primary: url };
        }
    }
];

export const DEFAULT_JUMPS = [
    [
        [
            "Jira",
            "https://digistore.atlassian.net/jira/software/c/projects/DS/issues"
        ],
        [
            "Open Issues",
            "https://digistore.atlassian.net/jira/software/c/projects/DS/issues/?filter=myopenissues"
        ]
    ],
    [
        [
            "DS24 Github",
            "https://github.com/hulkag/ds24-digistore"
        ]
    ],
    [
        [
            "My Pull Requests",
            "https://github.com/hulkag/ds24-digistore/pulls/@me"
        ]
    ],
    [
        [
            "Scrum Dashboard",
            "https://digistore.atlassian.net/jira/dashboards/10540"
        ]
    ],
    [
        [
            "Google Cloud",
            "https://console.cloud.google.com/home/dashboard?project=ds-dev-228617"
        ]
    ]
];