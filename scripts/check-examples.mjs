import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const workspace = await mkdtemp(join(root, '.verify-'));
try {
  const source = join(workspace, 'src');
  await mkdir(source);
  for (const document of ['stack/react/catalog.md', 'stack/react/errors-and-suspense.md']) {
    const markdown = await readFile(join(root, document), 'utf8');
    for (const match of markdown.matchAll(/`([^`\n]+\.(?:ts|tsx))`\s*\n\s*```(?:ts|tsx)\n([\s\S]*?)```/g)) {
      await writeFile(join(source, match[1]), match[2]);
    }
  }
  // Transport declarations in the documentation have no runtime implementation.
  // Only this disposable fixture supplies a transport for behavioral checks.
  await writeFile(join(source, 'catalog.transport.ts'), `
import type { Product, ProductListParams, CreateProductRequest, RenameProductRequest } from './catalog.types';
export const calls = { reads: 0, writes: 0 };
export const getProduct = async (productId: string, _options: { signal: AbortSignal }): Promise<Product> => {
  calls.reads++;
  return { id: productId, name: 'Product', status: 'published', categoryId: 'c1' };
};
export const getCategory = async (_id: string, _options: { signal: AbortSignal }) => ({ id: 'c1', name: 'Category' });
export const getProducts = async (_params: ProductListParams, _options: { signal: AbortSignal }): Promise<Product[]> => [];
export const getProductPage = async (_params: ProductListParams & { cursor: string | null }, _options: { signal: AbortSignal }) => ({ items: [] as Product[], nextCursor: null as string | null });
export const createProduct = async (variables: CreateProductRequest): Promise<Product> => {
  calls.writes++;
  return { id: 'p1', name: variables.name, status: 'published' };
};
export const renameProduct = async (variables: RenameProductRequest): Promise<Product> => {
  calls.writes++;
  return { id: variables.productId, name: variables.name, status: 'published' };
};
`);
  await writeFile(join(source, 'type-contracts.tsx'), `
import { useQuery, useQueries, useSuspenseQuery, useInfiniteQuery, QueryClient } from '@tanstack/react-query';
import { productDetailQO, productRequiredDetailQO, productListQO, productInfiniteQO } from './product.qo';
import type { Product } from './catalog.types';
export function Contracts() {
  const optional = useQuery(productDetailQO({ productId: undefined }));
  const optionalData: Product | undefined = optional.data;
  const error: unknown = optional.error;
  const selected = useQuery({ ...productDetailQO({ productId: 'p1' }), select: product => product.name });
  const name: string | undefined = selected.data;
  const parallel = useQueries({ queries: ['p1'].map(productId => productDetailQO({ productId })) });
  const parallelData: Product | undefined = parallel[0]?.data;
  const ready: Product = useSuspenseQuery(productRequiredDetailQO({ productId: 'p1' })).data;
  // @ts-expect-error Optional QO can contain skipToken and cannot promise Suspense data.
  useSuspenseQuery(productDetailQO({ productId: undefined }));
  useInfiniteQuery(productInfiniteQO({ search: '', pageSize: 10 }));
  useQuery({ ...productListQO({ search: '', pageSize: 10 }), select: items => items.map(item => item.name) });
  return null;
}
export const imperative: Promise<Product> = new QueryClient().query(productRequiredDetailQO({ productId: 'p1' }));
`);
  await writeFile(join(workspace, 'package.json'), JSON.stringify({ private: true }));
  execFileSync('npm', ['install', '--no-audit', '--no-fund', '--no-package-lock',
    '@tanstack/react-query@5.104.1', 'react@19.2.0', 'react-dom@19.2.0',
    '@types/react@19.2.0', 'typescript@5.9.3', 'react-error-boundary@6.0.0'],
  { cwd: workspace, stdio: 'inherit' });
  await writeFile(join(workspace, 'tsconfig.json'), JSON.stringify({ compilerOptions: {
    strict: true, target: 'ES2022', module: 'CommonJS', moduleResolution: 'Node',
    jsx: 'react-jsx', skipLibCheck: true, outDir: 'dist',
  }, include: ['src'] }));
  execFileSync(process.execPath, [join(workspace, 'node_modules/typescript/bin/tsc'), '--project', workspace], { stdio: 'inherit' });
  await writeFile(join(workspace, 'behavior.cjs'), `
const assert = require('node:assert/strict');
const { QueryClient, QueryObserver, MutationObserver, skipToken } = require('@tanstack/react-query');
const { createElement } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { QueryClientProvider } = require('@tanstack/react-query');
const { createQueryClient } = require('./dist/query-client');
const { productQK } = require('./dist/product.qk');
const { categoryQK } = require('./dist/category.qk');
const { productDetailQO, productRequiredDetailQO } = require('./dist/product.qo');
const { productCreateMO } = require('./dist/product.mo');
const { ProductPanel } = require('./dist/product-panel');
const { productRenameWithRequiredRefreshMO } = require('./dist/product-rename-refresh.mo');
const { CacheReconciliationError, CatalogOperationError, getErrorPresentation } = require('./dist/catalog-error');
const { calls } = require('./dist/catalog.transport');

const client = createQueryClient();
(async () => {
  const unavailable = productDetailQO({ productId: undefined });
  assert.equal(unavailable.queryFn, skipToken);
  assert.deepEqual(unavailable.queryKey, productQK.unavailableDetail());
  const blocked = new QueryObserver(client, unavailable);
  const stopBlocked = blocked.subscribe(() => {});
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(calls.reads, 0);
  await client.query(productRequiredDetailQO({ productId: 'p1' }));
  assert.equal(calls.reads, 1);
  stopBlocked();

  const key = productQK.list({ search: '', pageSize: 10 });
  client.setQueryData(key, []);
  let fetches = 0, aborts = 0;
  const listOptions = { queryKey: key, staleTime: Infinity, retry: false,
    queryFn: ({ signal }) => new Promise((resolve, reject) => {
      fetches++;
      const timer = setTimeout(() => resolve([]), 5);
      signal.addEventListener('abort', () => { aborts++; clearTimeout(timer); reject(new Error('aborted')); }, { once: true });
    }) };
  const list = new QueryObserver(client, listOptions);
  const stopList = list.subscribe(() => {});
  const creation = productCreateMO();
  const mutation = new MutationObserver(client, { ...creation,
    meta: { invalidates: [productQK.all(), productQK.lists()] } });
  await mutation.mutate({ name: 'Created' });
  assert.equal(fetches, 1);
  assert.equal(aborts, 0);
  for (const meta of [undefined, { invalidates: [] }]) {
    const empty = new MutationObserver(client, { ...creation, meta });
    await empty.mutate({ name: 'No invalidation' });
    assert.equal(fetches, 1);
  }
  stopList();

  const failingList = new QueryObserver(client, { ...listOptions, enabled: false,
    queryFn: async () => { throw new Error('refresh failed'); } });
  const stopFailing = failingList.subscribe(() => {});
  failingList.setOptions({ ...failingList.options, enabled: true });
  const beforeWrites = calls.writes;
  let errorCallback = false, rolledBack = false;
  const confirmed = new MutationObserver(client, { ...productRenameWithRequiredRefreshMO(),
    onError: error => {
      errorCallback = true;
      if (!(error instanceof CacheReconciliationError)) rolledBack = true;
    } });
  await assert.rejects(confirmed.mutate({ productId: 'p1', name: 'Saved' }), error => {
    assert.ok(error instanceof CacheReconciliationError);
    assert.equal(error.product.name, 'Saved');
    assert.equal(getErrorPresentation({ error }).recovery, 'retry-read');
    return true;
  });
  assert.equal(calls.writes, beforeWrites + 1);
  assert.equal(errorCallback, true);
  assert.equal(rolledBack, false);
  assert.equal(client.getQueryData(productQK.detail({ productId: 'p1' })).name, 'Saved');
  stopFailing();

  const business = new CatalogOperationError({ kind: 'business', operation: 'command', outcome: 'rejected' });
  assert.equal(getErrorPresentation({ error: business }).recovery, 'revise-command');
  const unknown = new CatalogOperationError({ kind: 'transport', operation: 'command', outcome: 'unknown' });
  assert.equal(getErrorPresentation({ error: unknown }).recovery, 'check-write');
  const service = new CatalogOperationError({ kind: 'service', operation: 'command', outcome: 'rejected' });
  assert.equal(getErrorPresentation({ error: service }).recovery, 'command-policy');
  for (const kind of ['transport', 'service']) {
    const readError = new CatalogOperationError({ kind, operation: 'read' });
    assert.equal(readError.outcome, undefined);
    assert.equal(getErrorPresentation({ error: readError }).recovery, 'retry-read');
  }
  const domainRead = new CatalogOperationError({ kind: 'business', operation: 'read' });
  assert.equal(getErrorPresentation({ error: domainRead }).recovery, 'resolve-domain-state');
  assert.equal(getErrorPresentation({ error: new Error('internal details') }).recovery, 'report');

  client.setQueryData(categoryQK.detail({ categoryId: 'c1' }), { id: 'c1', name: 'Cached category' });
  await assert.rejects(client.query({ queryKey: categoryQK.detail({ categoryId: 'c1' }),
    queryFn: async () => { throw new Error('category failed'); }, retry: false }));
  const render = () => renderToStaticMarkup(createElement(QueryClientProvider, { client },
    createElement(ProductPanel, { productId: 'p1', isPanelOpen: true, onRenamed() {} })));
  client.setQueryData(productQK.detail({ productId: 'p1' }), { id: 'p1', name: 'Draft', status: 'draft', categoryId: 'c1' });
  assert.ok(!render().includes('Не удалось загрузить категорию'));
  client.setQueryData(productQK.detail({ productId: 'p1' }), { id: 'p1', name: 'Published', status: 'published', categoryId: 'c1' });
  assert.ok(render().includes('Не удалось загрузить категорию'));

  await client.query({ queryKey: ['retention'], queryFn: async () => 42, staleTime: Infinity, gcTime: 300000 });
  assert.equal(client.getQueryCache().find({ queryKey: ['retention'] }).gcTime, 300000);
  client.clear();
  console.log('PASS: inferred types, readiness, overlapping/empty plans, confirmed-write failure, error classification, category visibility, independent retention');
})().catch(error => { client.clear(); console.error(error); process.exitCode = 1; });
`);
  execFileSync(process.execPath, ['behavior.cjs'], { cwd: workspace, stdio: 'inherit', timeout: 30000 });
} finally {
  await rm(workspace, { recursive: true, force: true });
}
