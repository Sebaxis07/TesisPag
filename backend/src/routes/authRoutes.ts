import { Router } from 'express';
import { 
  register, login, activate, getMe, getUsers, updateUserRole, 
  refresh, logout, createUser, deleteUser, updateProfile, changePassword 
} from '../controllers/authController';
import { protect, authorize, authorizeCreator } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/activate', activate);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/me', protect, getMe);
router.get('/users', protect, getUsers);
router.post('/users', protect, authorizeCreator, createUser);
router.delete('/users/:userId', protect, authorizeCreator, deleteUser);
router.put('/role', protect, authorize('Admin'), updateUserRole);
router.put('/profile', protect, updateProfile);
router.put('/profile/password', protect, changePassword);

export default router;
