# Release v1.4.4: .nan0 extension support

Ми успішно додали розширення `.nan0` до списку `DATA_EXTNAMES`.
Цей реліз офіційно закріплює підтримку власного формату даних.

## Scope
- Реєстрація розширення `.nan0` у `DB.DATA_EXTNAMES`.
- Реєстрація розширення `.nan0` у `Directory.DATA_EXTNAMES`.
- Верифікація, що файли з розширенням `.nan0` розпізнаються як дані (`isData`).

## Acceptance Criteria
- [x] `DB.DATA_EXTNAMES` містить `.nan0`.
- [x] `Directory.DATA_EXTNAMES` містить `.nan0`.
- [ ] `Directory.isData("file.nan0")` повертає `true`.
- [ ] `DB.isData("file.nan0")` повертає `true`.

## Architecture Audit
- [x] Чи прочитано Індекси екосистеми?
- [x] Чи існують аналоги в пакетах?
- [x] Джерела даних: .nan0 (нова підтримка)
- [x] Чи відповідає UI-стандарту?
