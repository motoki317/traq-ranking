import { Apis, Configuration, User, UserStats } from '@traptitech/traq';
import { mustGetProp } from './utils';

const apis = new Apis(
  new Configuration({
    accessToken: mustGetProp('ACCESS_TOKEN'),
    basePath: mustGetProp('BASE_PATH'), // eg. https://q.trap.jp/api/v3
  })
);

export const fetchUsers = async (includeSuspended: boolean): Promise<User[]> =>
  apis.getUsers(includeSuspended).then((res) => res.data);

export const fetchUserStats = async (userId: string): Promise<UserStats> =>
  apis.getUserStats(userId).then((res) => res.data);

export const sendMessage = async (
  channelId: string,
  message: string,
  embed: boolean
): Promise<void> => {
  await apis.postMessage(channelId, {
    content: message,
    embed,
  });
};
