import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { devLog } from './logger';

let Device: any;
let Notifications: any;

try {
  Device = require('expo-device');
  Notifications = require('expo-notifications');

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (error) {
  devLog('Push notifications are not supported in Expo Go');
}

export async function registerForPushNotificationsAsync() {
  if (!Device || !Notifications) return undefined;

  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      devLog('Failed to get push token for push notification!');
      return undefined;
    }
    
    // Learn more about projectId: https://docs.expo.dev/push-notifications/push-notifications-setup/#configure-projectid
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    
    try {
      token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
    } catch (e) {
      devLog('Push token error:', e);
      return undefined;
    }
  } else {
    devLog('Must use physical device for Push Notifications');
  }

  return token;
}

export async function sendPushNotification(expoPushToken: string | undefined, title: string, body: string) {
  if (!expoPushToken) return;

  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
  };

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}
