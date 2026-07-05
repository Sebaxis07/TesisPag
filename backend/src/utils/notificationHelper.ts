import { User, Notification, NotificationQueue } from '../models';
import { MailerService } from './mailer';

export const notifyUser = async (
  userId: string | any,
  projectId: string | any,
  category: 'comments' | 'evaluations' | 'milestones' | 'meetings' | 'security',
  title: string,
  message: string,
  link?: string
) => {
  try {
    // 1. Fetch user to check notificationSettings
    const user = await User.findById(userId);
    if (!user) {
      console.warn(`User ${userId} not found for notification propagation.`);
      return;
    }

    // 2. Resolve user preference for this category
    const settings = user.notificationSettings || {
      comments: 'app',
      evaluations: 'immediate',
      milestones: 'immediate',
      meetings: 'daily',
      security: 'immediate'
    };

    const userPref = settings[category] || 'immediate';

    // 3. If disabled completely, return
    if (userPref === 'disabled') {
      return;
    }

    // 4. In all other cases ('immediate', 'app', 'daily', 'weekly'), create in-app notification first
    await Notification.create({
      user: userId,
      project: projectId,
      message: `${title}: ${message}`,
      link,
      isRead: false
    });

    // 5. Check e-mail notification rules
    if (userPref === 'immediate') {
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; color: #18181b; background-color: #fafafa; max-width: 600px; margin: 0 auto; border-radius: 12px; border: 1px solid #e4e4e7;">
          <div style="border-bottom: 1px solid #e4e4e7; padding-bottom: 16px; margin-bottom: 20px; text-align: center;">
            <span style="font-size: 24px; font-weight: 800; tracking: -0.05em; color: #09090b;">Thesis<span style="color: #71717a;">Flow</span></span>
          </div>
          <h3 style="margin: 0 0 10px 0; color: #09090b; font-size: 18px; font-weight: 600;">${title}</h3>
          <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin-bottom: 24px;">${message}</p>
          ${link ? `
            <div style="text-align: center; margin: 24px 0;">
              <a href="http://localhost:5173${link}" style="background-color: #18181b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 500; display: inline-block; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05);">Ver en la Plataforma</a>
            </div>
          ` : ''}
          <div style="margin-top: 32px; border-top: 1px solid #e4e4e7; padding-top: 16px; font-size: 12px; color: #9ca3af; text-align: center;">
            Recibiste este correo de inmediato según tus preferencias de notificación para <strong>${category}</strong>. 
            Puedes gestionar tus preferencias en cualquier momento desde <a href="http://localhost:5173/perfil" style="color: #4b5563; text-decoration: underline;">Mi Perfil</a>.
          </div>
        </div>
      `;
      MailerService.sendEmail(
        user.email || 'usuario@thesisflow.cl',
        user.name,
        `[ThesisFlow] ${title}`,
        emailHtml,
        category
      ).catch(err => {
        console.error('Error sending email in background:', err);
      });
    } else if (userPref === 'daily' || userPref === 'weekly') {
      // Queue it up!
      await NotificationQueue.create({
        user: userId,
        project: projectId,
        category,
        title,
        message,
        link,
        frequency: userPref as 'daily' | 'weekly',
        isProcessed: false
      });
      console.log(`Notification queued for digest (${userPref}): ${title}`);
    }
  } catch (err) {
    console.error('Error in notifyUser helper:', err);
  }
};
