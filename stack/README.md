# Материалы по стеку

Начните с [общей спецификации](../SPECIFICATION.md) и [внедрения](../ADOPTION.md). Затем открывайте только страницы технологий, которые есть в проекте. Наличие TanStack Query не предполагает конкретный UI-framework, роутер, SSR или дополнительный state manager.

| Материал | Когда нужен | Что раскрывает |
| --- | --- | --- |
| [TanStack Query](tanstack-query/README.md) | При выборе версии и конкретного API | Императивное выполнение, типы ошибок, meta и инфраструктура |
| [React](react/README.md) | Используется React adapter | Hooks, сквозной пример, опциональные Suspense и Error Boundary |
| [Solid](solid/README.md) | Используется Solid adapter | Accessors, reactive result, Solid Suspense и SSR |
| [Vue](vue/README.md) | Используется Vue adapter | Refs/computed, setup lifecycle, ошибки и SSR |
| [Angular](angular/README.md) | Используется Angular adapter | Signals, injection context, HttpClient и SSR |
| [TanStack Router](tanstack-router/README.md) | Используется этот роутер | Loaders, ошибки маршрутов и согласование reset |
| [TanStack Start](tanstack-start/README.md) | Используется Start с React | Серверные функции, SSR и интеграция с Query |
| [Next.js](nextjs/README.md) | Используется Next.js App Router | Server/Client Components, hydration и границы ошибок сегмента |
| [Suspensive](suspensive/README.md) | Выбраны пакеты Suspensive | Фильтрация ошибок, reset и declarative Query consumer |
| [Effector](effector/README.md) | Используется Effector | Сценарные эффекты и UI-state рядом с Query cache |

Правила конкретной технологии применяются только в её заявленной области и сохраняют общие границы Kit.

Страницы дополняют друг друга по составу проекта. Для проекта без роутера достаточно TanStack Query и материала своего UI-adapter: React, Solid, Vue или Angular. Для Start добавляются Router и Start; для Next.js — Next.js; Suspensive и Effector выбираются независимо. Отдельный обязательный «full TanStack stack» не вводится.

## Как развивать документацию

Общие границы ответственности и инварианты меняются в `SPECIFICATION.md`. Версионные API, imports, setup, ограничения lifecycle и примеры находятся в каталоге соответствующей технологии. Страница указывает область применения и ссылается на общие правила вместо их копирования. Сквозной пример хранится один раз; другие страницы ссылаются на него.

Consumer-фрагменты Solid, Vue и Angular имеют отдельно проверенную типизацию. Страницы интеграций задают границы внедрения и ссылки на официальные API; они не заявляют наличие готового или протестированного runtime adapter в этом репозитории.
