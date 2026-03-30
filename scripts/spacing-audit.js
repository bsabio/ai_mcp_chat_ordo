/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const WORKSPACE_ROOT = path.join(__dirname, '..');
const REPORT_ONLY = process.argv.includes('--report-only');
const thresholdArg = process.argv.find((arg) => arg.startsWith('--threshold='));
const driftThreshold = thresholdArg ? Number.parseInt(thresholdArg.split('=')[1], 10) : Number.POSITIVE_INFINITY;

const GOVERNED_TARGETS = [
  'src/components/SiteNav.tsx',
  'src/components/AccountMenu.tsx',
  'src/components/AudioPlayer.tsx',
  'src/components/BookSidebar.tsx',
  'src/components/ContentModal.tsx',
  'src/components/GraphRenderer.tsx',
  'src/components/MarkdownProse.tsx',
  'src/components/ThemeSwitcher.tsx',
  'src/components/WebSearchResultCard.tsx',
  'src/components/journal/PublicJournalPages.tsx',
  'src/frameworks/ui/ChatHeader.tsx',
  'src/frameworks/ui/ChatInput.tsx',
  'src/frameworks/ui/ChatMarkdown.tsx',
  'src/frameworks/ui/ChatMessageViewport.tsx',
  'src/frameworks/ui/MessageList.tsx',
  'src/app/admin/journal/page.tsx',
  'src/app/admin/journal/[id]/page.tsx',
  'src/app/library/page.tsx',
  'src/app/library/[document]/[section]/page.tsx',
  'src/components/journal/JournalLayout.tsx',
  'src/frameworks/ui/RichContentRenderer.tsx',
  'src/components/profile/ProfileSettingsPanel.tsx',
  'src/components/MentionsMenu.tsx',
  'src/components/ToolCard.tsx',
].map((relativePath) => path.join(WORKSPACE_ROOT, relativePath));

const SPACING_REGEX = /\b(?:gap|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|space-x|space-y)-\d+(?:\.\d+)?\b/g;
const UNSUPPORTED_TOKEN_REGEX = /--space-(?:0\.5|1\.5|2\.5|3\.5|5|7|9|11|13|14|15)\b/g;

const fileReports = [];
let totalMatches = 0;

function auditFile(filePath) {
  const relativePath = path.relative(WORKSPACE_ROOT, filePath).replaceAll(path.sep, '/');

  const content = fs.readFileSync(filePath, 'utf8');
  const matches = [
    ...(content.match(SPACING_REGEX) ?? []),
    ...(content.match(UNSUPPORTED_TOKEN_REGEX) ?? []),
  ];

  if (matches.length === 0) {
    return;
  }

  const uniqueMatches = [...new Set(matches)].sort();
  totalMatches += matches.length;
  fileReports.push({
    file: relativePath,
    count: matches.length,
    matches: uniqueMatches,
  });
}

GOVERNED_TARGETS.forEach((target) => {
  if (fs.existsSync(target)) {
    auditFile(target);
  }
});

fileReports.sort((left, right) => right.count - left.count || left.file.localeCompare(right.file));

console.log('Spacing audit scope: governed shell, chat, library, admin, jobs, editorial, and shared component surfaces');
console.log(`Report mode: ${REPORT_ONLY ? 'report-only' : 'enforced threshold'}`);
console.log(`Governed targets: ${GOVERNED_TARGETS.length}`);
console.log(`Total literal spacing matches: ${totalMatches}`);

if (fileReports.length === 0) {
  console.log('No literal spacing utilities detected in the current governed scope.');
} else {
  console.log('Drift report:');
  fileReports.forEach((report) => {
    console.log(`- [${report.count}] ${report.file} :: ${report.matches.join(', ')}`);
  });
}

if (!REPORT_ONLY && totalMatches > driftThreshold) {
  console.error(`ERROR: spacing drift (${totalMatches}) exceeds threshold ${driftThreshold}.`);
  process.exit(1);
}

process.exit(0);
