import { Router } from 'express';
import * as workflow from '../controllers/workflow.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createStageSchema,
  deleteStageQuery,
  reorderStagesSchema,
  stageParams,
  updateStageSchema,
} from '../validators/workflow.validators.js';

const router = Router();
router.use(requireAuth);

router.get('/', workflow.get);
router.get('/stats', workflow.stats);
router.post('/stages', validate({ body: createStageSchema }), workflow.addStage);
router.put('/stages/order', validate({ body: reorderStagesSchema }), workflow.reorderStages);
router.patch('/stages/:stageId', validate({ params: stageParams, body: updateStageSchema }), workflow.updateStage);
router.delete('/stages/:stageId', validate({ params: stageParams, query: deleteStageQuery }), workflow.deleteStage);

export default router;
