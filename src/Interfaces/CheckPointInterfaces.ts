import {patch_obj} from 'diff-match-patch';

/**
	 * @member patches Provides a patches array which
	 * will be used to represent file patches.
	 * @member timestamps An array of Dates which will be used to store the file change times and,
     * @member current String to store the current value of file
	 */
export interface CheckPointObject {
    patches: Array<patch_obj[]|string>,
    timestamps: Array<Date>,
    current: string,
    active: number
}
/**
	 * @member timestamp Date for the current checkpoint,
     * @member index Checkpoint index
	 */
export interface CheckPointTreeItem {
    timestamp: Date,
    index: number
}