chrome.omnibox.onInputEntered.addListener((text) => {
    const url = text.startsWith('DS-')
        ? `https://digistore.atlassian.net/browse/${text}`
        : `https://github.com/hulkag/ds24-digistore/pull/${text}`;
    chrome.tabs.create({url: url});
});