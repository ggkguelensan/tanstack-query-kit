# React: ошибки и Suspense

Область применения: React, TanStack Query v5 и выбранная библиотека Error Boundary. [Механика React](README.md#ошибки-и-suspense).

Правила находятся в [спецификации, разделе 8](../../SPECIFICATION.md#8-ошибки-и-восстановление). Пример использует типы, `productRequiredDetailQO` и `productRenameMO` из [каталога](catalog.md). Имена файлов дополняют тот TypeScript-пример. `QueryClientProvider` устанавливается framework adapter с тем же клиентом, что используют остальные consumers. Для показанного Error Boundary используется [react-error-boundary](https://github.com/bvaughn/react-error-boundary); Kit не требует именно эту библиотеку.

## Тип ошибки приложения

`error-register.ts`

```ts
import '@tanstack/react-query';

declare module '@tanstack/react-query' {
  interface Register {
    defaultError: unknown;
  }
}
```

Файл включается в TypeScript-программу. В существующем приложении используется его регистрация, а не вторая конкурирующая. `unknown` требует проверки перед чтением полей ошибки; Вывод типов фабрик сохраняет этот выбор. Это не runtime-валидация: transport отвечает за фактически выброшенное значение. См. [TanStack Query — типы ошибок](https://tanstack.com/query/latest/docs/framework/react/typescript#registering-a-global-error).

`ui-error.ts`

```ts
import { getErrorPresentation } from './catalog-error';

export const toErrorMessage = ({ error }: { error: unknown }): string =>
  getErrorPresentation({ error }).message;
```

Mapper использует контракт из [примера ниже](#стадии-отказа-записи), не выводя сырое сообщение transport. Приложение определяет собственные коды и пользовательские сообщения.

## Граница загрузки и восстановления

`productRequiredDetailQO` передаётся в [useSuspenseQuery](https://tanstack.com/query/latest/docs/framework/react/reference/functions/useSuspenseQuery) с гарантированным `queryFn` и той же формой данных ресурса.

`product-suspense.tsx`

```tsx
import { Suspense } from 'react';
import { QueryErrorResetBoundary, useSuspenseQuery } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { productRequiredDetailQO } from './product.qo';
import { toErrorMessage } from './ui-error';

const ProductContent = ({ productId }: { productId: string }) => {
  const { data, isRefetchError } = useSuspenseQuery(
    productRequiredDetailQO({ productId }),
  );

  return (
    <section>
      <h1>{data.name}</h1>
      {isRefetchError && <p>Не удалось обновить товар</p>}
    </section>
  );
};

export const ProductSuspensePanel = (
  { productId }: { productId: string | undefined },
) => {
  if (!productId) return <p>Выберите товар</p>;

  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          resetKeys={[productId]}
          fallbackRender={({ error, resetErrorBoundary }) => (
            <section role="alert">
              <p>{toErrorMessage({ error })}</p>
              <button onClick={() => resetErrorBoundary()}>Повторить</button>
            </section>
          )}
        >
          <Suspense fallback={<p>Загрузка товара…</p>}>
            <ProductContent productId={productId} />
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
};
```

Проверка ID выполняется до монтирования `ProductContent`; hooks не вызываются условно в одном компоненте. Первая загрузка использует Suspense fallback, ошибка без данных — Error Boundary. `onReset` сбрасывает состояние query для повторной попытки; `resetKeys` сбрасывает Boundary при смене товара. Фоновая ошибка сохраняет доступные данные и отображает предупреждение. Настройки `enabled`, `skipToken`, `placeholderData` и переопределение `throwOnError` здесь не используются. Механика описана в [TanStack Query — Suspense](https://tanstack.com/query/latest/docs/framework/react/guides/suspense).

Если consumer должен передавать Boundary также ошибку фонового обновления, он получает `error` и `isFetching` и явно выбрасывает ошибку после завершения fetching. Это заменяет предупреждение на fallback и выбирается самим consumer.

## Мутация в форме

`product-rename.tsx`

```tsx
import { useMutation } from '@tanstack/react-query';
import { productRenameMO } from './product.mo';
import { toErrorMessage } from './ui-error';

export const ProductRename = ({ productId }: { productId: string }) => {
  const rename = useMutation({
    ...productRenameMO(),
    throwOnError: false,
  });

  return (
    <section>
      <button
        disabled={rename.isPending}
        onClick={() => rename.mutate({ productId, name: 'Sample product' })}
      >
        Переименовать
      </button>
      {rename.isError && (
        <div role="alert">
          <p>{toErrorMessage({ error: rename.error })}</p>
          <button onClick={() => rename.reset()}>Закрыть ошибку</button>
        </div>
      )}
    </section>
  );
};
```

Consumer показывает pending и ошибку; MO сохраняет свой cache-effect и callbacks. `rename.reset()` сбрасывает локальное состояние мутации и не повторяет серверную запись. Для выбранных ошибок приложение может установить predicate `throwOnError` и Error Boundary вокруг формы; после отказа Boundary должно также сбросить состояние мутации или размонтировать consumer. При использовании `mutateAsync` отклонение Promise обрабатывается отдельно. См. [useMutation](https://tanstack.com/query/latest/docs/framework/react/reference/useMutation).

Общие уведомления не дублируются на уровне формы и `MutationCache`. Общая telemetry при необходимости остаётся в инфраструктуре; обязательный rollback остаётся в MO. Подходы к локальной ошибке, Boundary и уведомлениям обсуждаются у [TkDodo](https://tkdodo.eu/blog/react-query-error-handling); его примеры callbacks `useQuery` до v5 не переносятся в Kit.


## Стадии отказа записи

Этот дополнительный пример демонстрирует политику отказа обязательного refetch. Он не задаёт универсальный формат ошибок. Transport нормализует известные ответы в `CatalogOperationError`: `kind` описывает происхождение, `outcome` — подтверждённость результата команды. Статус HTTP не заменяет контракт сервиса; неизвестная ошибка остаётся `unknown` и требует диагностики.

`catalog-error.ts`

```ts
import type { Product } from './catalog.types';

export class CatalogOperationError extends Error {
  readonly kind: 'transport' | 'service' | 'business';
  readonly outcome: 'rejected' | 'unknown';

  constructor({ kind, outcome, cause }: {
    kind: 'transport' | 'service' | 'business';
    outcome: 'rejected' | 'unknown';
    cause?: unknown;
  }) {
    super('Catalog operation failed', { cause });
    this.kind = kind;
    this.outcome = outcome;
  }
}

export class CacheReconciliationError extends Error {
  readonly product: Product;

  constructor({ product, cause }: { product: Product; cause: unknown }) {
    super('Write confirmed; cache reconciliation failed', { cause });
    this.product = product;
  }
}

export const getErrorPresentation = ({ error }: { error: unknown }) => {
  if (error instanceof CacheReconciliationError) {
    return { message: 'Товар сохранён, но связанные данные не обновились', recovery: 'retry-read' } as const;
  }
  if (error instanceof CatalogOperationError) {
    if (error.outcome === 'unknown') {
      return { message: 'Результат записи неизвестен. Проверьте состояние товара', recovery: 'check-write' } as const;
    }
    if (error.kind === 'business') {
      return { message: 'Действие отклонено. Проверьте введённые данные', recovery: 'revise-command' } as const;
    }
    return { message: 'Операция не выполнена. Повтор зависит от её контракта', recovery: 'command-policy' } as const;
  }
  return { message: 'Неожиданная ошибка приложения', recovery: 'report' } as const;
};
```

`product-rename-refresh.mo.ts`

```ts
import { mutationOptions } from '@tanstack/react-query';
import { CacheReconciliationError } from './catalog-error';
import { renameProduct } from './catalog.transport';
import type { RenameProductRequest } from './catalog.types';
import { productQK } from './product.qk';

export const productRenameWithRequiredRefreshMO = () =>
  mutationOptions({
    mutationFn: (variables: RenameProductRequest) => renameProduct(variables),
    onSuccess: async (product, variables, _onMutateResult, { client }) => {
      try {
        client.setQueryData(productQK.detail({ productId: variables.productId }), product);
        await client.invalidateQueries(
          { queryKey: productQK.lists() },
          { throwOnError: true },
        );
      } catch (cause) {
        throw new CacheReconciliationError({ product, cause });
      }
    },
  });
```

Здесь `mutationFn` подтвердила запись, а отказ последующего cache-effect классифицируется отдельно. Отклонение success callback вызывает error lifecycle mutation; оно не означает, что сервер отклонил команду. По умолчанию invalidation не отклоняет Promise из-за ошибки query; `throwOnError: true` — осознанная политика этого примера. Ожидание распространяется на выбранные refetch; неактивные queries только становятся stale.

Если MO добавляет optimistic update, её `onError` не откатывает подтверждённую запись при `CacheReconciliationError`. Для `outcome: 'unknown'` применяется политика проверки результата из [спецификации](../../SPECIFICATION.md#повторы-и-результат-записи), а не вывод об отказе по timeout. Consumer показывает подтверждённость записи и восстанавливает чтение через QO; `mutation.reset()` только закрывает состояние ошибки. Команда не отправляется повторно ради восстановления кэша. Неизвестная ошибка программы передаётся мониторингу и выбранной UI-границе.

Контракт приведён для записи; read-errors не получают `outcome` команды. Приложение отдельно определяет допустимые повторы чтения по нормализованным transport/service ошибкам. Регистрация `defaultError: unknown` сохраняет необходимость runtime-narrowing для обоих видов операций.
