# Vue

Область применения: Vue 3 и `@tanstack/vue-query` v5. Nuxt, роутер и React не требуются. Начните с [общей спецификации](../../SPECIFICATION.md) и [API TanStack Query](../tanstack-query/README.md).

## Реактивный consumer

`VueQueryPlugin` подключает клиент приложения. Consumer создаёт `useQuery` / `useMutation` в setup lifecycle. Для обычных параметров Kit QO пересчитывается внутри `computed`: refs и getters разрешаются перед передачей в фабрику, а `.qk` получает сериализуемые значения. Однократное чтение `ref.value` вне реактивного options фиксирует прежний ID. [Reactivity](https://tanstack.com/query/latest/docs/framework/vue/reactivity), [Quick Start](https://tanstack.com/query/latest/docs/framework/vue/quick-start).

Фрагмент внутри setup с `productId: Ref<string>` и `isPanelOpen: Ref<boolean>`. QO/MO используют Vue adapter и обычные именованные параметры Kit.

```ts
import { computed } from 'vue';
import { useMutation, useQuery } from '@tanstack/vue-query';
import { productRequiredDetailQO } from './product.qo';
import { productRenameMO } from './product.mo';

const productQuery = useQuery(computed(() => ({
  ...productRequiredDetailQO({ productId: productId.value }),
  enabled: isPanelOpen.value,
})));
const rename = useMutation(productRenameMO());
```

Фрагмент принимает уже подготовленный ID. Если ID ещё не получен, consumer lifecycle организуется до этого участка либо используется optional-QO, типизированная для выбранного адаптера. Перегрузки helpers отличаются: React-конфиг с `skipToken` не переносится механической заменой imports.

Состояния результата представлены refs, например `productQuery.data.value` и `productQuery.isFetching.value` в script. Данные query используются как readonly; редактирование формы выполняется в самостоятельном черновике по [общему контракту](../../SPECIFICATION.md#1-назначение-и-границы). Обновление серверного ресурса проходит через MO. [Reactivity: immutability](https://tanstack.com/query/latest/docs/framework/vue/reactivity#immutability).

## Ошибки и Suspense

Локальные ошибки читаются из reactive result; для отказов рендера Vue использует свой механизм `onErrorCaptured` и обработку ошибок приложения. Vue Query предоставляет `suspense()` для async setup; эта интеграция обозначена в документации как experimental. При её выборе явно определяются получение ошибки, повтор запроса и восстановление UI. React reset API не применяется. [Vue error handling](https://vuejs.org/api/composition-api-lifecycle.html#onerrorcaptured), [Query Suspense](https://tanstack.com/query/latest/docs/framework/vue/guides/suspense).

## SSR, если используется

Применяются [общие SSR-принципы](../../SPECIFICATION.md#общие-принципы-ssr). Plugin и request-scoped клиент подключаются к экземпляру серверного приложения; ожидание загрузок и перенос состояния определяет framework adapter. Для Nuxt или собственного SSR используйте [Vue Query SSR](https://tanstack.com/query/latest/docs/framework/vue/guides/ssr).

Проверьте смену reactive ID, активности, readonly-данные, отказ фонового refetch и завершение setup scope. Типизация фрагмента проверена с `@tanstack/vue-query@5.104.1` и Vue 3.5.22; runtime-интеграция приложения здесь не реализована.

[Материалы по стеку](../README.md).
