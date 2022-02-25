const Contexts = [
  {
    'projectKey': 'DS',
    'repo': 'hulkag/ds24-digistore',
    'dynPrefix': 'digistore24-app-ds',
    'stackdriverSuffix': 'ds',
    'sonarIds': {
      'symfony': 'ds24-symfony',
      'codeigniter': 'ds24-legacy'
    }
  },
  {
    'projectKey': 'OCB',
    'repo': 'hulkag/cch-platform',
    'dynPrefix': 'cch',
    'stackdriverSuffix': 'cch',
    'sonarIds': {
      'backend': 'cch-frontend',
      'frontend': 'cch-backend'
    }
  },
  {
    'projectKey': 'PGB',
    'repo': 'hulkag/cch-pagebuilder',
    'dynPrefix': 'pgb',
    'stackdriverSuffix': 'pgb',
    'sonarIds': {
      'pgb': 'cch-pagebuilder'
    }
  },
  {
    'projectKey': 'DD',
    'repo': 'hulkag/dd-ui',
    'dynPrefix': 'dd',
    'stackdriverSuffix': 'dd',
    'sonarIds': {}
  }
]

const Identifier = class {
    constructor(githubPrId = 0, jiraTicket = '', branchName = '', name = '', context = Contexts[0]) {
        this.githubPrId = githubPrId;
        this.branchName = branchName
        this.jiraTicket = jiraTicket;
        this.name = name;
        this.context = context;
    }
}

String.prototype.firstMatch = function(regexp, alt = '') {
    let matchResult = this.match(regexp);
    console.log(regexp, matchResult, this);
    return (matchResult ? matchResult[1] : alt);
}

