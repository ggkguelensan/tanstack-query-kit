# Angular

Область применения: Angular и `@tanstack/angular-query-experimental`. Роутер и SSR не требуются. Начните с [общей спецификации](../../SPECIFICATION.md) и [API TanStack Query](../tanstack-query/README.md). Адаптер имеет experimental-статус; фиксируется точная версия, поскольку breaking changes допустимы и в patch-релизах. [Overview](https://tanstack.com/query/latest/docs/framework/angular/overview).

## Signals и injection context

`provideTanStackQuery` подключает клиент через providers. `injectQuery` и `injectMutation` создаются в injection context. Options callback читает signals и пересчитывает QO при их изменении. Состояние результата также читается через signals, например `productQuery.data()` и `productQuery.isFetching()`. [Quick Start](https://tanstack.com/query/latest/docs/framework/angular/quick-start).

Фрагмент полей компонента с signals `productId: Signal<string>` и `isPanelOpen: Signal<boolean>`. QO/MO импортируются из модулей проекта, использующих Angular adapter.

```ts
import { injectMutation, injectQuery } from '@tanstack/angular-query-experimental';
import { productRequiredDetailQO } from './product.qo';
import { productRenameMO } from './product.mo';

readonly productQuery = injectQuery(() => ({
  ...productRequiredDetailQO({ productId: this.productId() }),
  enabled: this.isPanelOpen(),
}));
readonly rename = injectMutation(() => productRenameMO());
```

Фрагмент принимает уже подготовленный ID. Если ID ещё не получен, consumer lifecycle организуется до этого участка либо используется optional-QO, типизированная для выбранного адаптера.

QO получает обычный именованный объект, а `.qk` — значения ID и фильтров, без Angular signals. DI-зависимости разрешаются в допустимом injection context; асинхронный `queryFn` не предполагает, что `inject()` можно вызвать позднее в произвольном callback. [Angular injection context](https://angular.dev/guide/di/dependency-injection-context).

## Transport, ошибки и mutation lifecycle

Transport может использовать HttpClient, но QO ожидает Promise. Преобразование Observable в Promise не заменяет обработку HTTP-ошибок и передачу отмены: adapter должен связать AbortSignal с прекращением запроса. [Data fetching clients](https://tanstack.com/query/latest/docs/framework/angular/angular-httpclient-and-other-data-fetching-clients).

Consumer показывает pending/error через signals. `injectMutation` получает полную MO и сохраняет её callbacks и meta executor; consumer не повторяет cache-effects из примеров framework. Ошибка Promise обрабатывается независимо от UI. Angular `ErrorHandler` не является аналогом React ErrorBoundary с автоматическим восстановлением query. [Mutations](https://tanstack.com/query/latest/docs/framework/angular/guides/mutations), [Angular error handling](https://angular.dev/best-practices/error-handling).

## SSR, если используется

Применяются [общие SSR-принципы](../../SPECIFICATION.md#общие-принципы-ssr). Request-scoped providers, ожидание query и перенос кеша принадлежат SSR adapter. Angular hydration и HttpClient transfer cache не означают автоматическую hydration QueryCache; состав интеграции проверяется отдельно. [Angular hydration](https://angular.dev/guide/hydration), [HTTP transfer cache](https://angular.dev/guide/ssr#caching-data-when-using-httpclient).

Проверьте смену signals, lifetime injection context, отказ и отмену запроса, callbacks MO и очистку subscriptions. Типизация фрагмента проверена с `@tanstack/angular-query-experimental@5.104.1` и Angular 20.3.0; runtime-интеграция приложения здесь не реализована.

[Материалы по стеку](../README.md).
