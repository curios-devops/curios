import { promises as fs } from 'fs';
import path from 'path';

const serviceDirs = [
  'lab',
  'lab/regular',
  'research/pro',
  'research/pro/agents',
  'research/regular',
  'search/pro',
  'search/regular'
];

async function renameIndexFiles() {
  const baseDir = path.join(process.cwd(), 'src/services');
  
  for (const serviceDir of serviceDirs) {
    const fullPath = path.join(baseDir, serviceDir);
    const indexFile = path.join(fullPath, 'index.ts');
    
    try {
      // Get the service name from the directory path
      const serviceName = serviceDir.split('/').pop();
      const newFileName = `${serviceName}Index.ts`;
      const newFilePath = path.join(fullPath, newFileName);
      
      // Check if index file exists
      try {
        await fs.access(indexFile);
      } catch {
        console.log(`No index file found in ${serviceDir}, skipping...`);
        continue;
      }
      
      // Rename the file
      await fs.rename(indexFile, newFilePath);
      console.log(`Renamed ${indexFile} to ${newFileName}`);
      
      // Update imports in other files (simplified example)
      // In a real scenario, you'd want to update imports in all relevant files
      
    } catch (error) {
      console.error(`Error processing ${serviceDir}:`, error.message);
    }
  }
  
  console.log('Index file renaming completed!');
}

renameIndexFiles().catch(console.error);
