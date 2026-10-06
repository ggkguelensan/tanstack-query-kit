# Suspensive

Область применения: React и выбранные пакеты `@suspensive/react` / `@suspensive/react-query`. Suspensive не требуется для Kit; сначала прочитайте [React: ошибки и Suspense](../react/README.md#ошибки-и-suspense).

## Выбор границы

`ErrorBoundary.shouldCatch` позволяет отбирать ошибки через boolean, класс или predicate. Consumer может локально обработать распознанный бизнес-отказ и передать остальные ошибки родительской границе. В fallback доступны ошибка и `reset`; `onReset` и `resetKeys` задают восстановление. [ErrorBoundary](https://suspensive.org/en/docs/react/ErrorBoundary).

При использовании TanStack Query UI-reset связывается с query error reset согласно React-механике. Отбор ошибки не задаёт retry и не заменяет mutation reset. Классификатор может быть чистой сценарной функцией Aggregation; решение о границе остаётся у consumer.

## Declarative Query consumer

`SuspenseQuery` позволяет использовать options в JSX с render callback. Он находится на стороне consumer; QO/MO не импортируют компоненты Suspensive. Требования к готовым параметрам и исполняемому queryFn сохраняются. [SuspenseQuery](https://suspensive.org/en/docs/react-query/SuspenseQuery).

Зафиксируйте совместимые версии обоих пакетов и Query; проверьте фильтрацию, проброс ошибки родителю, reset и смену ресурса. Не переносите API одной версии Suspensive в другую без проверки.

[Материалы по стеку](../README.md).
