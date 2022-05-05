import * as fs from 'fs';
import { mustGetProp } from './utils';
import { fetchUsers, fetchUserStats, sendMessage } from './traq';
import { User } from '@traptitech/traq';

const TARGET_CHANNEL_ID = mustGetProp('TARGET_CHANNEL_ID');
const SAVE_FILE = mustGetProp('DAILY_RANKING_SAVE_FILE');
const MAX_USERS = 100;

const getData = (): UserMessageCount[] => {
  const data = fs.readFileSync(SAVE_FILE).toString();
  return data !== '' ? JSON.parse(data) : [];
};

const saveData = (data: UserMessageCount[]): void => {
  fs.writeFileSync(SAVE_FILE, JSON.stringify(data));
};

const fetchNewRanks = async (target: User[]): Promise<UserMessageCount[]> => {
  console.log(`Fetching user stats for ${target.length} users...`);

  const ranks: UserMessageCount[] = [];
  for (let i = 0; i < target.length; i++) {
    const user = target[i];
    const userStats = await fetchUserStats(user.id);
    ranks.push({
      name: user.name,
      count: userStats.totalMessageCount,
    });

    if (i > 0 && i % 30 === 0) {
      console.log(`Fetched user stats for ${i} / ${target.length} users...`);
    }
  }
  console.log(`Successfully fetched user stats for ${target.length} users!`);

  ranks.sort((u1, u2) => {
    if (u1.count !== u2.count) return u2.count - u1.count;
    return u1.name.localeCompare(u2.name);
  });

  return ranks;
};

type ChangeMark = ':arrow_up_small:' | '' | ':arrow_down_small:' | ':new:';

const computeChangeMark = (oldIndex: number, newIndex: number): ChangeMark => {
  if (oldIndex === -1) {
    return ':new:';
  } else if (newIndex < oldIndex) {
    return ':arrow_up_small:';
  } else if (newIndex === oldIndex) {
    return '';
  } else {
    return ':arrow_down_small:';
  }
};

interface UserMessageCount {
  name: string;
  count: number;
}

interface UserChange {
  changeMark: ChangeMark;
  diff: number;
}

function buildMessage(
  newRanks: UserMessageCount[],
  userChanges: Record<string, UserChange>,
  users: User[],
  newTotalCount: number,
  totalDiff: number
) {
  const lines: string[] = [];

  const now = new Date();
  lines.push(
    `Daily User Ranking ${now.getFullYear()}/${
      now.getMonth() + 1
    }/${now.getDate()}`
  );
  lines.push('|  | User | Messages |');
  lines.push('| --- | --- | --- |');

  const userLines = newRanks
    .slice(0, Math.min(newRanks.length, MAX_USERS))
    .map(({ name, count: newCount }, i): string => {
      const { diff, changeMark } = userChanges[name];
      const rank = i + 1;

      // suspendedの場合はアイコンを表示しない
      const isSuspended = users.find((u) => u.name === name)?.state === 1;
      const userNameStr = isSuspended ? `:@${name}: ${name}` : `${name}`;

      const diffStr = diff > 0 ? ` (+${diff})` : diff === 0 ? '' : ` (${diff})`;
      return `|${rank}. ${changeMark}|${userNameStr}|${newCount}${diffStr}|`;
    });
  lines.push(...userLines);

  if (newRanks.length > MAX_USERS) {
    lines.push('| ... | | |');
  }

  const totalDiffStr = totalDiff > 0 ? `+${totalDiff}` : `${totalDiff}`;
  lines.push(`|   | Total | ${newTotalCount} (${totalDiffStr}) |`);

  return lines.join('\n');
}

export const dailyUserRanking = async (dryRun: boolean): Promise<void> => {
  // Include only real users (including suspended)
  const users = (await fetchUsers(true))
    .filter((u) => !u.bot)
    .filter((u) => u.name !== 'traP');

  const newRanks = await fetchNewRanks(users);

  const oldRanks = getData();

  const userChanges: Record<string, UserChange> = {};
  const newTotalCount = newRanks
    .map((u) => u.count)
    .reduce((acc, cur) => acc + cur, 0);
  const oldTotalCount = oldRanks
    .map((u) => u.count)
    .reduce((acc, cur) => cur + acc, 0);
  const totalDiff = newTotalCount - oldTotalCount;

  // Compute changes for each user
  for (let i = 0; i < newRanks.length; i++) {
    const { name: name, count: newCount } = newRanks[i];
    const oldIndex = oldRanks.findIndex((u) => u.name === name);
    const { count: oldCount } = oldRanks.find((u) => u.name === name) || {
      count: 0,
    };

    userChanges[name] = {
      changeMark: computeChangeMark(oldIndex, i),
      diff: newCount - oldCount,
    };
  }

  const message = buildMessage(
    newRanks,
    userChanges,
    users,
    newTotalCount,
    totalDiff
  );
  console.log(message);
  if (!dryRun) {
    await sendMessage(TARGET_CHANNEL_ID, message, false);
    saveData(newRanks);
  }
};
