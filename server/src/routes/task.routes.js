import { Router } from 'express';
import * as tasks from '../controllers/task.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParams } from '../validators/common.js';
import {
  bulkDeleteSchema,
  bulkUpdateSchema,
  createTaskSchema,
  listTasksQuery,
  moveTaskSchema,
  updateTaskSchema,
} from '../validators/task.validators.js';

const router = Router();
router.use(requireAuth);

router.get('/', validate({ query: listTasksQuery }), tasks.list);
router.post('/', validate({ body: createTaskSchema }), tasks.create);

// Bulk routes are registered before "/:id" so "bulk" is never parsed as an id.
router.patch('/bulk', validate({ body: bulkUpdateSchema }), tasks.bulkUpdate);
router.post('/bulk-delete', validate({ body: bulkDeleteSchema }), tasks.bulkDelete);

router.get('/:id', validate({ params: idParams }), tasks.getOne);
router.patch('/:id', validate({ params: idParams, body: updateTaskSchema }), tasks.update);
router.delete('/:id', validate({ params: idParams }), tasks.remove);
router.patch('/:id/move', validate({ params: idParams, body: moveTaskSchema }), tasks.move);
router.post('/:id/complete', validate({ params: idParams }), tasks.complete);
router.post('/:id/duplicate', validate({ params: idParams }), tasks.duplicate);
router.get('/:id/activity', validate({ params: idParams }), tasks.activity);

export default router;
