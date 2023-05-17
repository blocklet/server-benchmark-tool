// import middleware from '@blocklet/sdk/lib/middlewares';
import Auth from '@blocklet/sdk/lib/service/auth';
import { Router } from 'express';

const router = Router();

const client = new Auth();

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

  if (!search) {
    res.status(400).send('Missing search query');
    return;
  }

  const { users } = await await client.getUsers({ query: { search: search as string } });

  if (isReturn === '0') {
    res.status(200).json(null);
    return;
  }

  res.json(users);
});

router.get('/date', (_req, res) => res.status(200).send(new Date().toISOString()));

export default router;
