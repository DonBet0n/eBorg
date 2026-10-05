# eBorg — облік боргів між друзями

[![React Native](https://img.shields.io/badge/React_Native-0.76-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK_52-black.svg)](https://expo.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth_%2B_Firestore-orange.svg)](https://firebase.google.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)

eBorg — мобільний застосунок для обліку особистих боргів і спільних витрат. Обидві сторони боргу бачать однакові дані, баланс з кожною людиною рахується автоматично, а рахунок у кафе чи магазині можна поділити на компанію.

## Можливості

- реєстрація, вхід, профіль з іменем і фото;
- головний екран із загальним балансом і останніми операціями;
- простий борг з кількома позиціями та груповий борг зі спільними й особистими витратами;
- сканування QR-коду фіскального чека та розподіл позицій між учасниками;
- повна або часткова оплата боргу, відхилення помилкового боргу;
- push-сповіщення про нові борги та оплати;
- робота без інтернету: дані зберігаються на пристрої, а з сервера підтягуються лише зміни;
- світла й темна тема, налаштування розміру тексту та формату сум.

## Технології

| Частина | Що використано |
|---|---|
| Клієнт | React Native 0.76, Expo SDK 52, Expo Router, TypeScript |
| Сервер | Firebase Authentication, Cloud Firestore |
| Сповіщення | Expo Push Notifications |
| Збірка | EAS Build |

## Запуск

Застосунок використовує нативні модулі Firebase, тому Expo Go не підходить. Потрібна власна збірка:

```bash
npm install
eas build -p android --profile preview   # APK для встановлення на телефон
```

Для локальної розробки:

```bash
eas build -p android --profile development
npx expo start --dev-client
```

## Гілки

- `main` — стабільна версія, з якої робляться релізні збірки;
- `dev` — гілка розробки, зміни потрапляють у `main` через Pull Request.
