const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Changes the current working directory to the script's directory and
 * handles the execution of a Hugo command to list future content, then
 * writes this content to a JSON file.
 * Point this script to the relative path of your Hugo project's folder with an active content directory.
 */

// Change the current working directory to the script's directory
process.chdir(__dirname);

// Print current dir into console
console.log(`Current directory: ${__dirname}`);

/**
 * Gets the relative path from the command-line arguments.
 * Defaults to the current directory if not provided.
 * @type {string}
 */
const relativePath = process.argv[2] || '';

// Change the current working directory to the provided relative path
if (relativePath) {
    const newPath = path.resolve(__dirname, relativePath);
    process.chdir(newPath);
    console.log(`Current directory changed to: ${newPath}`);
} else {
    console.log(`No relative path provided, staying in: ${__dirname}`);
}

/**
 * Defines the output file path using the provided relative path.
 * @type {string}
 */
const outputPath = path.join(__dirname, relativePath, 'data', 'rebuild_at', 'dates.json');

// Execute the Hugo command to list future content
exec('hugo list future', (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return;
    }

    // Find the index of the header line starting with "path,slug,title"
    const lines = stdout.split('\n');
    const headerIndex = lines.findIndex(line => line.startsWith('path,slug,title'));

    // If the header is found, process from that line onwards; otherwise, use the whole output
    const contentLines = headerIndex !== -1 ? lines.slice(headerIndex + 1) : lines;

    // Process the content lines which contain the future content list
    const rebuildAtItems = contentLines.map(line => {
      const columns = line.split(',');
      if (columns.length > 3) {
        // Extract relevant date fields
        const date = columns[3];
        const expiryDate = columns[4];
        const publishDate = columns[5];
        return { date, expiryDate, publishDate };
      }
      return null;
    }).filter(item => item !== null); // Remove any null entries

    // Wrap the dates array in an object under "rebuild_at"
    const jsonData = JSON.stringify({ rebuild_at: rebuildAtItems }, null, 2);

    // Ensure the directory exists
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    // Write the JSON data to the specified file
    fs.writeFile(outputPath, jsonData, (writeError) => {
      if (writeError) {
        console.error(`Failed to write JSON to ${outputPath}: ${writeError}`);
      } else {
        console.log(`Future dates JSON saved to ${outputPath}`);
      }
    });
});
