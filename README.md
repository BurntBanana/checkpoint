<p align="center">
  <a href="" rel="noopener">
 <img width=200px height=200px src="https://github.com/BurntBanana/checkpoint/blob/master/media/logo.png" alt="Project logo"></a>
</p>

<h3 align="center">CheckPoint</h3>
<p align="center"> Easy local file state tracking
    <br> 
</p>

<div align="center">

  [![Azure DevOps builds (branch)](https://img.shields.io/azure-devops/build/burntbanana/bf09ccc0-ee73-42e3-b92a-2e3ed1269966/1/master?style=flat&logo=azure-pipelines)](https://dev.azure.com/burntbanana/checkpoint/_build)
  ![Azure DevOps tests](https://img.shields.io/azure-devops/tests/burntbanana/checkpoint/1/master?style=flat&logo=mocha)
  [![codecov](https://codecov.io/gh/BurntBanana/checkpoint/branch/master/graph/badge.svg)](https://codecov.io/gh/BurntBanana/checkpoint/)
  [![Automated Release Notes by gren](https://img.shields.io/badge/%F0%9F%A4%96-release%20notes-00B2EE.svg)](https://github-tools.github.io/github-release-notes/)
  [![GitHub release (latest by date)](https://img.shields.io/github/v/release/burntbanana/checkpoint)](https://github.com/BurntBanana/checkpoint/releases/)
  
</div>

---


## 📝 Table of Contents
- [About](#about)
- [Installation](#install)
- [Usage](#usage)
- [Build from source](#local)
- [Code coverage](#code_coverage)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Built Using](#built_using)
- [Authors](#authors)
- [Acknowledgments](#acknowledgement)

## 🧐 About <a name = "about"></a>
CheckPoint is a Visual Studio Code extension to track file change history from an easy to use graphical interface.  
File changes are marked as milestones called `checkpoints`. Easily navigate between checkpoints on click and set file contents to reflect any desired state.  
Let's end the torture of having to continuously jab the undo button! ;)
<div align="center"><img src="https://github.com/BurntBanana/checkpoint/blob/master/media/about.gif" alt="Demo" /></div>

## 🏁 Installation <a name = "install"></a>
Here's how to get CheckPoint up and running.
### Prerequisites
Ensure Visual Studio Code is installed.
You can get it [here](https://code.visualstudio.com/download).

### Installing
- Open **Extensions** sidebar panel in Visual Studio Code `View → Extensions`
- Search for `burntbanana.checkpoint`
- Click **Install**
- Click **Reload**, if required

## 🎈 Usage <a name="usage"></a>
Activate CheckPoint by clicking the 🏁 icon on the activity bar.
The green circle icon indicates the active `checkpoint`. 
### Commence Tracking 
Start tracking file changes by pressing the `Commence tracking` button in the sidebar. This initializes a new `checkpoint` for the active file in the editor. 
<div align="center"><img src="https://github.com/BurntBanana/checkpoint/blob/master/media/commence.gif" alt="Commence tracking demo" /></div>

### Save active file state
Once tracking has been commenced, simply save the file to create a new `checkpoint`.
<div align="center"><img src="https://github.com/BurntBanana/checkpoint/blob/master/media/save.gif" alt="Save checkpoint demo" /></div>

### Access saved state
Click on any `checkpoint` in the sidebar to view the state in the editor. This action does not change the file content, it only modifies the content in the editor.
Unsaved changes in the active file will be stored as a new `checkpoint`. 
<div align="center"><img src="https://github.com/BurntBanana/checkpoint/blob/master/media/open.gif" alt="Open checkpoint demo" /></div>

### Change file content to a saved state
Click on the ⚡ button next to any `checkpoint` to set file content to the required state. This will modify the file to reflect the selected state.
<div align="center"><img src="https://github.com/BurntBanana/checkpoint/blob/master/media/active.gif" alt="Set active checkpoint demo" /></div>

### Delete saved state
Click on the 🗑️ ️button next to any `checkpoint` to delete the saved state. 
<div align="center"><img src="https://github.com/BurntBanana/checkpoint/blob/master/media/deleteSingle.gif" alt="Delete single checkpoint demo" /></div>

### Delete all saved states
Click on the 🗑️ ️button at the top of the sidebar to remove all saved states for the active file. 
<div align="center"><img src="https://github.com/BurntBanana/checkpoint/blob/master/media/deleteAll.gif" alt="Delete all checkpoints demo" /></div>


## 🔧 Build from source <a name = "local"></a>
Here's how to build CheckPoint from source code and run tests 
### Local development setup  
- Clone the repository from GitHub 
``` 
git clone 
```  
- Install dependencies 
``` 
npm install 
``` 
- Run the extension from Visual Studio Code 
``` 
Run tab → Run extension 
``` 
### Unit testing 
Run mocha tests for CheckPoint.<br>
` Run → Extension Tests`  from Visual Studio Code <br>
or<br>
`npm test` from the command line 
### UI testing 
Run UI tests for CheckPoint. <br>
` Run → Run UI tests`from Visual Studio Code <br>
or<br>
`npm run ui-test` from the command line 
> UI tests have been tested on Windows platform only and may give inconsistent results for other platforms.  
## ☂ Code Coverage <a name = "code_coverage"></a>
Run coverage tests with `npm run test-coverage` from the command line. 
>codecov.io provides highly integrated tools to group, merge, archive, and compare coverage reports.

Coverage results obtained from coverage tests can be uploaded to [codecov.io](https://codecov.io/) to obtain coverage report and graphs. 

<div align="center"> 

  [![Code Coverage graph](https://codecov.io/gh/BurntBanana/checkpoint/branch/master/graph/sunburst.svg "Code Coverage graph")](https://codecov.io/gh/BurntBanana/checkpoint/) 

</div> 

## 🚀 Deployment <a name = "deployment"></a>
CheckPoint has been deployed and released using Azure DevOps pipelines. 

- [Build pipeline](https://dev.azure.com/burntbanana/checkpoint/_build) uses the [build pipeline YAML file](azure-pipelines.yml) in the project directory. 

- [Release pipeline](https://dev.azure.com/burntbanana/checkpoint/_release) was built using the Azure DevOps classic editor. 

## 🏋️ Contributing <a name = "contributing"></a>

BurntBanana welcomes contributions to CheckPoint.
In general, we follow the "fork-and-pull" Git workflow.
 1. **Fork** the repo on GitHub
 2. **Clone** the project to your own machine
 3. **Commit** changes to your `develop` branch
 4. **Push** your work back up to your fork
 5. Submit a **Pull request** to the `develop` branch so that we can review your changes
 
NOTE: Be sure to merge the latest from "upstream" before making a pull request!

## ⛏️ Built Using <a name = "built_using"></a>
- [Visual Studio Code](https://code.visualstudio.com/) - Code Editor
- [NodeJS](https://nodejs.org/en/) - Backend
- [Diff Patch Match](https://github.com/google/diff-match-patch) - File change computation
- [Winston](https://www.npmjs.com/package/winston) - Logging
- [dateFormat](https://www.npmjs.com/package/dateformat) - Date Formatting
- [Mocha](https://mochajs.org/) - Tests
- [VSCode Extension Tester](https://github.com/redhat-developer/vscode-extension-tester) - UI tests
- [Istanbul](https://istanbul.js.org/) - Code Coverage
- [Webpack](https://webpack.js.org/) - Code packing
- [Method Draw](https://editor.method.ac/) - SVG editor
- [codecov.io](https://codecov.io/) - Code coverage analysis
- [shields.io](https://shields.io/) - Badges
- [Azure DevOps](https://azure.microsoft.com/en-in/services/devops/) - Build & Release pipelines
- [Azure Boards](https://azure.microsoft.com/en-in/services/devops/boards/) - Work item tracking
- [gren](https://github.com/github-tools/github-release-notes) - Release Notes

## ✍️ Authors <a name = "authors"></a>
- [@adershmanoj](https://github.com/adershmanoj)
- [@BurntBanana](https://github.com/BurntBanana)

See also the list of [contributors](https://github.com/burntbanana/checkpoint/contributors) who participated in this project.

## 🎉 Acknowledgements <a name = "acknowledgement"></a>
- [Tree View base code](https://github.com/microsoft/vscode-extension-samples/tree/master/tree-view-sample)
- [Webpack base code](https://github.com/microsoft/vscode-extension-samples/tree/master/webpack-sample)
- [Icons & Logos (based off)](https://www.flaticon.com/authors/freepik)
- [Code coverage reference](https://github.com/aaronpowell/vscode-profile-switcher)
- [README Template](https://github.com/kylelobo/The-Documentation-Compendium/blob/master/en/README_TEMPLATES/Standard.md)