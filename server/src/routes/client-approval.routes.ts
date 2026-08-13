import { Router } from 'express';
import { getReviewPage, postClientAction } from '../controllers/client-approval.controller';

const router = Router();

/**
 * Public Scanner-Safe Client Approval / Rejection Routes
 * Client does not require login; authentication is provided by the single-use 256-bit cryptographically secure token.
 */
router.get('/review/:token', getReviewPage);
router.post('/submit', postClientAction);

// Convenience direct redirects from email links
router.get('/approve/:token', (req, res) => {
  res.redirect(`/api/client-actions/review/${req.params.token}?action=approve`);
});

router.get('/reject/:token', (req, res) => {
  res.redirect(`/api/client-actions/review/${req.params.token}?action=reject`);
});

export default router;
