function formatOutput(arr, depth = 1, pre='') {
    let result = '';

    for (const entry of arr) {
        const indent = '--'.repeat(depth);
        if (entry.type === 'directory') {
            result += `${indent} ${entry.name}/\n`;
            result += formatOutput(entry.content, depth + 1, `${pre?`${pre}/`:``}${entry.name}`);
        } else {
            result += `${indent} /${pre?`${pre}/`:``}${entry.name}\n`;
        }
    }

    return result;
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

    return formatOutput(sortedFiles);
}


exports.files_list_to_string = function(files, dirs) {
    return sortFiles(files).trim();
}