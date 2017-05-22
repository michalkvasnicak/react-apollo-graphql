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

// this is query result from client.query() or client.watchQuery().subscribe({ next });
export type QueryResult<T> = {
  data: T, // $ObjMap<T, <V>(V) => ?V>, is buggy
  loading: boolean,
  networkStatus: NetworkStatus,
  stale: boolean,
};

// this is current query result (state) of subscription
export type CurrentQueryResult<T> = {
  data: T, // $ObjMap<T, <V>(V) => ?V>, is buggy
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

export type ObservableQuery<T> = {
  subscribe(subscriber: Observer<T>): Subscription,
  variables: { [key: string]: any },
  result(): Promise<QueryResult<T>>,
  currentResult(): CurrentQueryResult<T>,
  refetch(variables?: { [key: string]: any }): Promise<QueryResult<T>>,
  fetchMore(): Promise<QueryResult<T>>,
};

export class ApolloError extends Error {
  graphQLErrors: ?Array<any>;
  networkError: ?Error;
}

export type ApolloClient = {
  mutate(options: {
    mutation: DocumentNode,
    optimisticResponse?: Object,
    refetchQueries?: Array<string>,
    variables?: { [key: string]: any },
  }): Promise<QueryResult<*>>,
  watchQuery(options: {
    fetchPolicy?: 'cache-first' | 'cache-and-network' | 'network-only' | 'cache-only',
    metadata?: any,
    notifyOnNetworkStatusChange?: ?boolean,
    pollInterval?: ?number,
    query: DocumentNode,
    variables?: { [key: string]: any },
  }): ObservableQuery<*>,
};
