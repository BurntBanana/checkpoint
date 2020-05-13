import { Workbench, Notification, WebDriver, DialogHandler, TextEditor, EditorView, SideBarView, VSBrowser, NotificationType, ActivityBar, By, WebElementPromise, ViewItem, WebElement, until, TreeItem } from 'vscode-extension-tester';
import * as assert from 'assert';
import * as fs from 'fs';
import { resolve } from 'dns';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
describe('Checkpoint UI Tests', () => {

    const fileName = "test.txt";
    const testFilePath = join(__dirname, fileName);
    const timeout = 20000;
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
        }).timeout(timeout);

        it('Should start tracking active file if commence tracking is clicked', async () => {
            const sideBar = new SideBarView();
            await workbench.executeCommand("\b" + testFilePath);
            const section = await sideBar.getContent().getSection('CheckPoint Explorer');
            await (await section.findElement(By.xpath("//a[contains(.,'Commence tracking')]"))).click();
            const visibleItems = await (await sideBar.getContent().getSection('CheckPoint Explorer')).getVisibleItems();
            assert.equal(visibleItems.length, 1);
        }).timeout(timeout);
    });

    describe('Open checkpoint', () => {
        it('Should not create checkpoint if there are no unsaved changes', async () => {
            const editorView = new EditorView();
            const editor = new TextEditor(editorView, fileName);
            await editor.setText('1');
            await editor.save();

            const visibleItems = await (await new SideBarView().getContent().getSection('CheckPoint Explorer')).getVisibleItems();
            await visibleItems[0].click();

            assert.equal(await editor.getText(), "0");
            assert.equal(visibleItems.length, 2);

        }).timeout(timeout);

        it('Should create new checkpoint and open selected index if there are unsaved changes', async () => {
            const editorView = new EditorView();
            const editor = new TextEditor(editorView, fileName);
            const sideBar = new SideBarView();
            await editor.setText('2');

            const visibleItemsOld = await (await sideBar.getContent().getSection('CheckPoint Explorer')).getVisibleItems();
            await visibleItemsOld[1].click();
            const visibleItemsNew = await (await sideBar.getContent().getSection('CheckPoint Explorer')).getVisibleItems();

            assert.equal(await editor.getText(), "1");
            assert.equal(visibleItemsNew.length, visibleItemsOld.length + 1);


        }).timeout(timeout);
    });

    describe('Set active checkpoint', () => {
        it('Should set selected index as active and change icon', async () => {
            const activeIndex = 1;
            const activeIcon = "garbage";

            const section = await new SideBarView().getContent().getSection('CheckPoint Explorer');
            const visibleItems = await section.getVisibleItems();
            //click active element
            await (await section.findElement(By.xpath(".//div[@role='treeitem' and @data-index='" + activeIndex + "']//li[@class='action-item']/a[contains(@title,'active')]"))).click();
            await visibleItems[activeIndex].findElement(By.xpath(".//div[@class='custom-view-tree-node-item-icon' and contains(@style, "+activeIcon+")]"))
                .catch(error => { assert.fail("Checkpoint is not active at index: " + activeIndex); });
            assert.equal(readFileSync(testFilePath, { encoding: 'utf8', flag: 'r' }), activeIndex);
        }).timeout(timeout);
    });

    describe('Editor switch', () => {

        const newFileName = "editor_test.txt";
        const newFilePath = join(__dirname, newFileName);

        before(async () => {
            writeFileSync(newFilePath, "0");
        });

        it('Should show welcome screen if editor is switched to untracked file', async () => {
            await workbench.executeCommand("\b" + newFilePath);
            const section = await new SideBarView().getContent().getSection('CheckPoint Explorer');
            const sectionText = await section.getText();
            assert(sectionText.includes("Commence tracking"));
        }).timeout(timeout);

        it('Should update tree view when editor is switched', async () => {
            await workbench.executeCommand("\b" + fileName);    
            const visibleItems = await (await new SideBarView().getContent().getSection('CheckPoint Explorer')).getVisibleItems();
            assert(visibleItems.length);
        }).timeout(timeout);

        after(() => {
            fs.unlinkSync(newFilePath);
        });
    });

    describe('Delete single checkpoint', () => {
        it('Should delete checkpoint at given index', async () => {
            const deleteIndex = 2;
            const sideBar = new SideBarView();
            const section = await sideBar.getContent().getSection('CheckPoint Explorer');
            const visibleItemsOld = await section.getVisibleItems();
            const deleteElement = visibleItemsOld[deleteIndex] as TreeItem;
            await deleteElement.click();
            await (await deleteElement.getActionButton('Delete a particular Check Point'))?.click();
            const visibleItemsNew = await (await sideBar.getContent().getSection('CheckPoint Explorer')).getVisibleItems();
            assert.equal(visibleItemsNew.length, visibleItemsOld.length - 1);
        }).timeout(timeout);

    });

    describe('Delete all checkpoints', () => {
        it('Should clear all checkpoints when delete all button is clicked', async () => {
            const deleteLabel = "Delete all Check Points of current file";
            const sideBar = await new SideBarView();
            await (await sideBar.getTitlePart().getAction(deleteLabel)).click();
            const visibleItems = await (await sideBar.getContent().getSection('CheckPoint Explorer')).getVisibleItems();
            assert(visibleItems.length === 0);
        }).timeout(timeout);
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

    after(async () => {
        fs.unlinkSync(testFilePath);
    });
});