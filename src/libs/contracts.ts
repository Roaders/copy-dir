import { Mode, Stats } from "fs";

export type State = 'file' | 'directory' | 'symbolicLink';

export type CopyDirFilter = (state: State, filePath: string, fileName: string) => boolean;

export type ModifiedStats = Partial<Pick<Stats, "atime" | "mtime" | "mode">>;

export type CopyDirOptions = {
    /**
     * allows modification of the access time, modified time and mode of the files
     */
    modifiedStats?: ModifiedStats;
    /**
     * file filter
     */
    filter?: CopyDirFilter;
    /**
     * copy over existing files. Throws error if file exists and this is not set or false
     */
    cover?: boolean;
    /**
     * print out debug messages
     */
    debug?: boolean;
};