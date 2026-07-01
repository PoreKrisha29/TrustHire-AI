const { Router } = require('express');
const { z } = require('zod');
const AssistantController = require('../controllers/assistant.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate.middleware');

const router = Router();

const chatSchema = z.object({
  message:   z.string().min(1).max(4000, 'Message cannot exceed 4000 characters'),
  sessionId: z.string().uuid('Invalid session ID'),
});

router.post('/chat',    authenticate, validateBody(chatSchema), AssistantController.chat);
router.get( '/history', authenticate,                           AssistantController.getChatHistory);
router.get( '/quota',   authenticate,                           AssistantController.getQuota);

module.exports = router;
