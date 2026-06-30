import { Router } from 'express';
import { register, login, getMe, getUsers, updateUserRole, refresh, logout } from '../controllers/authController';
import { protect, authorize } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', protect, getMe);
router.get('/users', protect, getUsers);
router.put('/role', protect, authorize('Admin'), updateUserRole);

export default router;
