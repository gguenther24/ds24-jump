const JUMP_TARGETS = [
    {
        name: 'Jira Ticket',
        id: 'jira',
        icon: 'assets/icon-jira.png',
        bypassPing: false,
        matchesCurrentTab: function (tab) {
            return tab.url.startsWith('https://digistore.atlassian.net/browse/');
        },
        getIdentifier: function (tab) {
            const ticketNo = tab.url.match(/\/browse\/(DS-\d+)/)[1];
            console.log(ticketNo);
            return new Identifier(null, ticketNo);
        },
        createUrl: function (identifier) {
            return {
                primary: {
                    link: 'https://digistore.atlassian.net/browse/' + identifier.jiraTicket,
                    label: this.name
                }
            }
        }
    },
    {
        name: 'GitHub PR',
        id: 'github_pr',
        icon: 'assets/icon-merge.png',
        bypassPing: false,
        matchesCurrentTab: function (tab) {
            return tab.url.startsWith('https://github.com/hulkag/ds24-digistore/pull/');
        },
        getIdentifier: function (tab) {
            const prId = tab.url.match(/pull\/(\d+)/);
            return new Identifier(prId ? prId[1] : null, null);
        },
        createUrl: function (identifier) {
            return {
                primary: {
                    link: 'https://github.com/hulkag/ds24-digistore/pull/' + identifier.githubPrId,
                    label: this.name
                }
            }
        }
    },
    {
        name: 'GitHub Find',
        id: 'github_find',
        icon: 'assets/icon-github.png',
        bypassPing: true,
        matchesCurrentTab: function (tab) {
            return tab.url.startsWith('https://github.com/hulkag/ds24-digistore/tree/');
        },
        getIdentifier: function (tab) {
            const jiraTicket = tab.url.match(/(DS-\d+)/);
            return new Identifier(null, jiraTicket ? jiraTicket[1] : null);
        },
        createUrl: function (identifier) {
            return {
                primary: {
                    link: 'https://github.com/hulkag/ds24-digistore/branches/all?query=' + identifier.jiraTicket,
                    label: 'Find Branches'
                },
                secondary: {
                    link: 'https://github.com/hulkag/ds24-digistore/pulls?q=' + identifier.jiraTicket + '+in%3Atitle',
                    label: 'Find PRs'
                }
            };
        }
    },
    {
        name: 'DynEnv',
        id: 'dynenv',
        icon: 'assets/icon-dynenv.png',
        bypassPing: false,
        matchesCurrentTab: function (tab) {
            return tab.url.startsWith('https://digistore24-app-ds-review-');
        },
        getIdentifier: function (tab) {
            const prId = tab.url.match(/digistore24-app-ds-review-(\d+)\./)[1];
            return new Identifier(prId, null);
        },
        createUrl: function (identifier) {
            return {
                primary: {
                    link: 'https://digistore24-app-ds-review-' + identifier.githubPrId + '.dev.ds25.io',
                    label: this.name
                }
            };
        }
    },
    {
        name: 'GMail',
        id: 'gmail',
        icon: 'assets/icon-gmail.png',
        bypassPing: true,
        matchesCurrentTab: function (tab) {
            return tab.url.startsWith('https://mail.google.com/');
        },
        getIdentifier: function (tab) {
            const ticketNo = tab.title.match(/ (DS-\d+)/)[1];
            return new Identifier(0, ticketNo);
        },
        createUrl: function (identifier) {
            return {
                primary: {
                    link: 'https://mail.google.com/mail/#search/' + identifier.jiraTicket,
                    label: identifier.jiraTicket
                },
                secondary: {
                    link: 'https://mail.google.com/mail/#search/' + encodeURIComponent('#' + identifier.githubPrId),
                    label: '#' + identifier.githubPrId
                }
            };
        }
    }
];

