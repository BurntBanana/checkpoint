import {patch_obj} from 'diff-match-patch';

export interface CheckPointObject {
    patches: Array<patch_obj[]|string>,
    timestamps: Array<Date>,
	current: string
}
export interface CheckPointTreeItem {
    timestamp: Date,
    index: number
}