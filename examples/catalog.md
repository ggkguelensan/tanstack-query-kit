# Пример: каталог товаров

Пример показывает границы модулей для вымышленных `Product` и `Category`. Пути относительные: файлы можно разместить в одном каталоге и затем разнести по структуре своего проекта. Блоки с именами файлов образуют согласованный TypeScript-пример.

Transport здесь задан декларациями контрактов. В приложении их заменяют реальными функциями с проверкой HTTP-ошибок, валидацией данных и поддержкой `signal`; это не готовый сетевой клиент.

## Модели и transport

`catalog.types.ts`

```ts
export type Product = {
  id: string;
  name: string;
  status: 'draft' | 'published';
  categoryId?: string;
};

export type Category = { id: string; name: string };
export type ProductListParams = { search: string; pageSize: number };
export type ProductPage = { items: Product[]; nextCursor: string | null };
export type CreateProductRequest = { name: string };
export type RenameProductRequest = { productId: string; name: string };
```

`catalog.transport.ts`

```ts
import type {
  Category, CreateProductRequest, Product, ProductListParams,
  ProductPage, RenameProductRequest,
} from './catalog.types';

type RequestOptions = { signal: AbortSignal };

export declare const getProduct: (
  productId: string, options: RequestOptions,
) => Promise<Product>;

export declare const getCategory: (
  categoryId: string, options: RequestOptions,
) => Promise<Category>;

export declare const getProducts: (
  params: ProductListParams, options: RequestOptions,
) => Promise<Product[]>;

export declare const getProductPage: (
  params: ProductListParams & { cursor: string | null },
  options: RequestOptions,
) => Promise<ProductPage>;

export declare const createProduct: (
  variables: CreateProductRequest,
) => Promise<Product>;

export declare const renameProduct: (
  variables: RenameProductRequest,
) => Promise<Product>;
```

## Ключи

`product.qk.ts`

```ts
import type { ProductListParams } from './catalog.types';

export const productQK = {
  all: () => ['product'] as const,
  lists: () => [...productQK.all(), 'list'] as const,
  list: (params: ProductListParams) =>
    [...productQK.lists(), 'finite', params] as const,
  infinite: (params: ProductListParams) =>
    [...productQK.lists(), 'infinite', params] as const,
  details: () => [...productQK.all(), 'detail'] as const,
  detail: (productId: string | undefined) =>
    [...productQK.details(), productId] as const,
} as const;
```

`category.qk.ts`

```ts
export const categoryQK = {
  all: () => ['category'] as const,
  details: () => [...categoryQK.all(), 'detail'] as const,
  detail: (categoryId: string | undefined) =>
    [...categoryQK.details(), categoryId] as const,
} as const;
```

Префикс `productQK.lists()` охватывает обычные и бесконечные списки, но их полные ключи различаются.

## Query options

`product.qo.ts`

```ts
import { infiniteQueryOptions, queryOptions, skipToken } from '@tanstack/react-query';
import { getProduct, getProductPage, getProducts } from './catalog.transport';
import type { ProductListParams } from './catalog.types';
import { productQK } from './product.qk';

export const productDetailQO = (productId: string | undefined) =>
  queryOptions({
    queryKey: productQK.detail(productId),
    queryFn: productId !== undefined && productId !== ''
      ? ({ signal }) => getProduct(productId, { signal })
      : skipToken,
    staleTime: 30_000,
    gcTime: 300_000,
  });

export const productListQO = (params: ProductListParams) =>
  queryOptions({
    queryKey: productQK.list(params),
    queryFn: ({ signal }) => getProducts(params, { signal }),
    staleTime: 30_000,
    gcTime: 300_000,
  });

export const productInfiniteQO = (params: ProductListParams) =>
  infiniteQueryOptions({
    queryKey: productQK.infinite(params),
    queryFn: ({ signal, pageParam }) =>
      getProductPage({ ...params, cursor: pageParam }, { signal }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
    gcTime: 300_000,
  });
```

`category.qo.ts`

```ts
import { queryOptions, skipToken } from '@tanstack/react-query';
import { getCategory } from './catalog.transport';
import { categoryQK } from './category.qk';

export const categoryDetailQO = (categoryId: string | undefined) =>
  queryOptions({
    queryKey: categoryQK.detail(categoryId),
    queryFn: categoryId !== undefined && categoryId !== ''
      ? ({ signal }) => getCategory(categoryId, { signal })
      : skipToken,
    staleTime: 60_000,
    gcTime: 300_000,
  });
```

Значения времени иллюстративны. В реальном приложении они выбираются по допустимому возрасту данных.

## Mutation meta и инфраструктура

`mutation-meta.ts`

```ts
import type { QueryKey } from '@tanstack/react-query';

export interface AppMutationMeta extends Record<string, unknown> {
  invalidates?: readonly QueryKey[];
}

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: AppMutationMeta;
  }
}
```

