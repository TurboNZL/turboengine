// Installing an update of a .deb install needs root. electron-updater does that with a blocking `pkexec --disable-internal-agent`
// call: the whole app freezes while the password prompt is open, it fails with exit code 127 whenever the desktop session has no
// polkit agent running, and it also runs on quit. These helpers run the same install asynchronously and explain each outcome.
// Copied from the engine's `updaters` module (TurboMusic's debInstall.ts), CommonJS because the Electron main process is.

/** Single-quote a string for /bin/sh. */
const shQuote = (s) => `'${s.replace(/'/g, `'\\''`)}'`;

/** What pkexec runs as root: dpkg, then apt fixes missing dependencies if dpkg could not finish. */
const debInstallScript = (file) => `dpkg -i ${shQuote(file)} || apt-get install -f -y`;

/** What to type in a terminal when the graphical password prompt is not available. */
const manualInstallCommand = (file) => `sudo apt install ${shQuote(file)}`;

/** pkexec: 126 = the prompt was dismissed, 127 = no authorization could be obtained (usually no polkit agent), else the command's own code. */
function describePkexec(code, stderr = '') {
  if (code === 0) return { ok: true };
  if (code === 126) return { ok: false, cancelled: true, message: 'The password prompt was closed, so nothing was installed.' };
  if (code === 127 || /not authorized|no authentication agent/i.test(stderr)) {
    return { ok: false, cancelled: false, message: 'Your desktop did not show a password prompt (no polkit authentication agent is running in this session). Install it from a terminal instead:' };
  }
  const tail = stderr.trim().split('\n').slice(-3).join(' ').slice(0, 300);
  return { ok: false, cancelled: false, message: `The installer failed (exit code ${code ?? 'none'})${tail ? `: ${tail}` : ''}. You can install it from a terminal instead:` };
}

/** What a terminal window runs when there is no graphical password prompt: the same install with sudo, then a pause so the output can be read. */
const terminalInstallScript = (file) =>
  `echo 'Installing the TurboCut update. Your password is asked by sudo below.'; echo; ` +
  `sudo sh -c ${shQuote(debInstallScript(file))}; code=$?; echo; ` +
  `if [ $code -eq 0 ]; then echo 'Done. TurboCut will restart.'; else echo "The install failed (code $code)."; fi; ` +
  `printf 'Press Enter to close this window… '; read _; exit $code`;

/** Terminal emulators to try, in order, each with the arguments that run a shell script and keep the process alive until the window closes. */
const TERMINALS = [
  { bin: 'x-terminal-emulator', args: (s) => ['-e', 'sh', '-c', s] },
  { bin: 'gnome-terminal', args: (s) => ['--wait', '--', 'sh', '-c', s] },
  { bin: 'kgx', args: (s) => ['--', 'sh', '-c', s] },
  { bin: 'konsole', args: (s) => ['--nofork', '-e', 'sh', '-c', s] },
  { bin: 'xfce4-terminal', args: (s) => ['--disable-server', '-x', 'sh', '-c', s] },
  { bin: 'mate-terminal', args: (s) => ['--disable-factory', '-x', 'sh', '-c', s] },
  { bin: 'kitty', args: (s) => ['sh', '-c', s] },
  { bin: 'alacritty', args: (s) => ['-e', 'sh', '-c', s] },
  { bin: 'xterm', args: (s) => ['-e', 'sh', '-c', s] },
];

/** True when `installed` (from `dpkg-query -W -f='${Version}'`) is the version the update was meant to install. */
const installedMatches = (installed, wanted) => installed.trim() === wanted.trim();

/** True when /proc/<pid>/status says the process (and so everything it starts) can never gain privileges: pkexec and sudo both refuse to run then. */
const hasNoNewPrivs = (procStatus) => /^NoNewPrivs:\s*1\s*$/m.test(procStatus);

const NO_NEW_PRIVS_MESSAGE =
  'This copy of TurboCut was started in a way that forbids asking for a password (the "no new privileges" flag is set, for example by a sandbox or a container), and opening a terminal through your session did not work either. Install it from a normal terminal instead (the AppImage build does not need this):';

/**
 * A process started with no_new_privs hands the flag to everything it starts, so a terminal opened by the app can never run sudo. The user's systemd
 * manager is not part of the app's process tree: asking it to start the terminal (systemd-run --user) gives a normal process. The window needs the
 * session's display variables, which --setenv=NAME copies from the app.
 */
const OUTSIDE_ENV = ['DISPLAY', 'WAYLAND_DISPLAY', 'XAUTHORITY', 'XDG_RUNTIME_DIR', 'DBUS_SESSION_BUS_ADDRESS', 'XDG_SESSION_TYPE', 'XDG_CURRENT_DESKTOP'];
const outsideTree = (bin, args, env = process.env) => ({
  bin: 'systemd-run',
  args: ['--user', '--collect', '--wait', '--quiet', ...OUTSIDE_ENV.filter((n) => env[n]).map((n) => `--setenv=${n}`), '--', bin, ...args],
});

/** A release is created before its installers are attached; a check in between finds no latest-linux.yml yet, which is not a failure. */
const isStillBuilding = (message) => /Cannot find (latest[\w.-]*\.yml|channel)/i.test(message) || /latest[\w.-]*\.yml.*(404|Not Found)/is.test(message);

module.exports = { shQuote, debInstallScript, manualInstallCommand, describePkexec, terminalInstallScript, TERMINALS, installedMatches, hasNoNewPrivs, NO_NEW_PRIVS_MESSAGE, OUTSIDE_ENV, outsideTree, isStillBuilding };
