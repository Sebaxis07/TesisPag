import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, TeamMember } from '../models';

export interface AuthRequest extends Request {
  user?: any;
}

export interface ProjectAuthRequest extends AuthRequest {
  projectRole?: 'Admin' | 'Editor' | 'Viewer';
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

      req.user = await User.findById(decoded.id).select('-passwordHash');
      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }
      if (req.user.role === 'Creador') {
        req.user.role = 'Admin';
      }
      return next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: `Role ${req.user.role} does not have permission to perform this action.` });
    }
    next();
  };
};

export const checkProjectPermission = (requiredRoles: Array<'Admin' | 'Editor' | 'Viewer'>) => {
  return async (req: ProjectAuthRequest, res: Response, next: NextFunction) => {
    try {
      // Find project context
      const projectId = req.params.projectId || req.body.projectId || req.query.projectId || req.body.project;
      if (!projectId) {
        return res.status(400).json({ message: 'Project context (projectId) is required for this action.' });
      }

      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // If user is a system Admin, grand access
      if (req.user.role === 'Admin') {
        req.projectRole = 'Admin';
        return next();
      }

      const membership = await TeamMember.findOne({ project: projectId, user: req.user._id });
      if (!membership) {
        return res.status(403).json({ message: 'Access denied. You are not a member of this project.' });
      }

      if (!requiredRoles.includes(membership.role)) {
        return res.status(403).json({ message: `Access denied. Requires project role(s): ${requiredRoles.join(', ')}` });
      }

      req.projectRole = membership.role;
      return next();
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Server error checking project permissions.' });
    }
  };
};

export const getProjectRole = async (userId: string, projectId: string): Promise<'Admin' | 'Editor' | 'Viewer' | null> => {
  const membership = await TeamMember.findOne({ project: projectId, user: userId });
  return membership ? membership.role : null;
};
