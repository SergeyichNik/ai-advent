# TODO: AI Chat Web Application (Gemini LLM + React + Vite)

## Обзор проекта

Простое веб-приложение для чата с искусственным интеллектом. Пользователь пишет сообщение — нейросеть (Google Gemini) отвечает. Архитектура: **монорепо** с двумя пакетами — `server/` (Express API) и `client/` (React + Vite). Конфигурация хранится в `.env`-файлах каждого пакета. В dev-режиме Vite проксирует запросы к API, поэтому CORS не нужен.

---

## Стек технологий

### Backend (`server/`)
| Библиотека | Назначение |
|---|---|
| `express` | HTTP-сервер, роутинг |
| `@google/generative-ai` | Официальный SDK Google Gemini |
| `dotenv` | Загрузка переменных из `.env` |
| `nodemon` | Авто-перезапуск при изменениях (dev) |

### Frontend (`client/`)
| Библиотека | Назначение |
|---|---|
| `react` + `react-dom` | UI-библиотека |
| `vite` | Сборщик, dev-сервер с HMR |
| `@vitejs/plugin-react` | Поддержка JSX и Fast Refresh |

> **Почему нет `cors` на бэкенде?**
> В dev-режиме Vite проксирует `/api/*` на Express — браузер видит один origin. В prod — фронтенд собирается и раздаётся самим Express как статика.

---

## Бесплатные модели Gemini (актуально на март 2026)

> **Важно:** Gemini 1.0, 1.5 уже отключены (возвращают 404). Gemini 2.0 Flash задепрекейчен и отключается 24 сентября 2026. Используй только серию **2.5**.

