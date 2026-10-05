# Effector

Область применения: проект, использующий Effector рядом с TanStack Query. React и роутер для этой границы не требуются.

## Ответственность модели

Effector может владеть черновиком формы, выбранным ID, событиями пользователя и последовательностью сценария. Такая модель выступает consumer QO/MO/Aggregation. Серверные данные остаются в Query cache по [общему правилу](../../SPECIFICATION.md#1-назначение-и-границы); самостоятельное UI-state хранится в Effector.

Императивное чтение effect передаёт в `qc.query` через [контракт Query](../tanstack-query/README.md#императивное-выполнение). Исполнение MO требует подходящего mutation adapter: один вызов `mutationFn` не выполняет остальные callbacks, rollback или meta executor. Adapter обязан сохранить lifecycle MO; готовая реализация такого adapter здесь не предлагается.

## Ошибки effect

У effect есть `fail` с параметрами и ошибкой и `failData` только с ошибкой. Их можно использовать для представления сценарного отказа; событие не становится ошибкой UI-boundary автоматически. При прямом вызове effect его rejected Promise также обрабатывается consumer. [Effect API](https://effector.dev/en/api/effector/effect/).

Scope приложения и QueryClient передаются согласованно. Для SSR отдельно проверяются изоляция Effector scope и Query cache между requests; наличие одного из этих механизмов не обеспечивает другой.

[Материалы по стеку](../README.md).
