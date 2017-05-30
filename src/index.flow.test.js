// @flow

import GraphQL, { type QueryInitializerOptions } from './';
import React from 'react';
import type {
  ApolloClient,
  FragmentResult,
  ObservableQuery,
  QueryResult,
  ResultTypeToResultObject,
} from './types';

// test GraphQL component
(function() {
  <GraphQL render={() => <div />} />;
  // $FlowExpectError
  <GraphQL client={10} render={() => <div />} />;
  // $FlowExpectError
  <GraphQL queries={10} render={() => <div />} />;
  // $FlowExpectError
  <GraphQL mutations={10} render={() => <div />} />;
  // $FlowExpectError
  <GraphQL render={10} />;

  const queries: {
    a: (
      client: ApolloClient,
      props: Object,
      options: QueryInitializerOptions,
    ) => ObservableQuery<{ id: number }>,
  } = ({}: any);

  // test queries
  <GraphQL
    queries={queries}
    render={q => {
      // $FlowExpectError
      (q.a.data.id: string);
      (q.a.observer.fetchMore: (variables: any) => Promise<QueryResult<{ id: number }>>);
      // $FlowExpectError
      (q.a.observer.fetchMore: (variables: any) => Promise<QueryResult<{ id: string }>>);

      return <div />;
    }}
  />;

  const fetchers: {
    search: (
      client: ApolloClient,
      props: Object,
    ) => (query: string) => Promise<QueryResult<{ results: Array<{ id: number }> }>>,
  } = ({}: any);

  // test fetchers
  <GraphQL
    fetchers={fetchers}
    render={(q, m, f) => {
      (f.search: (query: string) => Promise<QueryResult<{ results: Array<{ id: number }> }>>);
      // $FlowExpectError
      (f.search: (query: string) => Promise<QueryResult<{ results: Array<{ id: string }> }>>);

      return <div />;
    }}
  />;

  // test fragments
  const fragments: {
    userDetail: (
      client: ApolloClient,
      previousProps: ?Object,
      currentProps: Object,
    ) => FragmentResult<{ id: number, name: string }>,
  } = ({}: any);

  <GraphQL
    fragments={fragments}
    render={(q, m, f, fr) => {
      (fr.userDetail: ?{ id: number, name: string });
      // $FlowExpectError
      (fr.userDetail: { id: number, name: string });
      // $FlowExpectError
      (fr.userDetail: ?{ id: string, name: string });
      // $FlowExpectError
      (fr.userDetail: ?{ id: number, name: number });

      return <div />;
    }}
  />;

  // utils
  const uTest1: ResultTypeToResultObject<{ user: { name: string } }> = ({}: any);
  (uTest1.data.user: ?{ name: string });
  (uTest1.loading: boolean);
  (uTest1.error: ?Error);
  (uTest1.networkStatus: number);
  (uTest1.partial: ?boolean);
  (uTest1.observer: ObservableQuery<{ user: { name: string } }>);
})();
