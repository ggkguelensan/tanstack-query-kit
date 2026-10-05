# React

Область применения: React и `@tanstack/react-query`. Роутер, SSR, Suspensive и state manager не требуются. Общие границы модулей заданы в [спецификации](../../SPECIFICATION.md); методы клиента и регистрация типов — в [TanStack Query](../tanstack-query/README.md).

## С чего начать

[Каталог](catalog.md) содержит согласованные QK/QO/MO/Aggregation, инфраструктуру и consumers. Именованные TS/TSX-блоки можно собрать в одном каталоге. Проверенные версии: `@tanstack/react-query@5.104.1`, React 19.2, TypeScript 5.9. Для отдельного примера восстановления используется `react-error-boundary@6`; это выбор примера.

Consumer передаёт QO в `useQuery`, `useQueries` или `useInfiniteQuery`, MO — в `useMutation`. Динамические коллекции используют `useQueries`; hooks не вызываются в цикле или условно в одном компоненте. Каждая ветка QO содержит полный конфиг; inline-выбор через early return передаёт его в один `queryOptions`, который выводит типы из обеих веток. В inline-функции контекст `queryFn` указывается как `QueryFunctionContext`; явные generic-аргументы не требуются.

## Ошибки и Suspense

### Обычные queries и фоновые ошибки

React-consumer может передать ошибку рендера в Error Boundary через `throwOnError` по [общему распределению ответственности](../../SPECIFICATION.md#8-ошибки-и-восстановление). Consumer может передать boolean или чистый predicate, не изменяя callbacks MO.

Для обычных queries политика сохранения данных при фоновой ошибке может использовать `throwOnError: (_error, query) => query.state.data === undefined`. Это выбранное правило Kit, а не универсальный default библиотеки. Основание: [TkDodo — Status Checks](https://tkdodo.eu/blog/status-checks-in-react-query).

В v5 у `useQuery` нет `onError`; общая обработка выполняется через [QueryCache](../tanstack-query/README.md#инфраструктура-и-типы-meta). Пример глобальных уведомлений о фоновых ошибках — в [каталоге](catalog.md). См. [TkDodo — Breaking React Query's API](https://tkdodo.eu/blog/breaking-react-querys-api-on-purpose).

### Suspense и Error Boundary

Consumer выбирает `useSuspenseQuery`, `useSuspenseInfiniteQuery` или `useSuspenseQueries`. QO должна гарантировать исполняемый `queryFn`: `skipToken`, `enabled` и `placeholderData` в Suspense-consumer не используются. Неготовые обязательные параметры обрабатываются до монтирования компонента, который вызывает Suspense-hook; используются типобезопасная перегрузка QO или отдельная фабрика готового запроса с той же идентичностью ресурса.

`Suspense` отвечает за ожидание, Error Boundary — за ошибку. Ошибка query без данных передаётся ближайшему Error Boundary; при наличии данных ошибка refetch по умолчанию допускает продолжение отображения. `throwOnError` Suspense-hook не переопределяется. Если конкретный consumer должен передавать Boundary и фоновые ошибки, он явно выбрасывает `error` после завершения fetching. Это осознанное изменение UI-политики.

Повторная попытка связывает `QueryErrorResetBoundary` с `ErrorBoundary.onReset`. Кнопка восстановления вызывает `resetErrorBoundary`; сброс ошибки query и повторный рендер работают совместно. Область Boundary выбирается по области UI, которая может отказать независимо. При смене ресурса consumer определяет сброс Boundary, например через `resetKeys`. Код показан в [примере ошибок и Suspense](errors-and-suspense.md). Механика: [TanStack Query — Suspense](https://tanstack.com/query/latest/docs/framework/react/guides/suspense).

### Мутации, retry и императивные consumers

Ожидаемые ошибки мутации отображаются рядом с формой; consumer может направлять выбранные ошибки в Boundary через `useMutation({ ...operationMO(), throwOnError })`. Мутация не становится Suspense-загрузкой: pending-состоянием управляет consumer. Query reset не заменяет сброс мутации через `mutation.reset()` или её размонтирование. Повтор записи после ошибки — явное действие; автоматический retry допускается только при определённом контракте повторяемости операции. `mutateAsync` отклоняет Promise, поэтому consumer обязан обработать его; `throwOnError` не заменяет `catch`. См. [useMutation](https://tanstack.com/query/latest/docs/framework/react/reference/useMutation).

React Boundary не ловит произвольный отклонённый Promise обработчика события; он обрабатывается отдельно. Loader использует [императивный API](../tanstack-query/README.md#императивное-выполнение), framework-поведение раскрывается на странице выбранного роутера.

## Проверка интеграции

- Обычная query сохраняет данные при неудачном refetch; два observers не создают два глобальных уведомления.
- Если выбран Suspense: первая ошибка без данных попадает в Boundary; reset позволяет запросу повториться; смена ресурса сбрасывает соответствующую границу.
- Фоновая ошибка не заменяет данные Suspense fallback без явного решения consumer.
- Mutation pending отображается отдельно; mutation reset и обработка rejected `mutateAsync` проверены независимо от query reset.

[Выбор остальных материалов стека](../README.md).
