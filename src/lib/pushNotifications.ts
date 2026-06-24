import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BEl6mribCI2bFx53-_45fdf294hfgjdfg82834jhg23jh4g23jh4g234jhg23h4g23h4g234jhg234jhg234j';

// Helper to convert base64 VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function checkNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

export async function requestAndSubscribePush(userId: string): Promise<boolean> {
  try {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      console.warn('Notifications or Service Workers not supported in this browser.');
      return false;
    }

    // 1. Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied by user.');
      return false;
    }

    // 2. Get Service Worker registration
    const registration = await navigator.serviceWorker.ready;
    
    // 3. Subscribe to push manager
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    const subscriptionJson = subscription.toJSON();
    if (!subscriptionJson.endpoint) {
      throw new Error('Subscription endpoint not generated.');
    }

    // 4. Save subscription to Supabase public.push_subscriptions
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: subscriptionJson.endpoint,
        subscription_json: subscriptionJson
      },
      { onConflict: 'endpoint' }
    );

    if (error) throw error;
    console.log('Push subscription saved successfully for user:', userId);
    return true;
  } catch (err) {
    console.error('Failed to subscribe to push notifications:', err);
    return false;
  }
}

export async function unsubscribePush(userId: string): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator)) return false;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      // Remove from database
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', endpoint);

      if (error) throw error;
      console.log('Push subscription deleted for user:', userId);
    }
    return true;
  } catch (err) {
    console.error('Failed to unsubscribe from push notifications:', err);
    return false;
  }
}
