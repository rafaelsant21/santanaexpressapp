import { useEffect, useCallback } from 'react';

const NOTIFICATION_TITLE = '🚨 Hora de Descansar!';
const NOTIFICATION_BODY = 'Você está há mais de 3 horas em viagem. Registre sua parada no Diário de Bordo.';
const NOTIFICATION_ICON = '/icons/icon-192x192.png';

export function useTripNotifications() {
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    const result = await Notification.requestPermission();
    return result;
  }, []);

  const sendRestAlert = useCallback(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
      // Via Service Worker (funciona em background no Android)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(NOTIFICATION_TITLE, {
            body: NOTIFICATION_BODY,
            icon: NOTIFICATION_ICON,
            badge: NOTIFICATION_ICON,
            tag: 'rest-alert',
            requireInteraction: true,
            data: { url: '/diario-bordo' },
          });
        }).catch(() => {
          // Fallback para Notification direta
          new Notification(NOTIFICATION_TITLE, {
            body: NOTIFICATION_BODY,
            icon: NOTIFICATION_ICON,
            tag: 'rest-alert',
          });
        });
      } else {
        new Notification(NOTIFICATION_TITLE, {
          body: NOTIFICATION_BODY,
          icon: NOTIFICATION_ICON,
          tag: 'rest-alert',
        });
      }
    } catch (e) {
      console.warn('Notification error:', e);
    }
  }, []);

  // Solicitar permissão ao carregar (silencioso — não interrompe o fluxo)
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      // Não solicita automaticamente para não bloquear — apenas informa ao hook
    }
  }, []);

  return { requestPermission, sendRestAlert };
}
