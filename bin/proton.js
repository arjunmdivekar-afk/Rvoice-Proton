#!/usr/bin/env node

/**
 * Proton CLI - Next-Generation Launcher for RVoice Proton
 * Usage:
 *   Proton --Rvoice
 *   proton --rvoice
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const args = process.argv.slice(2);

const banner = `
\x1b[36m
██████╗ ██████╗  ██████╗ ████████╗ ██████╗ ███╗   ██╗
██╔══██╗██╔══██╗██╔═══██╗╚══██╔══╝██╔═══██╗████╗  ██║
██████╔╝██████╔╝██║   ██║   ██║   ██║   ██║██╔██╗ ██║
██╔═══╝ ██╔══██╗██║   ██║   ██║   ██║   ██║██║╚██╗██║
██║     ██║  ██║╚██████╔╝   ██║   ╚██████╔╝██║ ╚████║
╚═╝     ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝ ╚═╝  ╚═══╝
\x1b[0m\x1b[35m       ⚡ RVoice Proton Live System Launcher ⚡\x1b[0m
`;

function printHelp() {
  console.log(banner);
  console.log(`\x1b[1mUsage:\x1b[0m`);
  console.log(`  Proton --Rvoice        Start full stack (backend + frontend) and open browser`);
  console.log(`  Proton --update        Pull latest updates from GitHub & rebuild`);
  console.log(`  Proton --version       Show version and commit info`);
  console.log(`  Proton --help          Show this help manual\n`);
}

function openBrowser(url) {
  const platform = os.platform();
  if (platform === 'win32') {
    exec(`powershell -Command "Start-Process '${url}'"`, (err) => {
      if (err) {
        exec(`start "" "${url}"`);
      }
    });
  } else if (platform === 'darwin') {
    exec(`open "${url}"`);
  } else {
    exec(`xdg-open "${url}"`);
  }
}

async function startRvoice() {
  console.log(banner);
  console.log('\x1b[32m[Proton]\x1b[0m Initializing RVoice Proton Full Stack...');
  console.log('\x1b[32m[Proton]\x1b[0m Starting Backend Gateway (Port 3001) & Client Interface (Port 3344)...');

  const certPath = path.join(rootDir, 'certs', 'cert.pem');
  const isHttps = fs.existsSync(certPath);
  const targetUrl = isHttps ? 'https://localhost:3344' : 'http://localhost:3344';

  console.log(`\x1b[32m[Proton]\x1b[0m Web Interface will open at: \x1b[36m${targetUrl}\x1b[0m\n`);

  // Launch npm run dev inside root directory
  const npmCmd = os.platform() === 'win32' ? 'npm.cmd' : 'npm';
  const child = spawn(npmCmd, ['run', 'dev'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true
  });

  // Automatically open browser after short delay for servers to bind
  let browserOpened = false;
  setTimeout(() => {
    if (!browserOpened) {
      browserOpened = true;
      console.log(`\n\x1b[35m[Proton]\x1b[0m Opening default browser at \x1b[36m${targetUrl}\x1b[0m ...\n`);
      openBrowser(targetUrl);
    }
  }, 2500);

  child.on('error', (err) => {
    console.error('\x1b[31m[Proton Error]\x1b[0m Failed to start RVoice Proton:', err.message);
  });

  child.on('close', (code) => {
    console.log(`\x1b[33m[Proton]\x1b[0m System processes stopped (exit code ${code}).`);
  });
}

function updateApp() {
  console.log(banner);
  console.log('\x1b[32m[Proton]\x1b[0m Fetching latest updates from GitHub origin/main...');
  exec('git pull origin main', { cwd: rootDir }, (err, stdout, stderr) => {
    if (err) {
      console.error('\x1b[31m[Proton Error]\x1b[0m Git pull failed:', err.message);
      return;
    }
    console.log(stdout || stderr);
    console.log('\x1b[32m[Proton]\x1b[0m Rebuilding client and server bundles...');
    const npmCmd = os.platform() === 'win32' ? 'npm.cmd' : 'npm';
    const buildChild = spawn(npmCmd, ['run', 'build'], {
      cwd: rootDir,
      stdio: 'inherit',
      shell: true
    });
    buildChild.on('close', (code) => {
      if (code === 0) {
        console.log('\x1b[32m[Proton]\x1b[0m Successfully updated and built RVoice Proton!');
      } else {
        console.error('\x1b[31m[Proton Error]\x1b[0m Build failed with code', code);
      }
    });
  });
}

function printVersion() {
  const pkg = require(path.join(rootDir, 'package.json'));
  exec('git rev-parse --short HEAD', { cwd: rootDir }, (err, stdout) => {
    const commit = !err && stdout ? stdout.trim() : 'release';
    console.log(`\x1b[36mRVoice Proton\x1b[0m v${pkg.version} (${commit})`);
    console.log(`Author: Arjun Divekar`);
    console.log(`Repo: https://github.com/arjunmdivekar-afk/Rvoice-Proton`);
  });
}

// Command dispatcher
const lowerArgs = args.map(a => a.toLowerCase());
if (
  lowerArgs.includes('--rvoice') ||
  lowerArgs.includes('-r') ||
  lowerArgs.includes('rvoice') ||
  args.length === 0
) {
  startRvoice();
} else if (lowerArgs.includes('--update') || lowerArgs.includes('-u') || lowerArgs.includes('update')) {
  updateApp();
} else if (lowerArgs.includes('--version') || lowerArgs.includes('-v') || lowerArgs.includes('version')) {
  printVersion();
} else if (lowerArgs.includes('--help') || lowerArgs.includes('-h') || lowerArgs.includes('help')) {
  printHelp();
} else {
  console.log(`\x1b[33m[Proton]\x1b[0m Unrecognized argument: ${args.join(' ')}`);
  printHelp();
}
