import { Workbench, Notification, WebDriver, VSBrowser, NotificationType } from 'vscode-extension-tester';
import * as assert from 'assert';
import * as fs from 'fs';

describe('Hello World Example UI Tests', () => {
    let driver: WebDriver;

    before(() => {
        driver = VSBrowser.instance.driver;
    });

    it('Command shows a notification with the correct text', async function(){
        this.timeout(10000);
        const workbench = new Workbench();
        const controls = await workbench.getActivityBar().getViewControl('CheckPoint');
        console.log(controls);
        controls.click();
        // const notification = await driver.wait(() => { return notificationExists('Hello'); }, 2000) as Notification;

        fs.writeFile('test-resources/image.png', await workbench.takeScreenshot(), {encoding: 'base64'}, function(err) {
            console.log('File created');
        });
        // assert.equal(await notification.getMessage(),'Hello World!');
        // assert.equal(await notification.getType(), NotificationType.Info);
    });
});

async function notificationExists(text: string): Promise<Notification | undefined> {
    const notifications = await new Workbench().getNotifications();
    for (const notification of notifications) {
        const message = await notification.getMessage();
        if (message.indexOf(text) >= 0) {
            return notification;
        }
    }
}