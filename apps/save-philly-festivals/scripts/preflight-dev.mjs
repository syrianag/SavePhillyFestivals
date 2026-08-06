import { createConnection } from "node:net";

/**
 * Next refuses to run a second dev server for the same project, but it does so
 * only after picking a free port and reporting "Ready", so the real message
 * ("Another next dev server is already running") scrolls past a success line and
 * Nx reports nothing more useful than "Failed tasks: save-philly-festivals:dev".
 *
 * Fail before any of that with a message that says what to do about it.
 */
const port = Number(process.env.PORT || 3000);
const host = "127.0.0.1";

function probe() {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host });
    const done = (inUse) => {
      socket.destroy();
      resolve(inUse);
    };
    socket.setTimeout(1500);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

if (await probe()) {
  process.stderr.write(
    `\nPort ${port} is already serving something.\n\n` +
      `If that is your dev server, use it: http://localhost:${port}\n` +
      `Next will not start a second dev server for this project, so starting another\n` +
      `one here would fail after printing a misleading "Ready" line.\n\n` +
      `To take over the port, stop the existing server first, or run on another port:\n` +
      `  PORT=3001 pnpm run dev\n\n`
  );
  process.exit(1);
}
