import { Response } from 'express';
import { Notification, NotificationQueue, TeamMember } from '../models';
import { ProjectAuthRequest } from '../middleware/auth';
import { MailerService } from '../utils/mailer';

// Get notifications for user inside project context
export const getNotificationsByProject = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = req.user._id;

    const notifications = await Notification.find({
      user: userId,
      project: projectId
    }).sort({ createdAt: -1 });

    return res.json(notifications);
  } catch (err: any) {
    console.error('Error fetching notifications:', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

// Mark notification as read
export const markNotificationAsRead = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOne({
      _id: id,
      user: userId
    });

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.isRead = true;
    await notification.save();

    return res.json(notification);
  } catch (err: any) {
    console.error('Error marking notification as read:', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

// Get all notifications for user
export const getUserNotifications = async (req: ProjectAuthRequest | any, res: Response) => {
  try {
    const userId = req.user._id;
    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(50);
    return res.json(notifications);
  } catch (err: any) {
    console.error('Error fetching user notifications:', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

// Mark all notifications for user as read
export const markAllNotificationsAsRead = async (req: ProjectAuthRequest | any, res: Response) => {
  try {
    const userId = req.user._id;
    await Notification.updateMany({ user: userId, isRead: false }, { $set: { isRead: true } });
    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err: any) {
    console.error('Error marking all notifications as read:', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

// Trigger digest emails (daily/weekly)
export const triggerDigest = async (req: any, res: Response) => {
  try {
    const { frequency } = req.body;
    if (frequency !== 'daily' && frequency !== 'weekly') {
      return res.status(400).json({ message: "Invalid frequency. Must be 'daily' or 'weekly'." });
    }

    // Find unprocessed queue items
    const items = await NotificationQueue.find({ frequency, isProcessed: false })
      .populate('user')
      .populate('project');

    if (items.length === 0) {
      return res.json({ success: true, message: `No pending ${frequency} notifications to digest.` });
    }

    // Group by user ID
    const userGrouped: Record<string, { user: any; events: any[] }> = {};
    for (const item of items) {
      const u: any = item.user;
      if (!u) continue;
      const userId = u._id.toString();
      if (!userGrouped[userId]) {
        userGrouped[userId] = { user: u, events: [] };
      }
      userGrouped[userId].events.push(item);
    }

    let emailsSent = 0;
    for (const userId of Object.keys(userGrouped)) {
      const { user, events } = userGrouped[userId];
      
      // Format HTML content
      let eventsHtml = '';
      for (const event of events) {
        const projectPrefix = event.project ? `[${event.project.name}] ` : '';
        eventsHtml += `
          <div style="padding: 12px; margin-bottom: 12px; border-left: 3px solid #18181b; background-color: #f4f4f5; border-radius: 0 6px 6px 0;">
            <strong style="font-size: 14px; color: #09090b;">${projectPrefix}${event.title}</strong>
            <p style="font-size: 13px; color: #27272a; margin: 4px 0 0 0;">${event.message}</p>
            ${event.link ? `<a href="http://localhost:5173${event.link}" style="font-size: 12px; color: #71717a; text-decoration: underline; display: inline-block; margin-top: 6px;">Ir al recurso</a>` : ''}
          </div>
        `;
      }

      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #18181b; background-color: #fafafa; max-width: 600px; margin: 0 auto; border-radius: 12px; border: 1px solid #e4e4e7;">
          <div style="border-bottom: 1px solid #e4e4e7; padding-bottom: 16px; margin-bottom: 20px; text-align: center;">
            <span style="font-size: 24px; font-weight: 800; tracking: -0.05em; color: #09090b;">Thesis<span style="color: #71717a;">Flow</span></span>
            <div style="font-size: 12px; color: #71717a; margin-top: 4px; font-weight: 500;">Resumen ${frequency === 'daily' ? 'Diario' : 'Semanal'} de Actividad</div>
          </div>
          <p style="font-size: 15px; color: #09090b; margin-top: 0;">Hola, <strong>${user.name}</strong>:</p>
          <p style="font-size: 14px; color: #4b5563; margin-bottom: 20px;">Aquí tienes un resumen de la actividad reciente en tus proyectos:</p>
          
          ${eventsHtml}

          <div style="margin-top: 32px; border-top: 1px solid #e4e4e7; padding-top: 16px; font-size: 12px; color: #9ca3af; text-align: center;">
            Recibiste este resumen según tus preferencias de notificación. Puedes cambiarlas en tu <a href="http://localhost:5173/perfil" style="color: #4b5563; text-decoration: underline;">Perfil</a>.
          </div>
        </div>
      `;

      // Send the digest email
      MailerService.sendEmail(
        user.email || 'usuario@thesisflow.cl',
        user.name,
        `[ThesisFlow] Resumen ${frequency === 'daily' ? 'Diario' : 'Semanal'}`,
        emailHtml,
        frequency
      ).catch(err => {
        console.error('Error sending digest email:', err);
      });
      emailsSent++;
    }

    // Mark queue items as processed
    const itemIds = items.map(i => i._id);
    await NotificationQueue.updateMany({ _id: { $in: itemIds } }, { $set: { isProcessed: true } });

    return res.json({ success: true, message: `Successfully sent ${emailsSent} digest emails.`, count: emailsSent });
  } catch (err: any) {
    console.error('Error triggering digests:', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

// Get list of simulated sent emails
export const getSentEmailsList = async (req: any, res: Response) => {
  try {
    const emails = MailerService.getSentEmails();
    return res.json(emails);
  } catch (err: any) {
    console.error('Error reading sent emails log:', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

// Send custom email to all student members of a project
export const sendCustomEmail = async (req: any, res: Response) => {
  try {
    const { projectId, subject, body } = req.body;
    if (!projectId || !subject || !body) {
      return res.status(400).json({ message: 'Missing required fields: projectId, subject, or body' });
    }

    // Find all team members of this project
    const members = await TeamMember.find({ project: projectId }).populate('user');
    if (members.length === 0) {
      return res.status(404).json({ message: 'No members found in this project' });
    }

    const emailPromises = members
      .map(m => m.user)
      .filter((u: any) => u && u.email && (u.role === 'Creador' || u.role === 'Editor' || u.role === 'Estudiante'))
      .map((u: any) => {
        const formattedBody = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #18181b; background-color: #fafafa; max-width: 600px; margin: 0 auto; border-radius: 12px; border: 1px solid #e4e4e7;">
            <div style="border-bottom: 1px solid #e4e4e7; padding-bottom: 16px; margin-bottom: 20px; text-align: center;">
              <span style="font-size: 24px; font-weight: 800; tracking: -0.05em; color: #09090b;">Thesis<span style="color: #71717a;">Flow</span></span>
              <div style="font-size: 12px; color: #71717a; margin-top: 4px; font-weight: 500;">Mensaje del Docente Guía</div>
            </div>
            <p style="font-size: 14px; line-height: 1.6; color: #18181b; white-space: pre-wrap; margin-bottom: 24px;">${body}</p>
            <div style="margin-top: 32px; border-top: 1px solid #e4e4e7; padding-top: 16px; font-size: 12px; color: #9ca3af; text-align: center;">
              Este es un correo directo enviado por tu Docente Guía a través de <a href="http://localhost:5173" style="color: #4b5563; text-decoration: underline;">ThesisFlow</a>.
            </div>
          </div>
        `;
        return MailerService.sendEmail(
          u.email,
          u.name,
          subject,
          formattedBody,
          'comments'
        );
      });

    if (emailPromises.length === 0) {
      return res.status(400).json({ message: 'No student members with valid email addresses found' });
    }

    await Promise.all(emailPromises);

    return res.json({ success: true, message: `Email sent successfully to ${emailPromises.length} student(s).` });
  } catch (err: any) {
    console.error('Error sending custom email:', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};
