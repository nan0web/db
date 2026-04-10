# Release v1.4.8: Domain Export & Types Refinement

## Scope
- Реструктуризація експорту доменних моделей: виокремлення `DBConfig` та `RevisionInfo` у `src/domain/index.js` для полегшення доступу з інших пакетів.
- Перекваліфікація імпорту ієрархії: доменні моделі повинні наслідувати `Model` з пакету `@nan0web/types`, а не `@nan0web/core` для розриву транзитивних залежностей.
- Адаптація типізації JSDoc: вирішення конфліктів типу `DBDriverProtocol` із базовим класом (перейменування на `DBProtocolName`) та додавання `Partial<>` для `options` у конструкторі.
- Збереження `export default DB` як спадку для зворотної сумісності (cross-package dependency).

## Acceptance Criteria (Definition of Done)
- [x] Експорт `DBConfig` та `RevisionInfo` доступний безпосередньо з `src/domain/index.js`.
- [x] `import DB from '@nan0web/db'` працює і не ламає парсинг (legacy support).
- [x] Тип `DBProtocolName` успішно експортується для уникнення колізії з класом `DBDriverProtocol`.
- [x] Архітектурні виключення прописані у `next.md`.
- [ ] Оновлено `package.json` та `CHANGELOG.md` до версії `1.4.8`.

## Architecture Audit
- [x] Чи прочитано Індекси екосистеми?
- [x] Чи існують аналоги в пакетах?
- [x] Джерела даних: JS об'єкти / type definitions.
- [x] Чи відповідає UI-стандарту (Deep Linking)? (N/A — lower level)
