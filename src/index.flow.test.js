// @flow

import GraphQL from './';
import React from 'react';
import type { ApolloClient, ObservableQuery } from './types';

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
    a: (client: ApolloClient, props: Object) => ObservableQuery<{ id: number }>,
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
})();
