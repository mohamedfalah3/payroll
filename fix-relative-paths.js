// Script to fix all CSS and JS paths in EJS views
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

// Views directory
const viewsDir = path.join(__dirname, 'views');

// Function to fix paths in a file
async function fixPathsInFile(filePath) {
  console.log(`Processing file: ${filePath}`);
  try {
    // Read file content
    const content = await readFileAsync(filePath, 'utf8');
    
    // Replace absolute paths with relative paths
    const updatedContent = content
      .replace(/href="\/css\//g, 'href="./css/')
      .replace(/src="\/js\//g, 'src="./js/')
      .replace(/src="\/images\//g, 'src="./images/');
    
    // Write updated content back
    await writeFileAsync(filePath, updatedContent);
    
    console.log(`✓ Updated: ${filePath}`);
  } catch (error) {
    console.error(`✗ Error processing ${filePath}:`, error);
  }
}

// Process all ejs files recursively
async function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      // Recursively process subdirectories
      await processDirectory(fullPath);
    } else if (file.endsWith('.ejs')) {
      // Process EJS files
      await fixPathsInFile(fullPath);
    }
  }
}

// Start processing
console.log('Fixing relative paths in all view files...');
processDirectory(viewsDir)
  .then(() => {
    console.log('All paths have been updated to use relative paths.');
  })
  .catch((error) => {
    console.error('An error occurred:', error);
  });
