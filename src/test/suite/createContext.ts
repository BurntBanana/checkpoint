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

// export class dummyClass {
// 	private key: string;
// 	private value : string;

// 	constructor(key: string, value : string)
// 	{
// 		this.key = key;
// 		this.value = value;
//     }
    
//     put()
//     {
//         return this.key;
//     }
// };

interface VSMemento {

	get<T>(key: string): T | undefined;
	get<T>(key: string, defaultValue: T): T;
	update(key: string, value: any): Thenable<void>;
}

export class MemImpl implements VSMemento {
	public update(key: string, value: any): Thenable<void>{
		return new Promise(function(resolve, reject) {
			console.log("Updated - ", key, " : ", value);
			dataStore[key] = value;
			resolve();
		});
	}


	public get<T>(key: string): T | undefined{
        console.log("called get with key", key);
        return <T> dataStore[key];
		// return <any>{"dummy": key};
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