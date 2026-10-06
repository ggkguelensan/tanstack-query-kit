# Next.js

Область применения: Next.js App Router и React Query. Pages Router имеет другой lifecycle и этой страницей не описывается. Начните с [React](../react/README.md).

## Server и Client Components

[Общие SSR-принципы](../../SPECIFICATION.md#общие-принципы-ssr) задают требования к изоляции и переносу состояния; ниже — границы App Router.

Server Component может подготовить Query cache; Client Component наблюдает ресурс через QO. Provider, request-scoped QueryClient, dehydration и `HydrationBoundary` размещаются в framework adapter. Server-only зависимости не должны попадать в клиентский transport. Конкретные варианты показаны в [Advanced SSR](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr).

Next.js cache и Query cache имеют разные механизмы обновления. При сочетании серверного и клиентского чтения явно определите, какой слой владеет каждым отображаемым ресурсом и как изменения доходят до обоих lifecycle. Kit не вводит автоматическую синхронизацию кешей.

## Ошибки и восстановление

`error.tsx` задаёт UI-границу сегмента; это Client Component. Возможности восстановления и имя callback проверяются по установленной версии Next.js. Восстановление сегмента и сброс ошибки Query — разные действия: adapter связывает их, если query участвует в повторном рендере. Для локальной React Query boundary используйте [механику React](../react/README.md#ошибки-и-suspense).

Ожидаемый бизнес-отказ Server Action может быть возвращаемым результатом framework; сервисный adapter должен согласовать его с результатом операции Kit. Ошибки обработчиков событий и произвольных async-вызовов обрабатываются отдельно от ошибки рендера. [Next.js Error Handling](https://nextjs.org/docs/app/getting-started/error-handling).

[Материалы по стеку](../README.md).
