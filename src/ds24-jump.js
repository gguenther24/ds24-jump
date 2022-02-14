const Identifier = class {
    constructor(githubPrId = 0, jiraTicket = '', name = '') {
        this.githubPrId = githubPrId;
        this.jiraTicket = jiraTicket;
        this.name = name;
    }

    hasGithubPrId() {
        return this.githubPrId !== 0;
    }

    hasJiraTicket() {
        return String(this.jiraTicket).startsWith('DS-')
    }

    sync() {
        switch (true) {
            case this.hasJiraTicket():
                return fetch('https://github.com/hulkag/ds24-digistore/pulls?q=in%3Atitle+' + this.jiraTicket).then(r => r.text()).then(result => {
                    var dom = document.createElement("body");
                    dom.innerHTML = result;
                    console.log('https://github.com/hulkag/ds24-digistore/pulls?q=in%3Atitle+' + this.jiraTicket);
                    let a = dom.querySelector('[data-hovercard-type="pull_request"]');
                    this.name = a.textContent;
                    this.githubPrId = a.getAttribute('href').match(/pull\/(\d+)/)[1];
                    return this;
                });
            case this.hasGithubPrId():
                return fetch('https://github.com/hulkag/ds24-digistore/pull/' + this.githubPrId).then(r => r.text()).then(result => {
                    var dom = document.createElement("body");
                    dom.innerHTML = result;
                    const jiraTicketTitle = dom.querySelector('h1').textContent;
                    this.name = jiraTicketTitle;
                    let title = jiraTicketTitle.match(/DS[- _]\d{2,4}/);
                    this.jiraTicket = title ? title[0].replace(/_| /, '-') : jiraTicketTitle;
                    return this;
                });
            default:
                // TODO return promise
                console.warn('No info found ;-(');

        }
    }
}

const JUMP_TARGETS = [
    {
        name: 'Jira Ticket',
        id: 'jira',
        bypassPing: false,
        matchesCurrentTab: function (tab) {
            return tab.url.startsWith('https://digistore.atlassian.net/browse/');
        },
        getIdentifier: function (tab) {
            const ticketNo = tab.url.match(/\/browse\/(DS-\d+)/)[1];
            return new Identifier(null, ticketNo);
        },
        createUrl: function (identifier) {
            return 'https://digistore.atlassian.net/browse/' + identifier.jiraTicket;
        }
    },
    {
        name: 'GitHub PR',
        id: 'github_pr',
        bypassPing: false,
        matchesCurrentTab: function (tab) {
            return tab.url.startsWith('https://github.com/hulkag/ds24-digistore/pull');
        },
        getIdentifier: function (tab) {
            const prId = tab.url.match(/pull\/(\d+)/)[1];
            return new Identifier(prId, null);
        },
        createUrl: function (identifier) {
            return 'https://github.com/hulkag/ds24-digistore/pull/' + identifier.githubPrId;
        }
    },
    {
        name: 'DynEnv',
        id: 'dynenv',
        bypassPing: false,
        matchesCurrentTab: function (tab) {
            return tab.url.startsWith('https://digistore24-app-ds-review-');
        },
        getIdentifier: function (tab) {
            const prId = tab.url.match(/digistore24-app-ds-review-(\d+)\./)[1];
            return new Identifier(prId, null);
        },
        createUrl: function (identifier) {
            return 'https://digistore24-app-ds-review-' + identifier.githubPrId + '.dev.ds25.io';
        }
    },
];

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
    dialogBox.innerHTML = 'Bitte warten...';

    chrome.tabs.query(query, (tabs) => {
        const tab = tabs[0];
        let identifier;

        for (var jumpTarget of JUMP_TARGETS) {
            if(jumpTarget.matchesCurrentTab(tab)) {
                identifier = jumpTarget.getIdentifier(tab);
                console.log(identifier.sync());
                identifier.sync().then(function(syncedIdentifier) {
                    buildDialogBoxContent(syncedIdentifier);
                });
                break;
            }
        }

        // TODO replace with timeout
        if(!identifier) {
            buildFallbackDialogBoxContent();
        }
    });

    function buildFallbackDialogBoxContent() {
        dialogBox.innerHTML = '<a class="jump-link" href="https://github.com/hulkag/ds24-digistore">DS24 GitHub</a>';
        dialogBox.innerHTML += '<a class="jump-link" href="https://digistore.atlassian.net/jira/software/c/projects/DS/issues">Jira</a>';
        dialogBox.innerHTML += '<a class="jump-link" href="https://digistore.atlassian.net/jira/dashboards/10540">Scrum Dashboard</a>';
    }

    function buildDialogBoxContent(identifier) {
        let anchors = [];
        for (var jumpTarget of JUMP_TARGETS) {
            let url = jumpTarget.createUrl(identifier),
                name = jumpTarget.name,
                id = jumpTarget.id,
                isActive = true;
            if(!jumpTarget.bypassPing) {
                ping(url).then(function(isAvailable) {
                    if(isAvailable) {
                        document.getElementById('jump_' + id).classList.add('online');
                    } else {
                        document.getElementById('jump_' + id).classList.add('offline');
                    }

                });
            }
            anchors.push(`<a class="jump-link" id="jump_${id}" ${isActive ? '' : 'style=""'} href="${url}" id="${id}" target="_blank">${name} <span class="status-indicator"></span></a>`);
        }
        dialogBox.innerHTML = '<strong>' + identifier.name + '</strong>';
        dialogBox.innerHTML += anchors.join('');
    }
});