const Identifier = class {
    constructor(githubPrId = 0, jiraTicket = '', name = '') {
        this.githubPrId = githubPrId;
        this.jiraTicket = jiraTicket;
        this.name = name;
    }

    hasGithubPrId() {
        return Number(this.githubPrId) !== 0;
    }

    hasJiraTicket() {
        return String(this.jiraTicket).startsWith('DS-')
    }

    sync() {
        switch (true) {
            case this.hasJiraTicket():
                return fetch('https://github.com/hulkag/ds24-digistore/pulls?q=in%3Atitle+' + this.jiraTicket).then(r => r.text()).then(result => {
                    const dom = document.createElement("body");
                    dom.innerHTML = result;
                    let a = dom.querySelector('[data-hovercard-type="pull_request"]');
                    console.log(a);
                    if (a) {
                        this.name = a.textContent;
                        this.githubPrId = a.getAttribute('href').match(/pull\/(\d+)/)[1];
                    } else {
                        this.name = this.jiraTicket;
                    }
                    return this;
                });
            case this.hasGithubPrId():
                return fetch('https://github.com/hulkag/ds24-digistore/pull/' + this.githubPrId).then(r => r.text()).then(result => {
                    const dom = document.createElement("body");
                    dom.innerHTML = result;
                    const jiraTicketTitle = dom.querySelector('h1.gh-header-title').textContent.trim();
                    console.log("Jira Ticket title", jiraTicketTitle);
                    this.name = jiraTicketTitle;
                    let title = jiraTicketTitle.match(/DS[- _]\d{2,4}/);
                    this.jiraTicket = title ? title[0].replace(/_| /, '-') : jiraTicketTitle;
                    return this;
                });
            default:
                return null;
        }
    }
}

function ping(url) {
    return fetch(url, {method: 'HEAD'}).then(function (response) {
        return response.status === 200;
    }, function () {
        return false;
    })
}

document.addEventListener('DOMContentLoaded', () => {
    const dialogBox = document.getElementById('dialog-box');
    const query = {active: true, currentWindow: true};

    chrome.tabs.query(query, (tabs) => {
        const tab = tabs[0];
        let identifier;

        for (let jumpTarget of JUMP_TARGETS) {
            if (jumpTarget.matchesCurrentTab(tab)) {
                identifier = jumpTarget.getIdentifier(tab);
                let syncResult = identifier.sync();
                if (null === syncResult) {
                    buildFallbackDialogBoxContent();
                } else {
                    syncResult.then(function (syncedIdentifier) {
                        buildDialogBoxContent(syncedIdentifier);
                    });
                }
                break;
            }
        }

        if (!identifier) {
            buildFallbackDialogBoxContent();
        }
    });

    function buildFallbackDialogBoxContent() {
        dialogBox.classList.add('loaded');
        dialogBox.innerHTML = '';
        const fallbackLinks = [
            ['DS24 Github', 'https://github.com/hulkag/ds24-digistore'],
            ['My Pull Requests', 'https://github.com/hulkag/ds24-digistore/pulls/@me'],
            ['Jira', 'https://digistore.atlassian.net/jira/software/c/projects/DS/issues'],
            ['Scrum Dashboard', 'https://digistore.atlassian.net/jira/dashboards/10540'],
            ['Google Cloud', 'https://console.cloud.google.com/home/dashboard?project=ds-dev-228617'],
        ];
        fallbackLinks.forEach(function(linkData) {
            dialogBox.innerHTML += `<div class="jump-link-group"><a target="_blank" class="jump-link online" href="${linkData[1]}">${linkData[0]}</a></div>`;
        });
    }

    function buildDialogBoxContent(identifier) {
        let anchors = [];
        for (let jumpTarget of JUMP_TARGETS) {
            let urlData = jumpTarget.createUrl(identifier),
                name = jumpTarget.name,
                id = jumpTarget.id;
            if (!jumpTarget.bypassPing) {
                ping(urlData.primary.link).then(function (isAvailable) {
                    if (isAvailable) {
                        document.getElementById('jump_' + id).classList.add('online');
                    } else {
                        document.getElementById('jump_' + id).classList.add('offline');
                    }
                });
            }
            let anchorHtml = `<a class="jump-link ${jumpTarget.bypassPing ? 'online' : ''}" id="jump_${id}" href="${urlData.primary.link}" target="_blank"><img src="${jumpTarget.icon}"> <span>${urlData.primary.label}</span> ${jumpTarget.bypassPing ? '' : '<span class="status-indicator"></span>'}</a>`;
            if (urlData.hasOwnProperty('secondary')) {
                anchorHtml += `<a class="jump-link online" id="jump_secondary_${id}" href="${urlData.secondary.link}" target="_blank"><span>${urlData.secondary.label}</span></a>`;
            }
            anchors.push(`<div class="jump-link-group">${anchorHtml}</div>`);
        }
        dialogBox.classList.add('loaded');
        dialogBox.innerHTML = '<strong>' + identifier.name + '</strong>';
        dialogBox.innerHTML += anchors.join('');
    }
});