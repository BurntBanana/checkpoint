import { Workbench, Notification, WebDriver, DialogHandler, TextEditor, EditorView, SideBarView, VSBrowser, NotificationType, ActivityBar, By, WebElementPromise, ViewItem, WebElement } from 'vscode-extension-tester';
import * as assert from 'assert';
import * as fs from 'fs';
import { resolve } from 'dns';
import { writeFileSync } from 'fs';
import { join } from 'path';

describe('Checkpoint UI Tests', () => {

    const fileName = "test.txt";
    const testFilePath = join(__dirname, fileName);
    let workbench: Workbench;
    let activityBar: ActivityBar;

    before(async () => {
        workbench = new Workbench();
        activityBar = new ActivityBar();
        writeFileSync(testFilePath, "0");
        const controls = activityBar.getViewControl('CheckPoint');
        await controls.click();
    });

    describe('Commence tracking', () => {

        it('Should not start tracking if no active file is present', async () => {
            const section = await new SideBarView().getContent().getSection('CheckPoint Explorer');
            await (await section.findElement(By.xpath("//a[contains(.,'Commence tracking')]"))).click();
            const visibleItems = await section.getVisibleItems();
            assert(visibleItems.length === 0);
        }).timeout(10000);

        it('Should start tracking active file if commence tracking is clicked', async () => {
            await workbench.executeCommand("\b" + testFilePath);
            const section = await new SideBarView().getContent().getSection('CheckPoint Explorer');
            await (await section.findElement(By.xpath("//a[contains(.,'Commence tracking')]"))).click();
            const visibleItems = await section.getVisibleItems();
            assert.equal(visibleItems.length, 1);
        }).timeout(10000);
    });

    describe('Delete all checkpoints', () => {
        it('Should show welcome screen when clicked', async () => {
            const section = await new SideBarView().getContent().getSection('CheckPoint Explorer');
            await section.findElement(By.xpath("(.//div[@class='actions'])[1]//li[@class='action-item']")).click();
            const visibleItems = await section.getVisibleItems();
            assert(visibleItems.length === 0);
        }).timeout(10000);
    });

    // it('Command shows a notification with the correct text', async function () {
    //     this.timeout(10000);

    //     //open the file & get editor object
    //     await workbench.executeCommand("\b" + testFilePath);
    //     const editorView = new EditorView();
    //     const editor = new TextEditor(editorView, "test.txt");

    //     //fetch the extension button on th activity bar
    //     const activityBar = new ActivityBar();
    //     const controls = activityBar.getViewControl('CheckPoint');
    //     await controls.click();
    //     const section = await new SideBarView().getContent().getSection('CheckPoint Explorer');

    //     // find & click commence tracking
    //     await (await driver.findElement(By.xpath("//a[contains(.,'Commence tracking')]"))).click();

    //     //Replace the text in active window & save
    //     await editor.setText('my fabulous text');
    //     await editor.save();

    //     //get a list of all checkpoints
    //     const visibleItems = await section.getVisibleItems();
    //     console.log("TREEEEEEEEEEEEEEEEEEE *************", visibleItems);

    //     //Open first checkpoint
    //     await visibleItems[0].click();

    //     //Test
    //     const treeItem: ViewItem = visibleItems[0];

    //     // find actions for each tree Item
    //     const itemActions = await treeItem.findElements(By.xpath("(.//div[@class='actions'])[1]//li[@class='action-item']/a"));
    //     itemActions.forEach(async function (item, index) {
    //         console.log(index, await item.getAttribute('title'));
    //     });

    //     //find actions for entire section
    //     const sectionActions = await section.findElements(By.xpath("(.//div[@class='actions'])[1]//li[@class='action-item']/a"));
    //     sectionActions.forEach(async function (item, index) {
    //         console.log(index, await item.getAttribute('title'));
    //     });

    //     //try to find actions for section
    //     console.log("Action ***********", await section.getActions());
    //     // Save a screenshot by first toggling the activity bar
    //     const screenshot = await driver.takeScreenshot().catch(error => console.log("Ss failed" + error));
    //     fs.writeFileSync('test-resources/image.png', screenshot , {encoding: 'base64'}); 
    // });

    after(() => {
        fs.unlinkSync(testFilePath);
    });
});