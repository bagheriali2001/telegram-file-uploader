const fs = require('fs');
const path = require('path');

function return_content(file_obj, parent=''){
    if(file_obj.type === 'file'){
        return [`${parent!=''?`${parent}/`:``}${file_obj.name}`]
    } else {
        let child_list = [];
        for(let child of file_obj.content){
            let child_content = return_content(child, `${parent!=''?`${parent}/`:``}${file_obj.name}`);
            child_list = child_list.concat(child_content);
        }
        return child_list;
    }
}

function sortFiles(filePaths) {
    filePaths.sort();

    const sortedFiles = [];

    for (const filePath of filePaths) {
        const parts = filePath.split('/');
        let current = sortedFiles;

        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            let foundDir = current.find(entry => entry.name === part && entry.type === 'directory');

            if (!foundDir) {
                foundDir = { name: part, type: 'directory', content: [] };
                current.push(foundDir);
                current.sort((a, b) => {
                    if (a.type === 'directory' && b.type === 'file') {
                        return -1; // Directories first
                    } else if (a.type === 'file' && b.type === 'directory') {
                        return 1; // Files after directories
                    } else {
                        return a.name.localeCompare(b.name); // Sort by name if the types are the same
                    }
                });
            }
    
            current = foundDir.content;
        }

        current.push({ name: parts[parts.length - 1], type: 'file' });
    }
    
    let returning_files = [];

    for(let file of sortedFiles){
        let child_content = return_content(file);
        returning_files = returning_files.concat(child_content);
    }
    return returning_files;
}
const list_dir = function (dir_path='', storage='storage', recursive=true) {
    var files = [];
    var dirs = [];
    var dir_path = path.join(storage, dir_path);

    if (!fs.existsSync(dir_path)) {
        return undefined;
    }
    fs.readdirSync(dir_path).forEach(file => {
        var file_path = path.join(dir_path, file);
        if (fs.lstatSync(file_path).isDirectory()) {
            dirs.push(file);
        } else {
            files.push(file);
        }
    });

    if (recursive) {
        dirs.forEach(dir => {
            // remove storage from start of dir_path and add dir at the end
            var new_dir = dir_path.replace(storage, '');
            new_dir = path.join(new_dir, dir)

            var dir_files = list_dir(new_dir, storage, recursive);
            if (dir_files){
                var sub_dir_files = dir_files.files;
                for (index in sub_dir_files){
                    sub_dir_files[index] = `${dir}/${sub_dir_files[index]}`;
                }
    
                files = files.concat(sub_dir_files);
            }
        });
    }

    return {files: sortFiles(files), dirs: dirs};
}

exports.list_dir = list_dir;

exports.get_file = function (file_path, storage='./storage') {
    var file_path = path.join(storage, file_path);

    if (!fs.existsSync(file_path)) {
        return null;
    }
    return fs.readFileSync(file_path);
}

exports.write_file = async function (file_name, file_data, file_path, storage='./storage') {
    var file_path = path.join(storage, file_path);

    if (!fs.existsSync(file_path)) {
        fs.mkdirSync(file_path, { recursive: true });
    }

    fs.writeFileSync(path.join(file_path, file_name), file_data);

    return true;
}

exports.check_dir_exists = function(dir, storage='./storage'){
    var dir_path = path.join(storage, dir);

    if (!fs.existsSync(dir_path)) {
        fs.mkdirSync(dir_path, { recursive: true });
    }
}

exports.rename_downloaded_file = function(file_path, new_file_name){
    var file_path_splitted = file_path.split('/');
    file_path_splitted[file_path_splitted.length - 1] = new_file_name;
    var new_file_path = file_path_splitted.join('/');
    // check if new_file_path exists, add YYYY-MM-DD-HH-MM-SS to end of file, before .
    if (fs.existsSync(new_file_path)) {
        var date = new Date();
        var date_string = `-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}`;

        var new_file_name_splitted = new_file_name.split('.');
        if (new_file_name_splitted.length > 1){
            new_file_name_splitted[new_file_name_splitted.length - 2] =
                new_file_name_splitted[new_file_name_splitted.length - 2] + date_string;
        } else {
            new_file_name_splitted[0] = new_file_name_splitted[0] + date_string;
        }

        file_path_splitted[file_path_splitted.length - 1] = new_file_name_splitted.join('.');
        new_file_path = file_path_splitted.join('/');
    }

    fs.renameSync(file_path, new_file_path);

    return new_file_path;
}

exports.delete_file = function(file_path, storage='./storage'){
    var file_path = path.join(__dirname, storage, file_path);

    fs.unlinkSync(file_path);

    return true;
}