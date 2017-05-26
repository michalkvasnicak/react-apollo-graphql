// @flow

import GraphQL, { type QueryInitializerOptions } from './';
import React from 'react';
import type { ApolloClient, ObservableQuery, QueryResult } from './types';

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
})();
