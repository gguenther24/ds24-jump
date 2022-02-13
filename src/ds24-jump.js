document.addEventListener('DOMContentLoaded', () => {
    const dialogBox = document.getElementById('dialog-box');
    const query = { active: true, currentWindow: true };

    chrome.tabs.query(query, (tabs) => {
        //dialogBox.innerHTML = tabs[0].title;

        let currentUrl = tabs[0].url,
            prId,
            ticketNo;
        switch(true) {
            case currentUrl.startsWith('https://github.com/hulkag/ds24-digistore/pull'):
                prId = currentUrl.match(/pull\/(\d+)/)[1];
                break;
            case currentUrl.startsWith('https://digistore24-app-ds-review-'):
                prId = currentUrl.match(/digistore24-app-ds-review-(\d+)\./)[1];
                break;
            case currentUrl.startsWith('https://digistore.atlassian.net/browse/'):
                ticketNo = currentUrl.match(/\/browse\/(DS-\d+)/)[1];
                getGithubDataByTicketNo(ticketNo).then(function(ghData) {
                    let jumpUrls = createJumpUrlsFromGitHubData(ghData);
                    buildDialogBoxContent(jumpUrls);
                });
                break;

        }
    });

    function buildDialogBoxContent(jumpUrls) {
        console.log(jumpUrls);
        dialogBox.innerHTML = '' +
            '<strong>' + jumpUrls.title + '</strong><br>' +
            '<a target="_blank" href="' + jumpUrls.jira + '">Jira Ticket</a><br>' +
            '<a target="_blank" href="' + jumpUrls.github + '">GitHub PR</a><br>' +
            '<a target="_blank" href="' + jumpUrls.dynenv + '">DynEnv</a><br>' +
            '<a target="_blank" href="' + jumpUrls.gmail + '">GMail</a><br>';
    }

    function getGithubDataByTicketNo(ticketNo) {
        return fetch('https://github.com/hulkag/ds24-digistore/pulls?q=in%3Atitle+' + ticketNo).then(r => r.text()).then(result => {
            var dom = document.createElement("body");
            dom.innerHTML = result;
            let a = dom.querySelector('[data-hovercard-type="pull_request"]');
            let prTitle = a.textContent,
                prId = a.getAttribute('href').match(/pull\/(\d+)/)[1];

            return {
                title: prTitle,
                prId: prId,
                ticket: ticketNo,
            }
        })
    }

    function createJumpUrlsFromGitHubData(ghData) {
        return {
          jira: 'https://digistore.atlassian.net/browse/' + ghData.ticket,
          github: 'https://github.com/hulkag/ds24-digistore/pull/' + ghData.prId,
          dynenv: 'https://digistore24-app-ds-review-' + ghData.prId + '.dev.ds25.io',
          gmail: 'https://mail.google.com/mail/#search/' + ghData.ticket,
          title: ghData.title
        };
    }
});
