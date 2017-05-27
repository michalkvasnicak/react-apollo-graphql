// @flow

import React from 'react';
import PropTypes from 'prop-types';
import { getDataFromTree } from './server';
import {
  type ApolloClient,
  type CurrentQueryResult,
  type ObservableQuery,
  type QueryResult,
  type Subscription,
} from './types';

type ObservableQueryOptions = {
  // calls on componentWillReceiveProps with current props as this.props and nextProps
  // should return false if props used for query's variables did not change
  // otherwise should return new variables
  hasVariablesChanged: (
    currentProps: Object,
    nextProps: Object,
  ) => boolean | { [key: string]: any },
};

export type QueryInitializerOptions = {
  // sets function to determine if there is relevant change in props to compute new variables
  // returns false if there is no change in props used for variables
  // or returns new variables for query.setVariables()
  hasVariablesChanged: (
    (currentProps: Object, nextProps: Object) => boolean | { [key: string]: any },
  ) => void,
};

export type Queries = {
  [key: string]: (
    client: ApolloClient,
    ownProps: Object,
    options: QueryInitializerOptions,
  ) => ObservableQuery<any>,
};

type Mutation = (...args: any) => Promise<QueryResult<any>>;

type MutationsInitializers = {
  [key: string]: (client: ApolloClient, ownProps: Object) => Mutation,
};

type FetchersInitializers = {
  [key: string]: (
    client: ApolloClient,
    ownProps: Object,
  ) => (...args: any) => Promise<QueryResult<any>>,
};

// not used because of
// https://github.com/facebook/flow/issues/3986
type DefaultProps = {
  mutations: MutationsInitializers,
  queries: Queries,
};

type Props<F: FetchersInitializers, Q: Queries, M: MutationsInitializers> = {
  client?: ApolloClient,
  fetchers?: F,
  mutations?: M,
  queries?: Q,
  render: (
    queries: $ObjMap<
      Q,
      <A>(
        (
          client: ApolloClient,
          ownProps: Object,
          options: QueryInitializerOptions,
        ) => ObservableQuery<A>,
      ) => CurrentQueryResult<$ObjMap<A, <B>(B) => ?B>> & { observer: ObservableQuery<A> },
    >,
    mutations: $ObjMap<M, <V>((client: ApolloClient, ownProps: Object) => V) => V>,
    fetchers: $ObjMap<
      F,
      <A: (...args: any) => Promise<QueryResult<any>>>(
        (client: ApolloClient, ownProps: Object) => A,
      ) => A,
    >,
    props: *,
  ) => React$Element<any>,
};

type State = {
  [key: string]: CurrentQueryResult<*>,
};

// add server side render
// on server we have only 1 pass, so we can halt execution on all queries passed to GraphQL
// then wait for them to resolve, and call render function and repeat these steps
// until we have no more queries to process
export default class GraphQL extends React.Component<void, Props<*, *, *>, State> {
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
  observers: {
    [key: string]: { options: ObservableQueryOptions, observer: ObservableQuery<*> },
  } = {};
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
      const options = {
        hasVariablesChanged: () => false,
      };

      // now call query initializer with component's props and client
      const observer = queries[key](client, props, {
        hasVariablesChanged(fn) {
          if (typeof fn !== 'function') {
            throw new Error(`hasVariablesChanged for query ${key} must be a function`);
          }

          options.hasVariablesChanged = fn;
        },
      });

      this.observers[key] = {
        options,
        observer,
      };

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

  componentWillReceiveProps = (nextProps: Object) => {
    // call hasVariablesChanged on all observable queries
    // and call setVariables() on them if they did not return false
    Object.keys(this.observers).forEach(key => {
      const variables = this.observers[key].options.hasVariablesChanged(this.props, nextProps);

      if (variables === false) {
        return;
      }

      if (variables === true) {
        throw new Error(`hasVariablesChanged can't return true`);
      }

      this.observers[key].observer.setVariables(variables);
    });
  };

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

  getObservers = (): Array<ObservableQuery<*>> =>
    Object.keys(this.observers).map(key => this.observers[key].observer);

  componentWillUnmount() {
    this.hasMount = false;

    // unsubscribe from all subscriptions
    Object.keys(this.subscriptions).forEach(key => {
      this.observers[key].observer.stopPolling();
      this.subscriptions[key].unsubscribe();
    });
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
    const { fetchers = {}, mutations = {}, render } = this.props;
    const client = this.getClient();

    // process mutation initializers
    const initializedMutations = Object.keys(mutations).reduce(
      (res, key) => ({
        ...res,
        [key]: mutations[key](client, this.props),
      }),
      {},
    );

    const initializedFetchers = Object.keys(fetchers).reduce(
      (res, key) => ({
        ...res,
        [key]: fetchers[key](client, this.props),
      }),
      {},
    );

    const queries = Object.keys(this.state).reduce(
      (res, key) => ({
        [key]: {
          observer: this.observers[key].observer,
          ...this.state[key],
        },
      }),
      {},
    );

    return render(queries, initializedMutations, initializedFetchers, this.props);
  }
}

export { getDataFromTree };
