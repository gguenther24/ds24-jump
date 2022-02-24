import {getDefaultOptions} from "../common.js";

chrome.omnibox.onInputEntered.addListener((text) => {

    chrome.storage.sync.get(getDefaultOptions()).then(function (jqueryJumpOpts) {
        console.log(jqueryJumpOpts);
    });

    const url = text.startsWith('DS-')
        ? `https://digistore.atlassian.net/browse/${text}`
        : `https://github.com/hulkag/ds24-digistore/pull/${text}`;
    chrome.tabs.create({url: url});
});