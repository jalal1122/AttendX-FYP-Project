import express from 'express';
import {
  createClass,
  joinClass,
  getAllClasses,
  getClassDetails,
} from '../controllers/class.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { hasRole } from '../middlewares/role.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(verifyJWT);

// Create class (Teacher and Admin only)
router.post('/create', hasRole('teacher', 'admin'), createClass);

// Join class (Student only)
router.post('/join', hasRole('student'), joinClass);

// Get all classes (All authenticated users)
router.get('/', getAllClasses);

// Get class details (All authenticated users)
router.get('/:id', getClassDetails);

export default router;
