import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const sprintsDir = path.join(rootDir, 'sprints');

const sprintFiles = [
  'sprint-1-auth.json',
  'sprint-2-curriculum.json',
  'sprint-3-quiz-maker.json',
  'sprint-4-gradebook.json'
];

async function syncIssues() {
  console.log('--- Uploading Quikz Sprint Issues to GitHub (fsco101/Quikz) ---');

  for (const file of sprintFiles) {
    const filePath = path.join(sprintsDir, file);
    if (!fs.existsSync(filePath)) continue;

    const sprintData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`\nProcessing ${sprintData.sprintName} (${file})...`);

    for (const issue of sprintData.issues) {
      if (issue.githubIssueNumber) {
        console.log(`Issue already exists (#${issue.githubIssueNumber}): ${issue.title}`);
        continue;
      }

      console.log(`Creating issue: ${issue.title}`);
      const body = `${issue.description}\n\n**Internal ID**: \`${issue.id}\`\n**Sprint**: \`Sprint ${sprintData.sprintNumber}\`\n**System**: \`Quikz\``;

      try {
        const cmd = `gh issue create --repo fsco101/Quikz --title "${issue.title.replace(/"/g, '\\"')}" --body "${body.replace(/"/g, '\\"')}"`;
        const output = execSync(cmd, { encoding: 'utf-8' }).trim();
        console.log(`Created: ${output}`);

        // Extract issue number from URL (e.g., https://github.com/fsco101/Quikz/issues/1 -> 1)
        const match = output.match(/\/issues\/(\d+)/);
        if (match) {
          issue.githubIssueNumber = parseInt(match[1], 10);
        }
      } catch (err) {
        console.error(`Failed to create issue "${issue.title}":`, err.message);
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(sprintData, null, 2), 'utf-8');
  }

  console.log('\n--- Sync Complete! ---');
}

syncIssues();
