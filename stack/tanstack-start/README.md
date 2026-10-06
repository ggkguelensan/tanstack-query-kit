# TanStack Start

Область применения: TanStack Start с React и TanStack Query. Эта страница дополняет [React](../react/README.md) и [TanStack Router](../tanstack-router/README.md).

## Серверная граница

Server function служит границей серверного выполнения: привилегированные операции не помещаются в обычный loader, который может выполняться и в браузере. В Kit вызов серверной функции адаптируется к transport-контракту QO/MO. Проверка входа и серверная авторизация остаются на сервере; типы frontend их не заменяют. [Server Functions](https://tanstack.com/start/latest/docs/framework/react/guide/server-functions), [Query in Start](https://tanstack.com/start/latest/docs/framework/react/guide/tanstack-query).

Framework adapter различает ошибки операции и сигналы маршрутизации. При переносе ошибки через серверную границу проверяется реально доступная клиенту форма; доменная классификация не должна зависеть от непроверенного сохранения prototype серверного класса.

## Клиент, SSR и streaming

Обоснование изоляции и переноса состояния находится в [общих SSR-принципах](../../SPECIFICATION.md#общие-принципы-ssr). Здесь описаны точки подключения Start.

Клиент создаётся внутри `getRouter`: Start создаёт router на SSR request, браузер сохраняет его при навигации. Интеграция `@tanstack/react-router-ssr-query` отвечает за provider и перенос кеша. Критичные для страницы queries ожидаются в loader; второстепенные могут streaming-рендериться с собственной UI-границей. Их императивные Promise также обрабатывают rejection. [Setup и streaming](https://tanstack.com/start/latest/docs/framework/react/guide/tanstack-query).

Документация framework может показывать invalidation в компоненте; при внедрении Kit этот cache-effect размещается в MO по [общей спецификации](../../SPECIFICATION.md#5-mutation-options-mots). Проверьте изоляцию requests, hydration и успешную запись без дублирования cache-effect.

[Материалы по стеку](../README.md).
