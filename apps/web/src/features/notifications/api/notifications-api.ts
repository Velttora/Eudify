import { apiRequest } from '@/shared/lib/api';

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string | null;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationsListResponse = {
  unreadCount: number;
  items: NotificationRow[];
};

type GetToken = () => Promise<string | null>;

export function listNotifications(getToken: GetToken, take = 30) {
  return apiRequest<NotificationsListResponse>(`/notifications?take=${take}`, {
    getToken,
  });
}

export function markNotificationRead(getToken: GetToken, id: string) {
  return apiRequest(`/notifications/${id}/read`, {
    method: 'PATCH',
    getToken,
  });
}

export function markAllNotificationsRead(getToken: GetToken) {
  return apiRequest(`/notifications/read-all`, {
    method: 'POST',
    getToken,
  });
}