const identifierFactory = {
    queryBranchListing: function (branchQuery, context = Contexts[0]) {
        return fetch(`https://github.com/${context.repo}/branches/all?query=${branchQuery}`).then(r => r.text()).then(result => {
            const dom = document.createElement("body");
            dom.innerHTML = result;
            let branchRow = dom.querySelector('branch-filter-item[branch]');
            let branchName, githubPrId, jiraTicket, name;
            if (branchRow) {
                branchName = branchRow.getAttribute('branch');
                name = branchRow.querySelector('.branch-name').textContent;
                githubPrId = branchRow.querySelector('[data-hovercard-url^="/'+context.repo+'/pull/"]').dataset.hovercardUrl.firstMatch(/pull\/(\d+)/);
                jiraTicket = branchName.firstMatch(/(\S{2,3}-\d{2,5})/).toUpperCase();
            } else {
                name = branchQuery;
                if (branchQuery.match(/^\S{2,3}-\d{2,5}$/i)) {
                    jiraTicket = branchQuery;
                }
            }
            return new Identifier(githubPrId, jiraTicket, branchName, name, context);
        });
    },
    fromGithubPrId: function (githubPrId, context = Contexts[0]) {
        console.log(githubPrId, context);
        return fetch(`https://github.com/${context.repo}/pull/${githubPrId}`).then(r => r.text()).then(result => {
            const dom = document.createElement("body");
            dom.innerHTML = result;
            let branchName, jiraTicket, name;
            name = dom.querySelector('h1.gh-header-title > span:first-child').textContent.trim();
            jiraTicket = name.firstMatch(/(\S{2,3}[- _]\d{2,5})/).replace(/_| /i,'-');
            branchName = dom.querySelector('.gh-header-meta span.head-ref > a > span').textContent.trim();
            return new Identifier(githubPrId, jiraTicket, branchName, name, context);
        });
    },
    getContextFromKeyInDict: function (key, value) {
        const context = Contexts.find((context) => {
            for (let index in context[key]) {
                if (context[key][index] === value) {
                    return true;
                }
            }
            return false;
        });
        return context;
    },
    getContextFromKey: function (key, value) {
        const context = Contexts.find((context) => {
            return context[key] === value;
        });
        return context;
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
            let ticketNo = tab.url.firstMatch(/\/browse\/(\S{2,3}-\d{2,5})/i);
            if (ticketNo) {
                const projetKey = ticketNo.split('-')[0];
                let context = identifierFactory.getContextFromKey('projectKey', projetKey);
                if (context) {
                    return identifierFactory.queryBranchListing(ticketNo, context);
                }
            }
            return null;
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
            let regex = new RegExp('^https://github.com/hulkag/[^/]+/pull/');
            return !!tab.url.match(regex);
        },
        getIdentifier: function (tab) {
            let match = tab.url.match(/github.com\/([^/]+\/[^/]+)\/pull\/(\d+)/i);
            console.log(match);
            let context = identifierFactory.getContextFromKey('repo', match[1]);
            if (context) {
                return identifierFactory.fromGithubPrId(match[2], context);
            }
            return null;
        },
        createUrl: function (identifier) {
            return {
                primary: {
                    link: identifier.githubPrId ? `https://github.com/${identifier.context.repo}/pull/${identifier.githubPrId}` : null,
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
            let regex = new RegExp('^https://github.com/hulkag/[^/]+/tree/\S{2,3}-\d{2,5}');
            return !!tab.url.match(regex);
        },
        getIdentifier: function (tab) {
            let match = tab.url.match(/github.com\/([^/]+\/[^/]+)\/pull\/(\d+)/i);
            console.log(match);
            let context = identifierFactory.getContextFromKey('repo', match[1]);
            if (context) {
                return identifierFactory.queryBranchListing(match[2], context);
            }
            return null;
        },
        createUrl: function (identifier) {
            return {
                primary: {
                    link: `https://github.com/${identifier.context.repo}/tree/${identifier.branchName}`,
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
        activated: true,
        matchesCurrentTab: function (tab) {
            return false;
        },
        getIdentifier: function (tab) {
            return null;
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
            let regex = new RegExp('^https://github.com/hulkag/[^/]+/actions');
            return !!tab.url.match(regex) && tab.url.includes('branch%3A');
        },
        getIdentifier: function (tab) {
            let repo = tab.url.firstMatch(/github.com\/([^/]+\/[^/]+)\//i)
            let branch = tab.url.match(/\S{2,3}-\d{2,5}/i);

            let context = identifierFactory.getContextFromKey('repo', repo);
            return branch ? identifierFactory.queryBranchListing(branch, context) : null;
        },
        createUrl: function (identifier) {
            return {
                primary: {
                    link: identifier.branchName ? `https://github.com/${identifier.context.repo}/actions?query=${encodeURIComponent('event:pull_request branch:' + identifier.branchName)}` : null,
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
            let regex = new RegExp('\\S+.dev.ds25.io');
            return !!tab.url.match(regex);
        },
        getIdentifier: function (tab) {
            let match = tab.url.firstMatch(/([^.^\/]+).dev.ds25.io/i);
            console.log(match);
            let context = null;
            let prId = null;
            if (match.includes('-dd')) {
                context = identifierFactory.getContextFromKey('dynPrefix', 'dd');
                prId = tab.url.firstMatch(/review-(\S+)-dd.dev.ds25.io/i);
            } else {
                let match = tab.url.match(/([^.^\/]+)-review-(\S+).dev.ds25.io/i);
                console.log(match);
                context = identifierFactory.getContextFromKey('dynPrefix', match[1]);
                prId = match[2];
            }
            if (context) {
                console.log(prId);
                if (context.dynPrefix === 'pgb') {
                    return identifierFactory.queryBranchListing(prId, context);
                } else {
                    return identifierFactory.fromGithubPrId(prId, context);
                }
            }
            return null;
        },
        createUrl: function (identifier) {
            if (identifier.context.projectKey === 'PGB') {
                return {
                    primary: {
                        link: `https://${identifier.context.dynPrefix}-review-${identifier.branchName}.dev.ds25.io`,
                        label: this.name
                    }
                };
            } else if (identifier.context.projectKey === 'DD') {
                return {
                    primary: {
                        link: `https://review-${identifier.githubPrId}-${identifier.context.dynPrefix}.dev.ds25.io`,
                        label: this.name
                    }
                };
            } else {
                return {
                    primary: {
                        link: `https://${identifier.context.dynPrefix}-review-${identifier.githubPrId}.dev.ds25.io`,
                        label: this.name
                    }
                };
            }
        }
    },
    {
        name: 'Stackdriver Logs',
        description: 'Jump to the associated Stackdriver Logs',
        id: 'cloudwatch',
        icon: 'assets/icon-stackdriver.png',
        bypassPing: true,
        activated: true,
        matchesCurrentTab: function (tab) {
            return tab.url.startsWith('https://console.cloud.google.com') && !!tab.url.match(/review-\S+/)
        },
        getIdentifier: function (tab) {
            let match = tab.url.match(/resource.labels.namespace_name%3D%22review-(\d+)-(\S+)%22/i);
            console.log(match);
            let context = identifierFactory.getContextFromKey('stackdriverSuffix', match[2]);
            if (context) {
                return identifierFactory.fromGithubPrId(match[1], context);
            }
            return null;
        },
        createUrl: function (identifier) {
            return {
                primary: {
                    link: `https://console.cloud.google.com/logs/query;query=resource.type%3D%22k8s_container%22%0Aresource.labels.project_id%3D%22ds-dev-228617%22%0Aresource.labels.namespace_name%3D%22review-${identifier.githubPrId}-${identifier.context.stackdriverSuffix}%22?project=ds-dev-228617`,
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
        activated: true,
        matchesCurrentTab: function (tab) {
            return tab.url.startsWith('https://sonarcloud.io/') && tab.url.includes('pullRequest=');
        },
        getIdentifier: function (tab) {
            let match = tab.url.match(/id=(\S+)&pullRequest=(\d+)/);
            console.log(match);
            let context = identifierFactory.getContextFromKeyInDict('sonarIds', match[1]);
            if (context) {
                return identifierFactory.fromGithubPrId(match[2], context);
            }
            return null;
        },
        createUrl: function (identifier) {
            let response = {
            };

            let keys = Object.keys(identifier.context.sonarIds);
            if (keys.length == 0) {
                return null;
            }

            response['primary'] = {
                link: identifier.githubPrId ? `https://sonarcloud.io/summary/new_code?id=${identifier.context.sonarIds[keys[0]]}&pullRequest=${identifier.githubPrId}` : null,
                label: this.name + ' ' + keys[0]
            }
            if (keys.length > 1) {
                response['secondary'] = {
                    link: identifier.githubPrId ? `https://sonarcloud.io/summary/new_code?id=${identifier.context.sonarIds[keys[1]]}&pullRequest=${identifier.githubPrId}` : null,
                    label: this.name + ' ' + keys[1]
                }
            }
            return response;
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
            let match = tab.url.match(/environment=review-(\d+)-(\S+)/i);
            console.log(match);
            let context = identifierFactory.getContextFromKey('stackdriverSuffix', match[2]);
            if (context) {
                return identifierFactory.fromGithubPrId(match[1], context);
            }
            return null;
        },
        createUrl: function (identifier) {
            return {
                primary: {
                    link: identifier.githubPrId
                        ? `https://hulk-observability-staging.kb.europe-west1.gcp.cloud.es.io:9243/app/apm/services?rangeFrom=now-15m&rangeTo=now&comparisonEnabled=true&comparisonType=day&environment=review-${identifier.githubPrId}-${identifier.context.stackdriverSuffix}`
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
            const ticketNo = tab.title.firstMatch(/(\S{2,3}-\d{2,5})/);
            if (ticketNo) {
                const projetKey = ticketNo.split('-')[0];
                let context = identifierFactory.getContextFromKey('projectKey', projetKey);
                if (context) {
                    return identifierFactory.queryBranchListing(ticketNo, context);
                }
            }
            return null;
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
