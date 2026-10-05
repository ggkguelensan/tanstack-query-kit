# TanStack Router

Область применения: приложение с TanStack Router; рекомендации по UI ниже используют React adapter. Start не требуется. Сначала прочитайте [TanStack Query](../tanstack-query/README.md) и, для React, [React](../react/README.md).

## Загрузка и ошибки маршрута

Loader получает QueryClient из router context и передаёт ресурсную QO в `qc.query`, если метод доступен. Свежесть и ожидание выбираются по [императивному контракту](../tanstack-query/README.md#императивное-выполнение). Loader координирует навигацию, Query владеет ресурсным кешем. Ошибка ожидаемого запроса передаётся route `errorComponent`; ошибка рендера может попасть туда через выбранную UI-политику. Механика описана в [External Data Loading](https://tanstack.com/router/latest/docs/guide/external-data-loading).

Восстановление различает query error reset, повторный рендер boundary и повторный запуск loader. В официальном примере `useQueryErrorResetBoundary` сбрасывается при монтировании error-компонента, а `router.invalidate()` перезапускает loaders и сбрасывает ошибки маршрута. Инвалидация маршрута не заменяет доменный cache-effect MO. Проверьте повторную попытку и уход с ошибочного маршрута с последующим возвратом. [Error handling](https://tanstack.com/router/latest/docs/guide/external-data-loading#error-handling-with-tanstack-query).

## Если используется SSR

Применяются [общие SSR-принципы](../../SPECIFICATION.md#общие-принципы-ssr); ниже — API интеграции Router.

`@tanstack/react-router-ssr-query` — отдельная интеграция для dehydration/hydration и streaming. Её provider использует тот же клиент, что loaders; существующий provider согласуется через настройки интеграции. Создание клиента и сериализация принадлежат adapter. [Query integration](https://tanstack.com/router/latest/docs/integrations/query).

[Материалы по стеку](../README.md).