Все три модели доступны **бесплатно без кредитки** через [Google AI Studio](https://aistudio.google.com/app/apikey).

| Модель | Строка для `.env` | RPM | RPD | Когда использовать |
|---|---|---|---|---|
| **Gemini 2.5 Flash-Lite** | `gemini-2.5-flash-lite` | 15 | 1000 | Основная модель для чата — высокий лимит, быстрая |
| **Gemini 2.5 Flash** | `gemini-2.5-flash` | 10 | 500 | Баланс качества и скорости |
| **Gemini 2.5 Pro** | `gemini-2.5-pro` | 5 | 100 | Сложные задачи, аналитика — лимит очень мал |

**Рекомендация для этого проекта:** `gemini-2.5-flash-lite` — оптимальный выбор для прототипа чата (15 запросов/мин, 1000 в день).

> У всех моделей общий лимит: **250 000 токенов в минуту** и контекстное окно **1 млн токенов**.

---

## Структура проекта

```
project-root/
├── .gitignore
├── package.json               # Корневой package.json (npm workspaces)
│
├── server/
│   ├── .env                   # Серверные секреты (НЕ коммитить!)
│   ├── .env.example
│   ├── package.json
│   └── index.js               # Express-сервер + Gemini-интеграция
│
└── client/
    ├── .env                   # Клиентские env (публичные, VITE_ префикс)
    ├── .env.example
    ├── package.json
    ├── vite.config.js         # Конфиг Vite (включая proxy)
    ├── index.html
    └── src/
        ├── main.jsx           # Точка входа React
        ├── App.jsx            # Корневой компонент
        ├── App.css
        └── components/
            ├── MessageList.jsx    # Список сообщений
            ├── MessageBubble.jsx  # Одно сообщение (user / ai)
            └── ChatInput.jsx      # Поле ввода + кнопка
```

---

## Файлы `.env`

### `server/.env`
```env
# Google Gemini API Key
# Получить на: https://aistudio.google.com/app/apikey (бесплатно, без кредитки)
GEMINI_API_KEY=your_gemini_api_key_here

# Бесплатные модели Gemini 2.5 (выбери одну):
#   gemini-2.5-flash-lite  → 15 RPM, 1000 RPD  (рекомендуется для прототипа)
#   gemini-2.5-flash       → 10 RPM,  500 RPD
#   gemini-2.5-pro         →  5 RPM,  100 RPD  (только для сложных задач)
GEMINI_MODEL=gemini-2.5-flash-lite

# Порт Express-сервера
PORT=3001

# Системный промпт
SYSTEM_PROMPT=You are a helpful and friendly AI assistant. Answer clearly and concisely.
```

### `client/.env`
```env
# Заголовок приложения (пример публичной переменной)
VITE_APP_TITLE=AI Chat
```

> **Важно:** Vite раскрывает в браузер только переменные с префиксом `VITE_`.
> Никогда не кладите `GEMINI_API_KEY` в `client/.env` — это уйдёт в бандл!

---

## Задачи (по порядку выполнения)

### 1. Инициализация монорепо

```bash
mkdir ai-chat && cd ai-chat
```

Создать корневой `package.json` с workspaces:
```json
{
  "name": "ai-chat",
  "private": true,
  "workspaces": ["server", "client"],
  "scripts": {
    "dev": "concurrently \"npm run dev --workspace=server\" \"npm run dev --workspace=client\"",
    "build": "npm run build --workspace=client",
    "start": "npm run start --workspace=server"
  },
  "devDependencies": {
    "concurrently": "^8.0.0"
  }
}
```

Установить `concurrently` в корне:
```bash
npm install
```

---

### 2. Настроить `server/`

```bash
mkdir server && cd server
npm init -y
npm install express @google/generative-ai dotenv
npm install --save-dev nodemon
```

Скрипты в `server/package.json`:
```json
"scripts": {
  "dev": "nodemon index.js",
  "start": "node index.js"
}
```

---

### 3. Реализовать `server/index.js`

Сервер должен:
- Загружать `server/.env` через `dotenv`
- Инициализировать Gemini-клиент с ключом из `GEMINI_API_KEY`
- Подключить `express.json()` для парсинга тела запросов
- Реализовать POST `/api/chat`:
  - Принимает `{ message: string, history: Array }`
  - Создаёт чат-сессию Gemini с переданной историей
  - Возвращает `{ reply: string }`
- В **production** (`NODE_ENV=production`) раздавать `../client/dist` как статику
- Обрабатывать ошибки, возвращать `{ error: string }` со статусом 500

**Пример реализации:**
```js
require("dotenv").config();
const express = require("express");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash-lite",
      systemInstruction: process.env.SYSTEM_PROMPT,
    });

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(message);
    const reply = result.response.text();

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Статика в prod
if (process.env.NODE_ENV === "production") {
  const path = require("path");
  app.use(express.static(path.join(__dirname, "../client/dist")));
  app.get("*", (_, res) =>
    res.sendFile(path.join(__dirname, "../client/dist/index.html"))
  );
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
```

---

### 4. Настроить `client/` (React + Vite)

```bash
cd ..
npm create vite@latest client -- --template react
cd client
npm install
```

---

### 5. Настроить `client/vite.config.js`

Прокси — ключевой момент. Все запросы `/api/*` перенаправляются на Express:

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
```

---

### 6. Реализовать компоненты React

#### `src/App.jsx`
- Хранит состояние: `messages` (массив `{ role, text }`) и `isLoading`
- Хранит `history` в `useRef` — массив в формате Gemini `{ role, parts: [{ text }] }`
- Функция `sendMessage(text)`:
  1. Добавляет сообщение пользователя в `messages`
  2. Добавляет в `history` запись `{ role: "user", parts: [{ text }] }`
  3. Ставит `isLoading = true`
  4. Делает `fetch("POST /api/chat", { message: text, history })`
  5. Получает `reply`, добавляет в `messages` и `history` с `role: "model"`
  6. Снимает `isLoading`
  7. При ошибке — добавляет сообщение с `role: "error"`

#### `src/components/MessageList.jsx`
- Принимает `messages` и `isLoading`
- Рендерит список `<MessageBubble>` для каждого сообщения
- Если `isLoading` — показывает анимированный индикатор ("AI is thinking...")
- `useEffect` + `useRef` для автоскролла вниз при новых сообщениях

#### `src/components/MessageBubble.jsx`
- `role === "user"` → пузырёк справа
- `role === "model"` → пузырёк слева
- `role === "error"` → красный текст ошибки

#### `src/components/ChatInput.jsx`
- Управляемый `<textarea>`
- `Enter` — отправить, `Shift+Enter` — перенос строки
- `disabled` при `isLoading` или пустом вводе
- После отправки — очистить поле

---

### 7. Создать `.gitignore` в корне

```
node_modules/
server/.env
client/.env
client/dist/
```

---

## Запуск и отладка локально

```bash
# 1. Скопировать конфиги
cp server/.env.example server/.env
cp client/.env.example client/.env

# 2. Вставить GEMINI_API_KEY в server/.env
#    Ключ получить на: https://aistudio.google.com/app/apikey

# 3. Установить все зависимости (из корня)
npm install

# 4. Запустить оба сервера одновременно
npm run dev

# Vite:    http://localhost:5173  ← открывать в браузере
# Express: http://localhost:3001  ← только API
```

### Проверка API вручную (curl)
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello! Who are you?", "history": []}'
```

Ожидаемый ответ: `{"reply": "..."}`

---

## Сборка для production

```bash
npm run build
NODE_ENV=production npm run start
# http://localhost:3001
```

---

## Возможные ошибки и решения

| Ошибка | Причина | Решение |
|---|---|---|
| `400 API key not valid` | Неверный ключ | Проверить `GEMINI_API_KEY` в `server/.env` |
| `404 model not found` | Устаревшая модель (1.x, 2.0) | Использовать только `gemini-2.5-*` модели |
| `429 RESOURCE_EXHAUSTED` | Превышен лимит RPM/RPD | Подождать или переключиться на `gemini-2.5-flash-lite` (15 RPM, 1000 RPD) |
| `Failed to fetch /api/chat` | Express не запущен | Убедиться, что оба процесса (`npm run dev`) работают |
| `EADDRINUSE` | Порт занят | Изменить `PORT` в `server/.env` или `server.port` в `vite.config.js` |
| Переменная `undefined` на клиенте | Нет префикса `VITE_` | Переименовать переменную → `VITE_XXX` |
| HMR не работает | Firewall блокирует WebSocket | Добавить `hmr: { port: 5173 }` в `vite.config.js` |

---

## Критерии готовности

- [ ] `npm run dev` из корня поднимает и Vite, и Express без ошибок
- [ ] Страница открывается на `http://localhost:5173`
- [ ] Пользователь отправляет сообщение и получает ответ от Gemini
- [ ] История диалога сохраняется в рамках сессии (контекст не теряется)
- [ ] HMR работает — изменения в `.jsx` применяются без перезагрузки страницы
- [ ] При ошибке API пользователь видит понятное сообщение в чате
- [ ] `GEMINI_API_KEY` есть только в `server/.env`, не попадает в бандл
- [ ] `npm run build` + `NODE_ENV=production npm start` работает как единое приложение
