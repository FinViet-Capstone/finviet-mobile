import { useQuery } from '@tanstack/react-query';
import { getNotifications, getUnreadNotifications } from '@/services';

export const useNotifications = () =>
  useQuery({ queryKey: ['notifications'], queryFn: () => getNotifications() });

export const useUnreadNotifications = () =>
  useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => getUnreadNotifications(),
  });
