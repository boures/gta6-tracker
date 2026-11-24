# GTA VI Port Tracker — инструкция по запуску

**Как это устроено.** Публичный сайт — статические файлы на GitHub Pages. Админка (`/admin/`) — страница на том же сайте, но вся «защита» живёт на сервере: маленький бесплатный Cloudflare Worker проверяет пароль и сам сохраняет изменения в файл `data/tracker.json` в вашем репозитории (через токен GitHub, который хранится только в Cloudflare). После сохранения GitHub автоматически пересобирает сайт за 1–2 минуты. Пароль и токены в публичный код не попадают.

## Шаг 1. Аккаунты
1. Создайте аккаунт на https://github.com (кнопка **Sign up**).
2. Создайте аккаунт на https://dash.cloudflare.com/sign-up (бесплатный тариф).
Никаких программ устанавливать не нужно — всё делается в браузере. (Для проверки на своём компьютере понадобится Python, см. шаг 4.)

## Шаг 2. Репозиторий на GitHub
1. На github.com нажмите **+** (справа вверху) → **New repository**.
2. Repository name: `gta6-tracker`. Выберите **Public**. Нажмите **Create repository**.

## Шаг 3. Загрузка файлов
1. Распакуйте архив `gta6-tracker.zip` на компьютере.
2. В репозитории нажмите **uploading an existing file** (или **Add file → Upload files**).
3. Перетащите в окно **содержимое** папки (`index.html`, `config.js`, папки `admin`, `assets`, `data`, `worker`, файл `README.md`). Нажмите **Commit changes**.
4. Папка `.github` скрытая и часто не загружается перетаскиванием. Проверьте: если в репозитории её нет — нажмите **Add file → Create new file**, в поле имени введите `.github/workflows/pages.yml` (слэши создадут папки), вставьте содержимое файла `pages.yml` из архива и нажмите **Commit changes**.

## Шаг 4. Проверка на своём компьютере (по желанию)
1. Установите Python с python.org (при установке отметьте **Add python.exe to PATH**).
2. Откройте папку проекта, в адресной строке проводника введите `cmd` и Enter.
3. Выполните `python -m http.server 8000` и откройте http://localhost:8000. Публичная часть работает; админка заработает после шага 6–7.

## Шаг 5. Включение GitHub Pages
1. Репозиторий → **Settings** → слева **Pages**.
2. В блоке **Build and deployment → Source** выберите **GitHub Actions**.
3. Перейдите на вкладку **Actions**, дождитесь зелёной галочки у «Deploy to GitHub Pages» (если не запустилось: выберите workflow → **Run workflow**).
4. Адрес сайта: `https://ВАШ-ЛОГИН.github.io/gta6-tracker/` (также он показан в **Settings → Pages**).

## Шаг 6. Токен GitHub (разрешение сохранять данные)
1. Аватар справа вверху → **Settings** → в самом низу слева **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. Token name: `tracker`. Expiration: на ваше усмотрение (запишите дату, когда нужно будет выпустить новый).
3. **Repository access** → **Only select repositories** → выберите `gta6-tracker`.
4. **Permissions → Repository permissions → Contents → Read and write**.
5. **Generate token** и скопируйте его (`github_pat_...`). Он показывается один раз. Никому его не отправляйте.

## Шаг 7. Cloudflare Worker (сервер)
1. https://dash.cloudflare.com → **Workers & Pages** → **Create** → **Create Worker**. Имя: `gta6-tracker-api` → **Deploy**.
2. Нажмите **Edit code**, удалите весь код, вставьте содержимое файла `worker/index.js`, нажмите **Deploy**.
3. Откройте воркер → **Settings** → **Variables and Secrets** → **Add**:
   - Type **Text**: `GITHUB_REPO` = `ВАШ-ЛОГИН/gta6-tracker`
   - Type **Text**: `GITHUB_BRANCH` = `main`
   - Type **Text**: `ALLOWED_ORIGIN` = `https://ВАШ-ЛОГИН.github.io` (без слэша в конце и без `/gta6-tracker`)
   - Type **Secret**: `ADMIN_PASSWORD` = ваш пароль администратора (длинный, от 16 символов)
   - Type **Secret**: `SESSION_SECRET` = любая длинная случайная строка (50+ символов)
   - Type **Secret**: `GITHUB_TOKEN` = токен из шага 6
   Нажмите **Deploy** (или **Save and deploy**).
4. Скопируйте адрес воркера (вида `https://gta6-tracker-api.ВАШ-АККАУНТ.workers.dev`) со страницы воркера.
5. В репозитории откройте `config.js` → значок карандаша → замените адрес на ваш → **Commit changes**.
6. Рекомендуется: в Cloudflare → **Security → WAF → Rate limiting rules** добавьте правило на путь `/api/login` (например, 5 запросов в минуту) для защиты от подбора пароля.

## Шаг 8. Вход в админку
Откройте `https://ВАШ-ЛОГИН.github.io/gta6-tracker/admin/`, введите пароль. Слева разделы: Обзор, Проекты, Новости, Watchlist, Инструменты, Статистика и секции. Меняйте данные кнопками «Добавить», «Изменить», «Удалить», проверьте результат кнопкой **Предпросмотр**, затем нажмите **Сохранить изменения**. Через 1–2 минуты (вкладка Actions покажет ход публикации) изменения появятся на публичном сайте.

## Как обновлять в будущем
- Содержимое — только через админку.
- Смена пароля: Cloudflare → воркер → Settings → Variables and Secrets → `ADMIN_PASSWORD` → Edit.
- Смена оформления: правьте файлы в репозитории (карандаш → Commit changes).
- Когда истечёт токен GitHub, создайте новый (шаг 6) и обновите секрет `GITHUB_TOKEN`.

## Заметки
- Все данные в проекте демонстрационные (отмечены плашкой). Уберите плашку в «Статистика и секции».
- Изображения и видео подключаются ссылками (загрузка файлов не реализована, чтобы не раздувать репозиторий).
- Дизайн повторяет структуру и дух portwatch-vi.xyz, но код, тексты и оформление собственные. Автоматического сборщика данных («scout») нет: данные вводятся вручную.
- Если в админке ошибка «Данные изменились в другом месте» — обновите страницу.
