import path from "path";
import fs, { Mode, NoParamCallback, Stats } from "fs";
import { CopyDirOptions, State } from "./contracts";


export function copydir(from: string, to: string, options: CopyDirOptions = {}, callback: NoParamCallback = () => {}) {
    const filterFunction = typeof options?.filter === 'function' ? options.filter : () => { return true };

    fs.lstat(from, function (err, stats) {
        if (err) {
            callback(err);
        } else {
            const stateName = getStateName(from, stats);
            const valid = filterFunction(stateName, from, path.basename(from));

            if (stateName === 'directory' || stateName === 'symbolicLink') {
                // Directory or SymbolicLink
                if (valid) {
                    fs.stat(to, function (err) {
                        if (err) {
                            if (err.code === 'ENOENT') {
                                fs.mkdir(to, function (err) {
                                    if (err) {
                                        callback(err);
                                    } else {
                                        options.debug && console.log('>> ' + to);
                                        rewrite(to, options, stats, function (err) {
                                            if (err) {
                                                callback(err);
                                            } else {
                                                listDirectory(from, to, options, callback);
                                            }
                                        });
                                    }
                                });
                            } else {
                                callback(err);
                            }
                        } else {
                            rewrite(to, options, stats, function (err) {
                                if (err) {
                                    callback(err);
                                } else {
                                    listDirectory(from, to, options, callback);
                                }
                            });
                        }
                    });
                } else {
                    callback(null);
                }
            } else if (stats.isFile()) {
                // File
                if (valid) {
                    if (options.cover) {
                        writeFile(from, to, options, stats, callback);
                    } else {
                        fs.stat(to, function (err) {
                            if (err) {
                                if (err.code === 'ENOENT') {
                                    writeFile(from, to, options, stats, callback);
                                } else {
                                    callback(err);
                                }
                            } else {
                                callback(null);
                            }
                        });
                    }
                } else {
                    callback(null);
                }
            } else {
                callback(new Error('stats invalid: ' + from));
            }
        }
    });
}

function getStateName(path: string, stats: Stats): State{
    if(stats.isDirectory()){
        return 'directory';
    } else if(stats.isFile()){
        return "file";
    } else if(stats.isSymbolicLink()){
        return  'symbolicLink';
    }

    throw new Error(`Could not resolve state for ${path}`);
}

function listDirectory(from: string, to: string, options: CopyDirOptions, callback: NoParamCallback) {
    fs.readdir(from, function (err, files) {
        if (err) {
            callback(err);
        } else {
            copyFromArray(files, from, to, options, callback);
        }
    });
}

function copyFromArray(files: string[], from: string, to: string, options: CopyDirOptions, callback: NoParamCallback) {
    const filePath = files.shift();
    if(filePath == null){
        callback(null);
    } else {
        copydir(path.join(from, filePath), path.join(to, filePath), options, function (err) {
            if (err) {
                callback(err);
            } else {
                copyFromArray(files, from, to, options, callback);
            }
        });
    }
}

function chmod(filePath: string, mode: Mode, callback: NoParamCallback) {
    if (mode) {
        fs.chmod(filePath, mode, callback);
    } else {
        callback(null);
    }
}

function writeFile(from: string, to: string, options: CopyDirOptions, stats: Stats, callback: NoParamCallback) {

    if (typeof fs.copyFile === "function") {
        fs.copyFile(from, to, function (err) {
            if (err) {
                callback(err);
            } else {
                options.debug && console.log('>> ' + to);
                rewrite(to, options, stats, callback);
            }
        })

        return;
    }

    fs.readFile(from, 'binary', function (err, data) {
        if (err) {
            callback(err);
        } else {
            fs.writeFile(to, data, 'binary', function (err) {
                if (err) {
                    callback(err);
                } else {
                    options.debug && console.log('>> ' + to);
                    rewrite(to, options, stats, callback);
                }
            });
        }
    });
}

function rewrite(filePath: string, options: CopyDirOptions, stats: Stats, callback: NoParamCallback) {
    if (options.modifiedStats?.mode != null) {
        chmod(filePath, options.modifiedStats.mode, (err) => {
            if (err) {
                callback(err);
            } else {
                utimes(filePath, options, stats, callback);
            }
        });
    } else {
        utimes(filePath, options, stats, callback);
    }
}

function utimes(filePath: string, options: CopyDirOptions, stats: Stats, callback: NoParamCallback) {
    if (options.modifiedStats?.atime != null || options.modifiedStats?.mtime != null) {
        fs.utimes(filePath, options.modifiedStats?.atime || stats.atime, options.modifiedStats?.mtime || stats.mtime, callback);
    } else {
        callback(null);
    }
}