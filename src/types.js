// @flow

import type { DocumentNode } from 'graphql';
import type {
  ApolloClient,
  ApolloCurrentResult,
  ApolloError,
  ApolloExecutionResult,
  ApolloQueryResult,
  FetchMoreOptions,
  FetchMoreQueryOptions,
  FetchPolicy,
  ModifiableWatchQueryOptions,
  NetworkStatus,
  ObservableQuery,
  SubscribeToMoreOptions,
  Subscription,
  UpdateQueryOptions,
  WatchQueryOptions,
} from 'apollo-client';
export type FragmentInitializerResult<T> = ?T | false;

export type FragmentResult<T> = ?T;
export type QueryResult<T> = ApolloQueryResult<T>;

export type MutationResult<T> = ApolloExecutionResult<T>;
export type CurrentQueryResult<T> = {
  data: T,
  error: ?$PropertyType<ApolloCurrentResult<T>, 'error'>,
  loading: $PropertyType<ApolloCurrentResult<T>, 'loading'>,
  networkStatus: $PropertyType<ApolloCurrentResult<T>, 'networkStatus'>,
  partial: ?$PropertyType<ApolloCurrentResult<T>, 'partial'>,
};

export type ReactApolloGraphQLObservableQuery<T> = {
  options: WatchQueryOptions,
  queryId: string,
  variables: {
    [key: string]: any,
  },
  result(): Promise<QueryResult<T>>,
  currentResult(): CurrentQueryResult<T>,
  getLastResult(): QueryResult<T>,
  refetch(variables?: any): Promise<QueryResult<T>>,
  fetchMore(fetchMoreOptions: FetchMoreQueryOptions & FetchMoreOptions): Promise<QueryResult<T>>,
  subscribeToMore(options: SubscribeToMoreOptions): () => void,
  setOptions(opts: ModifiableWatchQueryOptions): Promise<QueryResult<T>>,
  setVariables(variables: any, tryFetch?: boolean): Promise<QueryResult<T>>,
  updateQuery(mapFn: (previousQueryResult: any, options: UpdateQueryOptions) => any): void,
  stopPolling(): void,
  startPolling(pollInterval: number): void,
};

/*
 * Helper type used if you need to annotate type for arguments passed from render queries arg
 */
export type ResultTypeToResultObject<T: {}> = {
  data: $PropertyType<CurrentQueryResult<$ObjMap<T, <V>(V) => ?V>>, 'data'>,
  error: $PropertyType<CurrentQueryResult<$ObjMap<T, <V>(V) => ?V>>, 'error'>,
  loading: $PropertyType<CurrentQueryResult<$ObjMap<T, <V>(V) => ?V>>, 'loading'>,
  networkStatus: $PropertyType<CurrentQueryResult<$ObjMap<T, <V>(V) => ?V>>, 'networkStatus'>,
  observer: ReactApolloGraphQLObservableQuery<T>,
  partial: $PropertyType<CurrentQueryResult<$ObjMap<T, <V>(V) => ?V>>, 'partial'>,
};

export type { ApolloError, ApolloClient, ObservableQuery, Subscription };
