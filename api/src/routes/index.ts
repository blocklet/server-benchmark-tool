import { getResources } from '@blocklet/sdk/lib/component';
import config from '@blocklet/sdk/lib/config';
import ClientAuth from '@blocklet/sdk/lib/service/blocklet';
import { Router } from 'express';

function reloadStatesWithCatch() {
  const resources = getResources({
    types: [
      { did: 'z8iZiDFg3vkkrPwsiba1TLXy3H9XHzFERsP8o', type: 'page' },
      { did: 'z2qa7BQdkEb3TwYyEYC1psK6uvmGnHSUHt5RM', type: 'page' },
    ],
  });
  // eslint-disable-next-line no-console
  console.log('==debug==', resources.length);
}

config.events.on(config.Events.componentAdded, reloadStatesWithCatch);
config.events.on(config.Events.componentRemoved, reloadStatesWithCatch);
config.events.on(config.Events.componentStarted, reloadStatesWithCatch);
config.events.on(config.Events.componentStopped, reloadStatesWithCatch);
config.events.on(config.Events.componentUpdated, reloadStatesWithCatch);

const router = Router();

const client = new ClientAuth();

// router.use('/user', middleware.user(), (req, res) => res.json(req.user || {}));

router.get('/user/:did', async (req, res) => {
  const { did } = req.params;
  const { return: isReturn } = req.query;

  if (!did) {
    res.status(400).send('Missing did');
  }

  const { user } = await await client.getUser(did);

  if (isReturn === '0') {
    res.status(200).json(null);
    return;
  }

  res.json(user);
});

router.get('/users', async (req, res) => {
  const { search } = req.query;
  const { return: isReturn } = req.query;

  const query = {} as { search?: string };
  if (search) {
    query.search = search as string;
  }

  const { users } = await client.getUsers({ query });

  if (isReturn === '0') {
    res.status(200).json(null);
    return;
  }

  res.json(users);
});

router.get('/blocklet', async (req, res) => {
  const { search } = req.query;
  const { return: isReturn } = req.query;

  const query = {} as { search?: string };
  if (search) {
    query.search = search as string;
  }

  const blocklet = await client.getBlocklet();

  if (isReturn === '0') {
    res.status(200).json(null);
    return;
  }

  res.json(blocklet);
});

router.get('/getUsers/:did', async (req, res) => {
  const { did } = req.params;
  const { search } = req.query;

  const query = {} as { search?: string };
  if (search) {
    query.search = search as string;
  }

  const inviterData = await client.getUsers({
    query: { invitee: did, generation: 1 },
  });

  res.json(inviterData);
});

router.get('/resources', (req, res) => {
  const { search } = req.query;

  const query = {} as { search?: string };
  if (search) {
    query.search = search as string;
  }

  const inviterData = getResources({
    types: [
      // pages-kit 的资源组件
      { did: 'z8iZiDFg3vkkrPwsiba1TLXy3H9XHzFERsP8o', type: 'page' },
      { did: 'z2qa7BQdkEb3TwYyEYC1psK6uvmGnHSUHt5RM', type: 'page' },
    ],
  });

  res.json(inviterData);
});

router.get('/resources-skip', async (req, res) => {
  const { search } = req.query;

  const query = {} as { search?: string };
  if (search) {
    query.search = search as string;
  }

  const inviterData = await getResources({
    types: [
      // pages-kit 的资源组件
      { did: 'z8iZiDFg3vkkrPwsiba1TLXy3H9XHzFERsP8o', type: 'page' },
      { did: 'z2qa7BQdkEb3TwYyEYC1psK6uvmGnHSUHt5RM', type: 'page' },
    ],
    skipRunningCheck: true,
  });

  res.json(inviterData);
});

router.get('/date', (req, res) => {
  const { timeout } = req.query;
  if (timeout) {
    setTimeout(() => {
      res.status(200).send(new Date().toISOString());
    }, Number(timeout));
    return;
  }
  res.status(200).send(new Date().toISOString());
});

router.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

export default router;
