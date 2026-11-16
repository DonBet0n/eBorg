# eBorg — облік боргів між друзями 💰

[![CI](https://github.com/DonBet0n/eBorg/actions/workflows/ci.yml/badge.svg)](https://github.com/DonBet0n/eBorg/actions/workflows/ci.yml)
[![React Native](https://img.shields.io/badge/React_Native-0.76-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK_52-black.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth_%7C_Firestore-orange.svg)](https://firebase.google.com/)

eBorg — мобільний застосунок для обліку особистих боргів і спільних витрат між друзями. Поточна версія — **2.1.1**.

## 🚀 Можливості

- 💳 Особисті борги: хто кому і скільки винен, з описом і датою
- 👥 Групові витрати: суму автоматично ділять між кількома учасниками
- 🧾 Сканування QR-коду чека та фото чека камерою
- 📊 Підсумковий баланс і детальна історія з кожною людиною
- 🔔 Push-сповіщення про нові борги (Expo Notifications)
- 📴 Офлайн-кеш даних (AsyncStorage + NetInfo)
- 🌙 Світла й темна теми, власний колір акценту
- 🔐 Реєстрація та вхід через Firebase Auth, доступ до даних обмежений правилами Firestore

## 🛠 Технічний стек

| Шар | Технології |
|---|---|
| Застосунок | React Native 0.76, Expo SDK 52, TypeScript |
| Навігація | Expo Router (file-based routing) |
| Бекенд | Firebase: Authentication, Cloud Firestore (`@react-native-firebase`) |
| Стан | React Context API |
| Тести | Jest (`jest-expo`) для логіки, Python + Selenium для E2E (web) |
| Збірка | EAS Build |

## 📁 Структура

```
app/              екрани (Expo Router): index.tsx — вхід/реєстрація, (tabs)/ — основні вкладки
components/       UI-компоненти (auth/, ui/, AddScreen/, DetailsScreen/, HomeScreen/)
contexts/         Firebase, тема, свайпи вкладок; сюди кладеться google-services.json
utils/            розрахунок боргів, кеш, push-сповіщення, ініціалізація Firebase
firestore.rules   правила безпеки Firestore
e2e/              E2E-тести (pytest + Selenium)
```

## ⚙️ Запуск локально

Потрібні Node.js 20+, npm і Android Studio (емулятор) або фізичний Android-пристрій.

```bash
git clone https://github.com/DonBet0n/eBorg.git
cd eBorg
npm install
```

### 1. Налаштування Firebase

Конфігурація Firebase **не зберігається в репозиторії**.

1. Створіть проєкт у [Firebase Console](https://console.firebase.google.com/), увімкніть **Authentication → Email/Password** і **Cloud Firestore**.
2. Додайте Android-застосунок з package name `yaroslav.eborg`, завантажте `google-services.json` і покладіть його в `contexts/google-services.json` (зразок структури — `contexts/google-services.example.json`).
3. Для web-версії скопіюйте `.env.example` у `.env.local` і заповніть змінні `EXPO_PUBLIC_FIREBASE_*`.

### 2. Запуск

`@react-native-firebase` не працює в Expo Go, тому потрібен development build:

```bash
npm run android     # збирає dev-клієнт і запускає на емуляторі/пристрої
npm start           # лише Metro, якщо dev-клієнт уже встановлено
npm run web         # web-версія (потрібен .env.local)
```

### 3. Правила Firestore

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules --project <your-project-id>
```

## 🧪 Перевірки та тести

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm test            # юніт-тести Jest (npm run test:watch — режим спостереження)
```

E2E-тести працюють з web-версією, яку треба запустити заздалегідь (`npm run web`):

```bash
cd e2e
pip install -r requirements.txt
pytest                       # EBORG_URL=http://localhost:8081 за замовчуванням
HEADLESS=0 pytest            # з видимим вікном браузера
```

Тест успішного входу запускається лише з тестовим акаунтом: задайте `EBORG_EMAIL` і `EBORG_PASSWORD`.

GitHub Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml)) запускає typecheck, lint і юніт-тести на кожен push і PR.

## 📦 Збірка (EAS)

```bash
npx eas build --profile preview --platform android      # APK для тестування
npx eas build --profile production --platform android
```

EAS бере файли за правилами `.easignore`, тому локальний `contexts/google-services.json` потрапляє у збірку, хоча Git його ігнорує.

## 📝 Плани

- [ ] Інтеграція з платіжними системами
- [ ] Експорт звітів
- [ ] Розширена аналітика
- [ ] Версія для iOS
