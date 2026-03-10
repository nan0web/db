> 🇬🇧 [English version](./task.en.md)

# Реліз v1.4.0: Aliases Protocol та Стабілізація

## Місія

Додати підтримку URI-aliases на рівні базового класу `DB`, виправити регресію в CrossDriver тестах, та закрити реліз v1.3.1 (міграція контрактних тестів у регресію).

## Scope

- [ ] **Aliases Protocol** (REQUESTS.md #2026-03-10-01): додати поле `aliases` в конструктор DB та метод `resolveAlias(uri)`.
- [ ] **CrossDriver test fix**: виправити 2 падаючих тести в `CrossDriver.test.js` (очікування не відповідають поведінці v1.3.3 з visited tracking).
- [ ] **Закриття v1.3.1**: міграція `releases/1/3/v1.3.1/task.spec.js` → `src/test/releases/1/3/v1.3.1/task.test.js`.

## Acceptance Criteria (Definition of Done)

- [ ] Контрактні тести `releases/1/4/v1.4.0/task.spec.js` проходять (Green).
- [ ] `npm run test:all` проходить повністю.
- [ ] `CrossDriver.test.js` — 4/4 Green.
- [ ] `aliases` підтримка інтегрована в базовий клас DB.

## Architecture Audit

- [x] Чи прочитано Індекси екосистеми? (Так — DB є ядром)
- [x] Чи існують аналоги в пакетах? (Aliases — нова функціональність, не дублюється)
- [x] Джерела даних: YAML, MD, JSON (через драйвери).
- [x] Чи відповідає UI-стандарту (Deep Linking)? (Aliases — це прозора проекція URI).
