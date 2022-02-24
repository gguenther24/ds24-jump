import {JUMP_TARGETS, DEPARTMENT_RULESET, getDefaultOptions} from "./common.js";

// Build Jump Target Option List
JUMP_TARGETS.forEach(function (jt) {
    document.getElementById('jumpOptions').innerHTML += '<label>' +
        '<input type="checkbox" id="' + jt.id + '"><img src="' + jt.icon + '" /><span class="label">' + jt.name + '</span>' +
        '<span class="description">' + jt.description + '</span></label>';
});


// Build Department Selector
for (const [id, department] of Object.entries(DEPARTMENT_RULESET)) {
    document.getElementById('departmentOptions').innerHTML += '<label>' +
        '<input type="radio" name="department" value="' + id + '" id="' + id + '"><img style="width: 20px; height: 20px;" src="' + department.icon + '" /><span class="label">' + department.name + '</span>' +
        '<span class="description">' + department.rules.githubRepo + '</span></label>';
}

function saveOptions() {
    let opts = {};
    JUMP_TARGETS.forEach(function (jt) {
        opts[jt.id] = document.getElementById(jt.id).checked;
    });
    opts['default_jumps'] = document.getElementById('default_jumps').value;
    opts['department'] = document.querySelector('input[name="department"]:checked').value;
    console.log(document.querySelector('input[name="department"]:checked').value);

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
        console.log(items);
        for (let id in items) {
            switch(id) {
                case 'department':
                    // Checkbox
                    let activeDepartment = items[id];
                    document.querySelector('[name="department"]#' + activeDepartment).checked = true;
                    break;
                case 'default_jumps':
                    // Textarea
                    document.getElementById(id).value = items[id];
                    break;
                default:
                    // Checkbox
                    document.getElementById(id).checked = items[id];
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