Это стандартный механизм [регистрации meta-типа](https://tanstack.com/query/latest/docs/framework/react/typescript). Файл должен входить в TypeScript-программу. В проекте с существующим `Register.mutationMeta` поле добавляют в общий тип, не создавая конфликтующую регистрацию.

`query-client.ts`

```ts
import { MutationCache, QueryClient } from '@tanstack/react-query';
import './mutation-meta';

export const createQueryClient = (): QueryClient => {
  const mutationCache = new MutationCache({
    onSuccess: async (_data, _variables, _onMutateResult, mutation, context) => {
      await Promise.all(
        (mutation.meta?.invalidates ?? []).map((queryKey) =>
          context.client.invalidateQueries({ queryKey }),
        ),
      );
    },
  });

  return new QueryClient({ mutationCache });
};
```

Исполнитель знает только список префиксов. При отсутствии плана он ничего не делает. Фабрика клиента вызывается один раз на серверный request или при создании стабильного браузерного клиента, а не при каждом рендере.

## Мутации

`product.mo.ts`

```ts
import { mutationOptions } from '@tanstack/react-query';
import { createProduct, renameProduct } from './catalog.transport';
import type { CreateProductRequest, RenameProductRequest } from './catalog.types';
import { productQK } from './product.qk';

export const productCreateMO = () =>
  mutationOptions({
    mutationFn: (variables: CreateProductRequest) => createProduct(variables),
    meta: { invalidates: [productQK.lists()] },
  });

export const productRenameMO = () =>
  mutationOptions({
    mutationFn: (variables: RenameProductRequest) => renameProduct(variables),
    onSuccess: async (product, variables, _onMutateResult, { client }) => {
      client.setQueryData(productQK.detail(variables.productId), product);
      await client.invalidateQueries({ queryKey: productQK.lists() });
    },
  });
```

Создание использует статический план; переименование — последовательный динамический эффект. В обоих случаях обычные и infinite-списки согласуются с сервером.

## Чистая агрегация

`product-page.aggregation.ts`

```ts
import type { Category, Product } from './catalog.types';
import { categoryDetailQO } from './category.qo';
import { productDetailQO } from './product.qo';
import { productRenameMO } from './product.mo';

const toProductPageView = (product: Product, category: Category | undefined) => ({
  title: product.name,
  categoryName: product.status === 'published'
    && category?.id === product.categoryId
      ? category?.name ?? null
      : null,
});

export const productPageAggregation = {
  productQO: productDetailQO,
  categoryQO: categoryDetailQO,
  renameProductMO: productRenameMO,
  shouldQueryCategory: (product: Product | undefined) =>
    product?.status === 'published' && product.categoryId !== undefined,
  toView: toProductPageView,
} as const;
```

Бизнес-правило примера: категорию показывают только для опубликованного товара. Guard управляет загрузкой, а mapper — видимостью уже закэшированных данных. `enabled: false` само по себе не удаляет данные из кэша.

## React-consumer

`product-panel.tsx`

```tsx
import { useMutation, useQuery } from '@tanstack/react-query';
import { productPageAggregation } from './product-page.aggregation';

type ProductPanelProps = {
  productId: string | undefined;
  isPanelOpen: boolean;
  onRenamed: () => void;
};

export const ProductPanel = ({ productId, isPanelOpen, onRenamed }: ProductPanelProps) => {
  const productQuery = useQuery({
    ...productPageAggregation.productQO(productId),
    enabled: isPanelOpen,
  });
  const categoryQuery = useQuery({
    ...productPageAggregation.categoryQO(productQuery.data?.categoryId),
    enabled: isPanelOpen
      && productPageAggregation.shouldQueryCategory(productQuery.data),
  });
  const rename = useMutation(productPageAggregation.renameProductMO());

  if (!isPanelOpen) return null;
  if (productId === undefined || productId === '') return <p>Выберите товар</p>;
  if (productQuery.isError) return <p>Не удалось загрузить товар</p>;
  if (!productQuery.data) return <p>Загрузка…</p>;

  const product = productQuery.data;
  const view = productPageAggregation.toView(product, categoryQuery.data);

  return (
    <section>
      <h1>{view.title}</h1>
      {view.categoryName && <p>{view.categoryName}</p>}
      {categoryQuery.isFetching && <p>Загрузка категории…</p>}
      {categoryQuery.isError && <p>Не удалось загрузить категорию</p>}
      <button
        disabled={rename.isPending}
        onClick={() => rename.mutate(
          { productId: product.id, name: 'Sample product' },
          { onSuccess: () => onRenamed() },
        )}
      >
        Переименовать
      </button>
      {rename.isError && <p>Не удалось переименовать товар</p>}
    </section>
  );
};
```

Компонент предполагает `QueryClientProvider` с клиентом из `createQueryClient`. `onRenamed` — только UI-effect. Все изменения кэша находятся в MO и не зависят от вызова этого callback.

## Loader как consumer

`product-loader.ts`

```ts
import type { QueryClient } from '@tanstack/react-query';
import { productDetailQO } from './product.qo';

export const loadProduct = async (client: QueryClient, productId: string) => {
  if (productId === '') throw new Error('Product ID is required');
  return client.ensureQueryData(productDetailQO(productId));
};
```

Framework adapter передаёт request-scoped client на сервере или стабильный client в браузере. Здесь сознательно допускается чтение существующих данных через `ensureQueryData`; если loader должен дождаться обновления устаревшего ресурса, выбирается `fetchQuery` с подходящим `staleTime`.

## Другие consumer-сценарии

Фрагменты внутри компонента с заданными `productIds` и `filters`:

```tsx
const products = useQueries({
  queries: productIds.map((id) => productDetailQO(id)),
});

const names = useQuery({
  ...productListQO(filters),
  select: (items) => items.map((item) => item.name),
});

const feed = useInfiniteQuery(productInfiniteQO(filters));
// В обработчике UI: если feed.hasNextPage && !feed.isFetchingNextPage,
// вызвать feed.fetchNextPage().
```

Hooks импортируются из `@tanstack/react-query`, фабрики — из `product.qo.ts`. Ни один consumer не извлекает ключ из options и не конструирует его самостоятельно.
