import { Router } from 'express';

const router = Router();

router.get('/status', (_, res) => {
  res.json({ connected: true });
});

export default router;
