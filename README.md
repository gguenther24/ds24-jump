# DigiJump

**A Chrome/Chromium Extension providing Quick Jumps to Jira Tickets, GitHub PRs, DynEnv and other resources.**
![Extension Screenshot](docs/extension-screenshot.png)

Requires Chrome 88+. Not tested on other Browsers.

## Features

### Switch to PR, Jira Ticket, Dynamic Environment or other Websites depending on current context

The extension evaluates the current Browser Tab and tries to build related links, e.g. the Jira Ticket, a Github Pull 
Request or an dynamic environment.

### Quickly navigate to PR or a Jira Ticket

Type `ds24` into the omnibar. The extension will try to find a Jira Ticket for you or, alternatively, a Github PR.
| Input   	| Redirect to                                       	|
|---------	|---------------------------------------------------	|
| DS-1234 	| https://digistore.atlassian.net/browse/1234       	|
| 772     	| https://github.com/hulkag/ds24-digistore/pull/772 	|

### Get common developer links

If not viewing a Jira Ticket or Pull Request, this extension show links to Github, Jira and other useful links. They can
be customized.

## Installation

1. Download this repo as a ZIP file from GitHub.
2. Unzip the file, you should have a folder named `ds24-jump`.
3. In Chrome/Edge go to the extensions page (`chrome://extensions` or `edge://extensions`).
4. Enable Developer Mode.
5. Load the extensions:
    - Just Drag and Drop the .crx file in this directory to the extension overview
    - Alternatively, click to "Load unpacked". Then head to this directory and click "Load".

## Configuration

You can toggle the elements offered as jump links. To toggle, right-click on the extension icon and choose "Options".
Alternatively click on the digistore24 Logo.

## Notes

* This extension heavily relies on making internal calls to github. You may need to login / authorize at github before
  open the extension popup.
* This extension is not tested with Edge or other Browsers like Brave.
* Local installed extensions are not auto-updated. So check version numbers in case of any updates and repeat the steps
  shown at "Installation"

## Support

If you have any problems or feature suggestions, you can submit
a [new issue here](https://github.com/dsentker24/ds24-jump/issues/new/choose). I am happy about every PR and every
issue.

### Ideas

- ~~Search in Slack Messages~~
- Create a "Save k8s namespace command to clipboard"
- Use Github API instead of DOM crawling (Token required)