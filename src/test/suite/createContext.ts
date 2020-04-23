export { VSExtensionContext as ExtensionContext };
export { VSMemento as Memento };

let dataStore : { [id: string] : Object; } = {};
export {dataStore};
interface VSExtensionContext {

	readonly subscriptions: { dispose(): any }[];
	readonly workspaceState: VSMemento;
	readonly globalState: VSMemento;
	readonly extensionPath: string;
	asAbsolutePath(relativePath: string): string;
	readonly storagePath: string | undefined;
	readonly globalStoragePath: string;
	readonly logPath: string;
}

interface VSMemento {

	get<T>(key: string): T | undefined;
	get<T>(key: string, defaultValue: T): T;
	update(key: string, value: any): Thenable<void>;
}

export class MemImpl implements VSMemento {
	public update(key: string, value: any): Thenable<void>{
		return new Promise(function(resolve, reject) {
			dataStore[key] = value;
			resolve();
		});
	}


	public get<T>(key: string): T | undefined{
        return <T> dataStore[key];
	}
	constructor(){}
}

export class ExtImpl implements VSExtensionContext{
	constructor(public subscriptions: { dispose(): any }[],
	public workspaceState:VSMemento,
	public globalState: VSMemento,
	public extensionPath: string,
	public storagePath: string | undefined,
	public globalStoragePath: string,
	public logPath: string
	)
	{}

	asAbsolutePath(relativePath : string) : string{
		return "test";
	}
};