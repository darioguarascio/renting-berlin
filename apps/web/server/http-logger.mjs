import morgan from 'morgan';
import chalk from 'chalk';

morgan.token('user-agent', (req) => chalk.gray(req.headers['user-agent'] ?? ''));
morgan.token('remote-addr', (req) =>
  chalk.black.bgWhite(req.headers['cf-connecting-ip'] ?? req.ip ?? ''),
);
morgan.token('status', (_req, res) => {
  const code = res.statusCode;
  if (code < 300) return chalk.green(String(code));
  if (code < 400) return chalk.yellow(String(code));
  if (code < 500) return chalk.red(String(code));
  return chalk.white.bgRed(String(code));
});
morgan.token('response-time', (req, res) => {
  if (!req._startAt || !res._startAt) return;

  const t = parseFloat(
    (
      (res._startAt[0] - req._startAt[0]) * 1e3 +
      (res._startAt[1] - req._startAt[1]) * 1e-6
    ).toFixed(3),
  );

  if (t < 200) return chalk.green(`${t}ms`);
  if (t < 600) return chalk.yellow(`${t}ms`);
  return chalk.red(`${t}ms`);
});

const format =
  '[:date[iso]] (:status) :method :url - :response-time - :remote-addr | :user-agent | :referrer';

export default morgan(format, {
  skip: (req) => req.headers['user-agent']?.startsWith('Wget') ?? false,
});
