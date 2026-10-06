# Solid

Область применения: SolidJS и `@tanstack/solid-query` v5. SolidStart, роутер и React не требуются. Начните с [общей спецификации](../../SPECIFICATION.md) и [API TanStack Query](../tanstack-query/README.md).

## Реактивный consumer

`QueryClientProvider` подключает клиент. `useQuery` и `useMutation` получают accessor options: чтение props или signals выполняется внутри функции, чтобы изменение параметров обновляло observer. Результат query читается в реактивном контексте; деструктуризация значений вне него теряет отслеживание. [Quick Start](https://tanstack.com/query/latest/docs/framework/solid/quick-start).

Фрагмент внутри компонента с `props.productId: string` и `props.isPanelOpen: boolean`. QO/MO импортируются из модулей проекта, использующих Solid adapter; они сохраняют обычные именованные параметры Kit.

```ts
import { useMutation, useQuery } from '@tanstack/solid-query';
import { productRequiredDetailQO } from './product.qo';
import { productRenameMO } from './product.mo';

const productQuery = useQuery(() => ({
  ...productRequiredDetailQO({ productId: props.productId }),
  enabled: props.isPanelOpen,
}));
const rename = useMutation(() => productRenameMO());
```

Фрагмент принимает уже подготовленный ID. Если ID ещё не получен, consumer lifecycle организуется до этого участка либо используется optional-QO, типизированная для выбранного адаптера.

Изменение параметров реактивно выбирает новую QO. `enabled` принадлежит consumer, callbacks MO не заменяются. В UI читаются `productQuery.data`, `productQuery.isFetching` и состояние `rename`; полные конфиги QO остаются в своих модулях.

## Ошибки и Suspense

Solid использует собственные `Suspense` и `ErrorBoundary`. Чтение `query.data` внутри Suspense участвует в ожидании; передача ошибки в ErrorBoundary зависит от политики consumer. Сброс UI и повторный запрос согласуются по Solid API. React `QueryErrorResetBoundary` и `useSuspenseQuery` сюда не переносятся. [Suspense](https://tanstack.com/query/latest/docs/framework/solid/guides/suspense), [Quick Start: отличия адаптеров](https://tanstack.com/query/latest/docs/framework/solid/quick-start).

## SSR, если используется

Применяются [общие SSR-принципы](../../SPECIFICATION.md#общие-принципы-ssr). Solid adapter интегрирует запросы с resource lifecycle и переносом состояния Solid; механика React HydrationBoundary не является его обязательной схемой. Для SolidStart используйте [Solid Query SSR](https://tanstack.com/query/latest/docs/framework/solid/guides/ssr), сверяя поведение с установленной версией.

Проверьте смену ID, активности, фоновое обновление, восстановление ошибки и освобождение observer при завершении consumer lifecycle. Типизация фрагмента проверена с `@tanstack/solid-query@5.104.1` и SolidJS 1.9.9; runtime-интеграция приложения здесь не реализована.

[Материалы по стеку](../README.md).
