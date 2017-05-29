// @flow

import type { DocumentNode } from 'graphql';

// 1 = loading
// 2 = setVariables
// 3 = fetchMore
// 4 = refetch
// 6 = poll
// 7 = ready
// 8 = error
export type NetworkStatus = 1 | 2 | 3 | 4 | 6 | 7 | 8;

export type FetchPolicy =
  | 'cache-first'
  | 'cache-and-network'
  | 'network-only'
  | 'cache-only'
  | 'standby';

// this is query result from client.query() or client.watchQuery().subscribe({ next });
export type QueryResult<T> = {
  data: T,
  loading: boolean,
  networkStatus: NetworkStatus,
  stale: boolean,
};

// TODO determine data field by loading property, so
// if loading is false and error is null, then data should be defined as user expects them
// if loading is true then data could be nullable
// if loading is false and error is Error, then data could be nullable (user can use partial render fir example)
// this is current query result (state) of subscription
export type CurrentQueryResult<T> = {
  data: T,
  error: ?Error,
  loading: boolean,
  networkStatus: NetworkStatus,
  partial: ?boolean,
};

export type Observer<T> = {
  complete?: () => void,
  error?: (e: ApolloError) => void,
  next?: (result: QueryResult<T>) => void,
};

export type Subscription = {
  unsubscribe(): void,
};

export type UpdateQueryOptions = {
  variables: ?Object,
};

export type ModifiableWatchQueryOptions = {
  fetchPolicy?: FetchPolicy,
  notifyOnNetworkStatusChange?: boolean,
  pollInterval?: number,
  reducer?: OperationResultReducer,
  variables?: { [key: string]: any },
};

export type FetchMoreOptions<T> = {
  query?: DocumentNode,
  updateQuery: (
    previousQueryResult: T,
    options: {
      fetchMoreResult: T,
      queryVariables: Object,
    },
  ) => Object,
  variables: any,
};

export type SubscribeToMoreOptions = {
  document: DocumentNode,
  variables?: { [key: string]: any },
  updateQuery?: (
    previousQueryResult: Object,
    options: {
      subscriptionData: { data: any },
      variables: { [key: string]: any },
    },
  ) => Object,
  onError?: (error: Error) => void,
};

export type ObservableQuery<T> = {
  currentResult(): CurrentQueryResult<T>,
  fetchMore(options: FetchMoreOptions<T>): Promise<QueryResult<T>>,
  getLastResult(): QueryResult<T>,
  subscribe(subscriber: Observer<T>): Subscription,
  refetch(variables?: { [key: string]: any }): Promise<QueryResult<T>>,
  result(): Promise<QueryResult<T>>,
  setOptions(options: ModifiableWatchQueryOptions): Promise<QueryResult<T>>,
  setVariables(variables: any, tryFetch?: boolean): Promise<QueryResult<T>>,
  subscribeToMore(options: SubscribeToMoreOptions): () => void, // returns ubsubscribe function
  startPolling(pollInterval: number): void,
  stopPolling(): void,
  updateQuery(mapFn: (previousQueryResult: T, options: UpdateQueryOptions) => any): void,
  variables: { [key: string]: any },
};

/*
 * Helper type used if you need to annotate type for arguments passed from render queries arg
 */
export type ResultTypeToResultObject<T: Object> = CurrentQueryResult<$ObjMap<T, <V>(V) => ?V>> & {
  observer: ObservableQuery<T>,
};

export type PureQueryOptions = {
  query: DocumentNode,
  variables?: { [key: string]: any },
};

export type MutationQueryReducer = (
  previousResult: Object,
  options: {
    mutationResult: Object,
    queryName: Object,
    queryVariables: Object,
  },
) => Object;

export type MutationQueryReducersMap = {
  [queryName: string]: MutationQueryReducer,
};

export type OperationResultReducer = (
  previousResult: Object,
  action: Object,
  variables: Object,
) => Object;

export type OperationResultReducerMap = {
  [queryId: string]: OperationResultReducer,
};

export type DataProxyReadQueryOptions = {
  query: DocumentNode,
  variables?: { [key: string]: any },
};

export type DataProxyReadFragmentOptions = {
  id: string,
  fragment: DocumentNode,
  fragmentName?: string,
  variables?: { [key: string]: any },
};

export type DataProxyWriteQueryOptions = {
  data: any,
  query: DocumentNode,
  variables?: { [key: string]: any },
};

export type DataProxyWriteFragmentOptions = {
  data: any,
  id: string,
  fragment: DocumentNode,
  fragmentName?: string,
  variables?: Object,
};

export type DataProxy = {
  readQuery<QueryType>(options: DataProxyReadQueryOptions): QueryType,
  readFragment<FragmentType>(options: DataProxyReadFragmentOptions): ?FragmentType,
  writeQuery(options: DataProxyWriteQueryOptions): void,
  writeFragment(options: DataProxyWriteFragmentOptions): void,
};

export type MutationUpdaterFn = (proxy: DataProxy, mutationResult: Object) => void;

export class ApolloError extends Error {
  graphQLErrors: ?Array<any>;
  networkError: ?Error;
}

export type ApolloClient = {
  query(options: {
    fetchPolicy?: FetchPolicy,
    metadata?: any,
    notifyOnNetworkStatusChange?: boolean,
    query: DocumentNode,
    reducer?: OperationResultReducer,
    variables?: { [key: string]: any },
  }): Promise<QueryResult<*>>,
  mutate(options: {
    mutation: DocumentNode,
    optimisticResponse?: Object,
    refetchQueries?: Array<string | PureQueryOptions>,
    update?: MutationUpdaterFn,
    updateQueries?: MutationQueryReducersMap,
    variables?: { [key: string]: any },
  }): Promise<QueryResult<*>>,
  watchQuery(
    options: ModifiableWatchQueryOptions & {
      metadata?: any,
      query: DocumentNode,
    },
  ): ObservableQuery<*>,
};
