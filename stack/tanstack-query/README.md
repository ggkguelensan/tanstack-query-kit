# TanStack Query: API и типизация

Область применения: TanStack Query v5 и выбранный framework adapter. Это детали API поверх [общей спецификации](../../SPECIFICATION.md), без требования React или роутера. Проверенная версия сквозного React-примера — `@tanstack/react-query@5.104.1`; совместимость других адаптеров проверяется отдельно.

## Императивное выполнение

Если установленная версия предоставляет `qc.query`, consumer использует его для императивного чтения и предзагрузки. По умолчанию метод учитывает `staleTime` QO; для чтения любых существующих данных без проверки свежести consumer передаёт `{ ...options, staleTime: 'static' }`. Это замена `ensureQueryData` без `revalidateIfStale`, а не общий cache-policy ресурса. Для версий без `qc.query` допустимы `fetchQuery` и `ensureQueryData` с соответствующей семантикой. Версия API выбирается при внедрении; runtime-проверка наличия метода в каждом consumer не требуется.

`qc.query` отклоняет Promise при ошибке: loader передаёт её framework adapter, а необязательная предзагрузка явно обрабатывает rejection. Одного `void qc.query(...)` недостаточно для обработки ошибки. Выбор ожидания, обработки ошибок и политики свежести принадлежит consumer. Семантика методов описана в [QueryClient](https://tanstack.com/query/latest/docs/framework/react/reference/classes/QueryClient).

## Типизация ошибок

Контракт приложения из [спецификации](../../SPECIFICATION.md#8-ошибки-и-восстановление) регистрируется через `Register.defaultError`; при необходимости обязательного narrowing используется `unknown`. Явные generic-параметры QO/MO используют `DefaultError`, а не фиксированный `Error`. Регистрация влияет на типы и не преобразует ошибки в runtime. См. [TypeScript](https://tanstack.com/query/latest/docs/framework/react/typescript#registering-a-global-error).

## Инфраструктура и типы meta

`QueryCache` предоставляет общие callbacks queries; `MutationCache` используется для исполнителя `meta.invalidates`. Поле meta — соглашение Kit, его тип регистрируется в модуле используемого адаптера. Установка executor и регистрация должны относиться к тому клиенту, который исполняет MO. Исполнитель и registration показаны в [React-каталоге](../react/catalog.md#mutation-meta-и-инфраструктура).

Для заглушки consumer может использовать `placeholderData`, если это допускается его API. Реальные начальные данные задаются через `initialData` с корректным `initialDataUpdatedAt`; эти механизмы имеют разную семантику. Проверка отсутствующего ID через `skipToken` и ручное выполнение описаны в [Disabling Queries](https://tanstack.com/query/latest/docs/framework/react/guides/disabling-queries).

[Выбор остальных материалов стека](../README.md).
