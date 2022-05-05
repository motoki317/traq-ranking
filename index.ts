import { dailyUserRanking } from './daily-user-ranking';
import yargs from 'yargs';

yargs(process.argv.slice(2))
  .scriptName('traq-ranking')
  .command(
    'daily-ranking',
    'Computes daily ranking and posts to specified traQ channel.',
    {
      D: {
        alias: 'dry-run',
        boolean: true,
        default: false,
        description:
          'Dry run: does not post to traQ nor saves to file, just outputs to stdout.',
      },
    },
    (args) =>
      dailyUserRanking(args.D).catch((e) => {
        console.trace(e);
      })
  )
  .help()
  .parse();
