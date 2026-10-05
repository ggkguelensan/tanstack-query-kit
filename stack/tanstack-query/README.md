# TanStack Query: API и типизация

Область применения: TanStack Query v5 и выбранный framework adapter. Это детали API поверх [общей спецификации](../../SPECIFICATION.md), без требования React или роутера. Проверенная версия сквозного React-примера — `@tanstack/react-query@5.104.1`; совместимость других адаптеров проверяется отдельно.

## Императивное выполнение

Если установленная версия предоставляет `qc.query`, consumer использует его для императивного чтения и предзагрузки. По умолчанию метод учитывает `staleTime` QO; для чтения любых существующих данных без проверки свежести consumer передаёт `{ ...options, staleTime: 'static' }`. Это замена `ensureQueryData` без `revalidateIfStale`, а не общий cache-policy ресурса. Для версий без `qc.query` допустимы `fetchQuery` и `ensureQueryData` с соответствующей семантикой. Версия API выбирается при внедрении; runtime-проверка наличия метода в каждом consumer не требуется.

`qc.query` отклоняет Promise при ошибке: loader передаёт её framework adapter, а необязательная предзагрузка явно обрабатывает rejection. Одного `void qc.query(...)` недостаточно для обработки ошибки. Выбор ожидания, обработки ошибок и политики свежести принадлежит consumer. Семантика методов описана в [QueryClient](https://tanstack.com/query/latest/docs/framework/react/reference/classes/QueryClient).

## Свежесть и хранение

`staleTime` определяет допустимый возраст данных для конкретного чтения, `gcTime` — срок хранения неиспользуемой записи. Например, `staleTime: Infinity` с `gcTime: 300_000` допускает удаление неиспользуемых данных через пять минут; свежесть не является обещанием сохранить их в памяти.

`Infinity` допускает invalidation; `'static'` блокирует автоматические refetch, включая invalidation для static observers. В императивном `qc.query` этот override используется отдельно для чтения имеющегося кэша. Динамический `staleTime` вычисляется согласно API установленной версии. Политику MO проверяют с реально используемыми observers: ожидание invalidation не гарантирует refetch disabled/static queries. [Important Defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults), [TkDodo — Practical Query](https://tkdodo.eu/blog/practical-react-query).

## Ключи и типы данных

`queryOptions` связывает ключ с результатом через DataTag, что позволяет выводить тип в `getQueryData` / `setQueryData`. В Kit MO использует обычный QK-key; он не содержит этой связи, и один только вызов `setQueryData` не доказывает совместимость записываемого значения с QO. Общая модель ресурса, типизированный результат transport и проверки cache-effects сохраняют контракт; Kit не заявляет автоматическую связь QK с типом кэша. Это цена ограничения публичного доступа к ключам. [TkDodo — Query Options API](https://tkdodo.eu/blog/the-query-options-api).

## Типизация ошибок

Контракт приложения из [спецификации](../../SPECIFICATION.md#8-ошибки-и-восстановление) регистрируется через `Register.defaultError`; при необходимости обязательного narrowing используется `unknown`. QO/MO выводят типы из переданных options; тип ошибки учитывает регистрацию приложения без явных generic-аргументов. Регистрация влияет на типы и не преобразует ошибки в runtime. См. [TypeScript](https://tanstack.com/query/latest/docs/framework/react/typescript#registering-a-global-error).

## Инфраструктура и типы meta

`QueryCache` предоставляет общие callbacks queries; `MutationCache` используется для исполнителя `meta.invalidates`. Поле meta — соглашение Kit, его тип регистрируется в модуле используемого адаптера. Установка executor и регистрация должны относиться к тому клиенту, который исполняет MO. Исполнитель и registration показаны в [React-каталоге](../react/catalog.md#mutation-meta-и-инфраструктура).

Для заглушки consumer может использовать `placeholderData`, если это допускается его API. Реальные начальные данные задаются через `initialData` с корректным `initialDataUpdatedAt`; эти механизмы имеют разную семантику. Проверка отсутствующего ID через `skipToken` и ручное выполнение описаны в [Disabling Queries](https://tanstack.com/query/latest/docs/framework/react/guides/disabling-queries).

[Выбор остальных материалов стека](../README.md).
