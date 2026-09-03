import { Router } from 'express';
import { translateText } from '../controllers/translation.controller';

const router = Router();

router.post('/', translateText);

export default router;
