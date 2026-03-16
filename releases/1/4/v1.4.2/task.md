# Реліз v1.4.2: Збереження літеральних ключів із символом `/`

> 🇬🇧 English version: [task.en.md](./task.en.md)

## Scope

Виправити обробку YAML-ключів, що містять символ `/` (слеш), у `Data.flatten()` / `Data.unflatten()`. Наразі ключ `"Manage / Update Agent Workflows"` після roundtrip `flatten → unflatten` перетворюється на вкладений обʼєкт `{"Manage ": {" Update Agent Workflows": "..."}}`, що ламає `createT()` з `@nan0web/i18n`.

**Джерело запиту:** REQUESTS.md — Request #2026-03-16-01

## Root Cause

`Data.OBJECT_DIVIDER = '/'` використовується як роздільник шляху. `Data.flatten()` додає `/` між рівнями, а `Data.unflatten()` розбиває ключ по `/`. Якщо оригінальний ключ обʼєкта (з YAML) **вже містить** `/`, roundtrip `flatten → unflatten` руйнує структуру.

## Рішення: Екранування літеральних слешів

Стратегія **Escape/Unescape**:
- `flatten()`: якщо ключ обʼєкта містить `OBJECT_DIVIDER`, замінити його на escape-послідовність (наприклад `\\/` або `∕` — FRACTION SLASH U+2215).
- `unflatten()`: після розбиття шляху на сегменти, зворотньо замінити escape-послідовність на оригінальний символ.
- `find()`: аналогічне unescaping при пошуку по шляху.

Обрано: **подвоєння символу** (`//` → означає літеральний `/` у ключі). Це простіше за backslash-escaping і сумісне з існуючими URI, які ніколи не мають подвійних слешів (нормалізація гарантує це).

## Architecture Audit

- [x] Чи прочитано Індекси екосистеми? — Так
- [x] Чи існують аналоги в пакетах? — Ні, це ядро Data утиліт
- [x] Джерела даних: YAML, nano, md, json, csv — YAML ключі із `/`
- [x] Чи відповідає UI-стандарту? — Це внутрішній фікс ядра

## Acceptance Criteria (Definition of Done)

1. **Roundtrip**: `Data.unflatten(Data.flatten(obj))` повертає ідентичний обʼєкт, навіть якщо ключі містять `/`.
2. **`Data.find()`**: `Data.find("key with / inside", obj)` коректно знаходить значення.
3. **Зворотна сумісність**: Існуючі тести (485 pass) залишаються зеленими.
4. **`resolveReferences()`**: DB.fetch() коректно повертає обʼєкт із ключами, що містять `/`.
5. **REQUESTS.md** оновлено: статус `✅ DONE`.
