import { useQuery } from '@tanstack/react-query';
import { getSpendingScore, getWeeklyReport, getChatHistory } from '@/services';

export const useSpendingScore = () =>
  useQuery({ queryKey: ['reports', 'score'], queryFn: () => getSpendingScore() });

export const useWeeklyReport = () =>
  useQuery({ queryKey: ['reports', 'weekly'], queryFn: () => getWeeklyReport() });

export const useChatHistory = () =>
  useQuery({ queryKey: ['reports', 'chat'], queryFn: () => getChatHistory() });
