const fs = require('fs');
const path = require('path');

const moveFrom = "/tmp/movefrom";
const moveTo = "/tmp/moveto";

// Make an async function that gets executed immediately
(async () => {
    // Our starting point
    try {
        // Get the files as an array
        const files = await fs.promises.readdir(moveFrom);

        // Loop them all with the new for...of
        for (const file of files) {
            // Get the full paths
            const fromPath = path.join(moveFrom, file);
            const toPath = path.join(moveTo, file);

            // Stat the file to see if we have a file or dir
            const stat = await fs.promises.stat(fromPath);

            if (stat.isFile())
                console.log("'%s' is a file.", fromPath);
            else if (stat.isDirectory())
                console.log("'%s' is a directory.", fromPath);

            // Now move async
            await fs.promises.rename(fromPath, toPath);

            // Log because we're crazy
            console.log("Moved '%s'->'%s'", fromPath, toPath);
        } // End for...of
    }
    catch (e) {
        // Catch anything bad that happens
        console.error("We've thrown! Whoops!", e);
    }

})(); // Wrap in parenthesis and call now