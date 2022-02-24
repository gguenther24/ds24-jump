import {JUMP_TARGETS, getDefaultOptions, getCurrentDepartment} from "./common.js";

function ping(url) {
    return fetch(url, {method: 'HEAD'}).then(function (response) {
        return response.status === 200;
    }, function () {
        return false;
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const dialogBox = document.getElementById('dialog-box');
    const query = {active: true, currentWindow: true};

    chrome.tabs.query(query, (tabs) => {
        const tab = tabs[0];
        let identifierPromise;

        getCurrentDepartment().then(function(currentDepartment) {
            for (let jumpTarget of JUMP_TARGETS) {
                if (jumpTarget.matchesCurrentTab(tab, currentDepartment)) {
                    identifierPromise = jumpTarget.getIdentifier(tab, currentDepartment);

                    identifierPromise.then(function (identifier) {
                        buildDialogBoxContent(identifier, jumpTarget, currentDepartment);
                    });
                    break;
                }
            }

            if (!identifierPromise) {
                buildFallbackDialogBoxContent();
            }
        });
    });

    function buildFallbackDialogBoxContent() {

        chrome.storage.sync.get(getDefaultOptions()).then(function (jqueryJumpOpts) {
            let fallbackLinks = JSON.parse(jqueryJumpOpts.default_jumps);
            dialogBox.classList.add('loaded');
            dialogBox.innerHTML = '';
            fallbackLinks.forEach(function (linkGroup) {
                let groupHtml = '<div class="jump-link-group">'
                linkGroup.forEach(function (linkData) {
                    groupHtml += `<a target="_blank" class="jump-link online" href="${linkData[1]}">${linkData[0]}</a>`;
                });
                groupHtml += '</div>'
                dialogBox.innerHTML += groupHtml;

            });
        });
    }

    function buildDialogBoxContent(identifier, currentJumpTarget, currentDepartment) {

        chrome.storage.sync.get(getDefaultOptions()).then(function (jqueryJumpOpts) {

            let anchors = [];

            for (let jumpTarget of JUMP_TARGETS) {
                // Check if Jump is activated by user
                if (jqueryJumpOpts[jumpTarget.id]) {
                    let urlData = jumpTarget.createUrl(identifier, currentDepartment),
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

                    let defaultClass = '';
                    if (!urlData.primary.link) {
                        defaultClass = 'offline';
                    } else if (jumpTarget.bypassPing) {
                        defaultClass = 'online';
                    }
                    let isActive = currentJumpTarget.id === jumpTarget.id;
                    let anchorHtml = `<a class="jump-link ${isActive ? 'current' : ''} ${defaultClass}" id="jump_${id}" href="${urlData.primary.link}" target="_blank"><img src="${jumpTarget.icon}"> <span>${urlData.primary.label}</span> ${jumpTarget.bypassPing ? '' : '<span class="status-indicator"></span>'}</a>`;
                    if (urlData.hasOwnProperty('secondary')) {
                        anchorHtml += `<a class="jump-link online" id="jump_secondary_${id}" href="${urlData.secondary.link}" target="_blank"><span>${urlData.secondary.label}</span></a>`;
                    }
                    anchors.push(`<div class="jump-link-group">${anchorHtml}</div>`);
                }
            }
            dialogBox.classList.add('loaded');
            dialogBox.innerHTML = '<strong style="font-size: 20px;">' + identifier.name + '</strong>';
            dialogBox.innerHTML += anchors.join('');

            // DX: No results?
            if (dialogBox.querySelectorAll('.online').length <= 1) {
                dialogBox.innerHTML = `<div class="alert"><svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16" data-view-component="true" style="margin-right: 5px;"><path fill-rule="evenodd" d="M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 01-1.484.211c-.04-.282-.163-.547-.37-.847a8.695 8.695 0 00-.542-.68c-.084-.1-.173-.205-.268-.32C3.201 7.75 2.5 6.766 2.5 5.25 2.5 2.31 4.863 0 8 0s5.5 2.31 5.5 5.25c0 1.516-.701 2.5-1.328 3.259-.095.115-.184.22-.268.319-.207.245-.383.453-.541.681-.208.3-.33.565-.37.847a.75.75 0 01-1.485-.212c.084-.593.337-1.078.621-1.489.203-.292.45-.584.673-.848.075-.088.147-.173.213-.253.561-.679.985-1.32.985-2.304 0-2.06-1.637-3.75-4-3.75zM6 15.25a.75.75 0 01.75-.75h2.5a.75.75 0 010 1.5h-2.5a.75.75 0 01-.75-.75zM5.75 12a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-4.5z"></path></svg> Are you&nbsp;<a target="_blank" href="${currentDepartment.rules.githubRepo}">logged in into Github</a>?</div>${dialogBox.innerHTML}`;
            }
        });
    }

    document.getElementById('logo').addEventListener('click', function () {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL('options.html'));
        }
    });
});