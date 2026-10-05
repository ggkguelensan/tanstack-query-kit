# Effector

Область применения: проект, использующий Effector рядом с TanStack Query. React и роутер для этой границы не требуются.

## Сценарий и lifecycle ресурса

Оркестрация сценария и lifecycle Query — разные ответственности. Effector может определять последовательность действий, передавать результаты между шагами и владеть черновиком формы или выбранным ID. Query управляет кешем, свежестью, выполнением запросов и мутаций. `useQuery` и `useMutation` связывают этот lifecycle с React через observers; порядок бизнес-сценария остаётся у consumer. Effector-модель также может быть consumer QO/MO/Aggregation по [спецификации](../../SPECIFICATION.md#7-consumer-и-lifecycle).

| Вариант | Что исполняется | Что наблюдает Effector |
| --- | --- | --- |
| Effect вызывает `qc.query(QO)` | Одно императивное чтение через Query cache | Promise этого вызова: pending, done, fail |
| Adapter подписывает `QueryObserver` на QO | Реактивный lifecycle ресурса | Изменения query result, включая fetching и фоновое обновление |
| Adapter вызывает `MutationObserver.mutate` с MO | Mutation lifecycle с callbacks и MutationCache | Promise операции и состояние наблюдаемой мутации |
| React-consumer использует hooks | Observers принадлежат React adapter | Effector управляет сценарием и UI-state; подписка ресурса остаётся в React |

Выбор делается по потребности consumer. Императивный шаг не обязан создавать долгоживущий observer; реактивное наблюдение нельзя заменить состоянием одного effect.

У сценария один владелец последовательности: Effector-модель либо другой consumer. Например, effect.done может запускать следующий шаг, а callbacks MO согласуют кеш. Один переход сценария не исполняется одновременно из Effector и UI-callback Query; общий статус сценария не выводится из статуса одной операции.

## Императивный шаг через effect

Направление зависимости: событие сценария → effect-consumer → `qc.query(QO)` → transport. Effect может передать результат мапперу или следующей операции. Семантика свежести и ошибок описана в [TanStack Query](../tanstack-query/README.md#императивное-выполнение).

`qc.query` строит или использует запись QueryCache и запускает её fetch при необходимости. Запись хранит состояние выполнения и уведомляет уже существующих observers, но вызов не создаёт собственного QueryObserver. Его Promise завершается и не подписывает effect на последующие изменения ресурса. [QueryClient.query](https://tanstack.com/query/latest/docs/framework/react/reference/classes/QueryClient#query).

`effect.pending` относится к вызову effect: он может ждать уже кешированные данные или несколько шагов сценария. `effect.done` означает завершение этого вызова, а не каждое обновление ресурса. Последующая invalidation не запускает effect снова; без активного observer обычная invalidation помечает query устаревшей, но не требует её немедленного refetch. Effector не получает `isStale`, `isFetching` или изменения данных через lifecycle завершившегося effect.

Фабрика Effector, ожидающая async-handler, может принять handler, вызывающий `qc.query`. Такой handler является adapter выполнения Query, а не нижележащим transport QO. Transport не вызывает тот же QO обратно через effect и `qc.query`: иначе возникает циклическое исполнение ресурса.

## Adapter для QueryObserver

Если Effector-модели нужен lifecycle, аналогичный `useQuery`, adapter создаёт `QueryObserver` из QO, получает текущий result и подписывается на его обновления. Параметры и consumer-настройки обновляются через `setOptions`; подписка поддерживает наблюдение после первого запроса. [QueryObserver](https://tanstack.com/query/latest/docs/framework/react/reference/classes/QueryObserver).

Adapter определяет:

- создание observer при активации consumer, обновление параметров и освобождение подписки при деактивации;
- получение начального result и доставку последующих results в правильный Effector scope;
- место хранения QueryClient и владельца его `mount` / `unmount`, если нет готового provider, чтобы подключить focus/online lifecycle;
- выбор `enabled`, refetch-политики и обработку смены ресурса согласно потребности consumer.

Подписанная query может обновляться после invalidation, focus/reconnect и других причин refetch. Конкретное поведение зависит от options, доступности сети и lifecycle клиента. Простое создание observer без подписки не эквивалентно активному `useQuery`.

Серверные данные остаются в Query cache по [общему правилу](../../SPECIFICATION.md#1-назначение-и-границы). Effector представляет observer result как производную проекцию по этому контракту. Pending всего сценария и fetching ресурса имеют разные источники.

## Adapter для MutationObserver

Для записи effect вызывает `MutationObserver.mutate` с options из MO. Это запускает mutation через MutationCache и сохраняет `onMutate`, `onSuccess`, `onError`, `onSettled` и meta executor. Непосредственный вызов `MO.mutationFn` обходит остальной lifecycle и не подходит для исполнения MO. [MutationObserver](https://tanstack.com/query/latest/docs/framework/react/reference/classes/MutationObserver).

Если модели нужен reactive result, adapter также подписывается на observer. Он не перезаписывает callbacks MO и обрабатывает rejected Promise `mutate`. `reset` сбрасывает observer, но не отменяет уже выполняющуюся запись. Для параллельных операций определяется область observer: один observer отражает текущую наблюдаемую мутацию, а не агрегированное состояние всего сценария.

Конкретные per-call UI-callbacks и результаты observer зависят от его подписки и смены наблюдаемой мутации; обязательные cache-effects остаются в MO. Adapter не воспроизводит эти callbacks вручную поверх effect lifecycle.

## Ошибки и scope

У effect есть `fail` с параметрами и ошибкой и `failData` только с ошибкой. Они представляют отказ вызова effect; ошибка фонового query refetch поступает через observer, даже если прежний effect уже завершился. При прямом вызове effect его rejected Promise также обрабатывается consumer. [Effect API](https://effector.dev/en/api/effector/effect/).

Callbacks observers являются внешними callbacks для Effector. Их доставка привязывается к нужному scope, например через `scopeBind`; QueryClient и scope передаются согласованно. При SSR отдельно проверяется изоляция обоих механизмов между requests. [scopeBind](https://effector.dev/en/api/effector/scopebind/).

## Проверка интеграции

Проверьте кешированное и сетевое чтение, refetch после invalidation, смену параметров, доставку ошибки и очистку подписки. Для mutation проверьте lifecycle MO, ожидание обязательного cache-effect, reset и конкурирующие вызовы. Для scoped-приложения callbacks не должны попадать в другой scope.

Эта страница задаёт контракт интеграции; готовый Effector adapter в репозитории не реализован. [Материалы по стеку](../README.md).
