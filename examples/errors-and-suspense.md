# Пример: ошибки и Suspense

Правила находятся в [спецификации, разделе 8](../SPECIFICATION.md#8-ошибки-и-восстановление). Пример использует типы, `productRequiredDetailQO` и `productRenameMO` из [каталога](catalog.md). Имена файлов дополняют тот TypeScript-пример. `QueryClientProvider` устанавливается framework adapter с тем же клиентом, что используют остальные consumers. Для показанного Error Boundary используется [react-error-boundary](https://github.com/bvaughn/react-error-boundary); Kit не требует именно эту библиотеку.

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

Файл включается в TypeScript-программу. В существующем приложении используется его регистрация, а не вторая конкурирующая. `unknown` требует проверки перед чтением полей ошибки; `DefaultError` в фабриках сохраняет этот выбор. Это не runtime-валидация: transport отвечает за фактически выброшенное значение. См. [TanStack Query — типы ошибок](https://tanstack.com/query/latest/docs/framework/react/typescript#registering-a-global-error).

`ui-error.ts`

```ts
export const toErrorMessage = ({ error }: { error: unknown }): string => {
  if (error instanceof Error) return error.message;
  return 'Не удалось выполнить операцию';
};
```

Это минимальный UI-mapper для вымышленных данных. Приложение определяет безопасное пользовательское сообщение согласно своему error-контракту и не обязано показывать сырое сообщение transport.

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
