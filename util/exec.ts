/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-console */

import { exec as EXEC, ChildProcess } from 'child_process';

export function exec(command: string, logToConsole = true): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    function stdoutHandler(data: string) {
      console.log(data);
    }
    function stderrHandler(data: string) {
      console.error(data);
    }
    const child: ChildProcess = EXEC(command, { windowsHide: false }, (err, results) => {
      if (logToConsole) {
        child.stdout!.removeListener('data', stdoutHandler);
        child.stderr!.removeListener('data', stderrHandler);
      }
      if (err) {
        return reject(err);
      }
      return resolve(results);
    });

    process.stdin.pipe(child.stdin!);

    if (logToConsole) {
      child.stdout!.on('data', stdoutHandler);
      child.stderr!.on('data', stderrHandler);
    }
  });
}
