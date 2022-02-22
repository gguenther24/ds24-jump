import {JUMP_TARGETS, DEFAULT_JUMPS, getDefaultOptions} from "./common.js";

JUMP_TARGETS.forEach(function (jt) {
    document.getElementById('jumpOptions').innerHTML += '<label>' +
        '<input type="checkbox" id="' + jt.id + '"><img src="' + jt.icon + '" /><span class="label">' + jt.name + '</span>' +
        '<span class="description">' + jt.description + '</span></label>'
});

function saveOptions() {
    let opts = {};
    JUMP_TARGETS.forEach(function (jt) {
        opts[jt.id] = document.getElementById(jt.id).checked;
    });
    opts['default_jumps'] = document.getElementById('default_jumps').value;

    chrome.storage.sync.set(opts, function () {
        // Update status to let user know options were saved.
        const status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(function () {
            status.textContent = '';
        }, 1000);
    });

}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restoreOptions() {
    chrome.storage.sync.get(getDefaultOptions(), function (items) {
        for (let id in items) {
            let input = document.getElementById(id);
            if (input.nodeName === 'TEXTAREA') {
                input.value = items[id];
            } else {
                // Must be a checkbox
                input.checked = items[id];
            }

        }
    });
}

function resetOptions() {
    chrome.storage.sync.set(getDefaultOptions(), function () {
        // Update status to let user know options were saved.
        const status = document.getElementById('status');
        status.textContent = 'Options were set to defaults.';
        restoreOptions();
        setTimeout(function () {
            status.textContent = '';
        }, 1000);
    });

}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
document.getElementById('restore').addEventListener('click', resetOptions);