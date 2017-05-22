// @flow

import React from 'react';
import PropTypes from 'prop-types';
import {
  type ApolloClient,
  type CurrentQueryResult,
  type ObservableQuery,
  type QueryResult,
  type Subscription,
} from './types';

export type Queries = {
  [key: string]: (client: ApolloClient, ownProps: Object) => ObservableQuery<any>,
};

type Mutation = (...args: any) => Promise<QueryResult<any>>;

type MutationsInitializers = {
  [key: string]: (client: ApolloClient, ownProps: Object) => Mutation,
};

// not used because of
// https://github.com/facebook/flow/issues/3986
type DefaultProps = {
  mutations: MutationsInitializers,
  queries: Queries,
};

type Props<Q: Queries, M: MutationsInitializers> = {
  client?: ApolloClient,
  mutations?: M,
  queries?: Q,
  render: (
    queries: $ObjMap<
      Q,
      <A>(
        (client: ApolloClient, ownProps: Object) => ObservableQuery<A>,
      ) => CurrentQueryResult<$ObjMap<A, <B>(B) => ?B>>,
    >,
    mutations: $ObjMap<M, <V>((client: ApolloClient, ownProps: Object) => V) => V>,
    props: *,
  ) => React$Element<*>,
};

type State = {
  [key: string]: CurrentQueryResult<*>,
};

// add server side render
// on server we have only 1 pass, so we can halt execution on all queries passed to GraphQL
// then wait for them to resolve, and call render function and repeat these steps
// until we have no more queries to process
export default class GraphQL extends React.Component<void, Props<*, *>, State> {
  static contextTypes = {
    client: PropTypes.object,
  };

  // somehow this is bug
  /* static defaultProps = {
    mutations: {},
    queries: {},
  };*/

  context: { client: ?ApolloClient };
  hasMount: boolean = false;
  observers: { [key: string]: ObservableQuery<*> } = {};
  state = {};
  subscriptions: { [key: string]: Subscription } = {};

  componentWillMount() {
    this.hasMount = true;

    const props = this.props;
    const { mutations = {}, queries = {}, render } = this.props;
    const client = this.getClient();

    // now process queries in props and assign subscriptions to internal state
    // so we can ubsubscribe from them on unmount
    // alse create state so we can update this component's state in response
    // to observable changes
    const results = Object.keys(queries).reduce((state, key) => {
      // now call query initializer with component's props and client
      const observer = queries[key](client, props);

      this.observers[key] = observer;

      // subscribe to changes
      const subscription = observer.subscribe({
        next: () => this.updateResults(key, observer.currentResult()),
        error: () => this.updateResults(key, observer.currentResult()),
      });

      this.subscriptions[key] = subscription;

      return {
        ...state,
        [key]: observer.currentResult(),
      };
    }, {});

    this.setState(results);
  }

  getClient = (): ApolloClient => {
    const { client: clientFromContext } = this.context;
    const { client: clientFromProps } = this.props;

    if (clientFromContext) {
      return clientFromContext;
    } else if (clientFromProps) {
      return clientFromProps;
    }

    throw new Error(
      'Please specify apollo client using client prop or provide it using <ApolloProvider />.',
    );
  };

  componentWillUnmount() {
    this.hasMount = false;

    // unsubscribe from all subscriptions
    Object.keys(this.subscriptions).forEach(key => this.subscriptions[key].unsubscribe());
    this.subscriptions = {};
  }

  updateResults = (key: string, result: CurrentQueryResult<*>) => {
    if (!this.hasMount) {
      return;
    }

    this.setState(state => ({
      ...state,
      [key]: result,
    }));
  };

  render() {
    const { client, mutations = {}, render } = this.props;

    // process mutation initializers
    const initializedMutations = Object.keys(mutations).reduce(
      (res, key) => ({
        ...res,
        [key]: mutations[key](client, this.props),
      }),
      {},
    );

    return render(this.state, initializedMutations, this.props);
  }
}
