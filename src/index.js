// @flow

import React from 'react';
import PropTypes from 'prop-types';
import { getDataFromTree } from './server';
import {
  type ApolloClient,
  type CurrentQueryResult,
  type FragmentInitializerResult,
  type FragmentResult,
  type MutationResult,
  type ObservableQuery,
  type QueryResult,
  type Subscription,
  type ResultTypeToResultObject,
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

type Mutation = (...args: any) => Promise<MutationResult<any>>;

type MutationsInitializers = {
  [key: string]: (client: ApolloClient, ownProps: Object) => Mutation,
};

type Fetcher = (...args: any) => Promise<QueryResult<any>>;

type FetchersInitializers = {
  [key: string]: (client: ApolloClient, ownProps: Object) => Fetcher,
};

type FragmentsInitializers = {
  [key: string]: (
    client: ApolloClient,
    previousProps: ?Object,
    currentProps: Object,
  ) => FragmentResult<any>,
};

// not used because of
// https://github.com/facebook/flow/issues/3986
type DefaultProps = {
  mutations: MutationsInitializers,
  queries: Queries,
};

type Props<
  FR: FragmentsInitializers,
  F: FetchersInitializers,
  Q: Queries,
  M: MutationsInitializers,
> = {
  client?: ApolloClient,
  fetchers?: F,
  fragments?: FR,
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
      ) => ResultTypeToResultObject<A>,
    >,
    mutations: $ObjMap<M, <V>((client: ApolloClient, ownProps: Object) => V) => V>,
    fetchers: $ObjMap<
      F,
      <A: (...args: any) => Promise<QueryResult<any>>>(
        (client: ApolloClient, ownProps: Object) => A,
      ) => A,
    >,
    fragments: $ObjMap<
      FR,
      <A>(
        (
          client: ApolloClient,
          previousProps: ?Object,
          currentProps: Object,
        ) => FragmentInitializerResult<A>,
      ) => FragmentResult<A>,
    >,
    props: *,
  ) => React$Element<any>,
};

// add server side render
// on server we have only 1 pass, so we can halt execution on all queries passed to GraphQL
// then wait for them to resolve, and call render function and repeat these steps
// until we have no more queries to process
export default class GraphQL extends React.Component<Props<*, *, *, *>, void> {
  static contextTypes = {
    client: PropTypes.object,
  };

  // somehow this is bug
  /* static defaultProps = {
    mutations: {},
    queries: {},
  };*/

  context: { client: ?ApolloClient };
  fragments: { [key: string]: FragmentResult<any> } = {};
  fragmentsProps: { [key: string]: ?Object } = {};
  fetchers: { [key: string]: Fetcher } = {};
  hasMount: boolean = false;
  mutations: { [key: string]: Mutation } = {};
  observers: {
    [key: string]: { options: ObservableQueryOptions, observer: ObservableQuery<*> },
  } = {};
  subscriptions: { [key: string]: Subscription } = {};

  constructor(props: Props<*, *, *, *>, context: Object) {
    super(props, context);

    const { fetchers = {}, fragments = {}, mutations = {}, queries = {}, render } = this.props;
    const client = this.getClient();

    // now process queries in props and assign subscriptions to internal state
    // so we can ubsubscribe from them on unmount
    Object.keys(queries).forEach(key => {
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
        next: () => this.forceRerender(),
        error: () => this.forceRerender(),
      });

      this.subscriptions[key] = subscription;
    });

    this.initializeFetchers(fetchers, this.props);
    this.initializeMutations(mutations, this.props);

    this.fetchFragments(fragments, this.props);
  }

  componentWillMount() {
    this.hasMount = true;
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

    // reinitialize mutations
    this.initializeMutations(nextProps.mutations, nextProps);

    // reinitialize fetchers
    this.initializeFetchers(nextProps.fetchers, nextProps);

    // fetch fragments
    this.fetchFragments(nextProps.fragments, nextProps);
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

  fetchFragments = (fragments: FragmentsInitializers = {}, props: Object) => {
    const client = this.getClient();
    this.fragments = Object.keys(fragments).reduce((results, fragmentName) => {
      const previousProps = this.fragmentsProps[fragmentName];
      const previousData = this.fragments[fragmentName];
      let data = null;

      try {
        data = fragments[fragmentName](client, previousProps, props);

        // use previous data if props used as variables in fragments have not changed
        if (data === false) {
          data = previousData;
        }
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
          console.error(e);
        }
      }

      return {
        ...results,
        [fragmentName]: data,
      };
    }, {});
  };

  initializeFetchers = (fetchers: { [key: string]: Fetcher } = {}, props: Object) => {
    const client = this.getClient();

    this.fetchers = Object.keys(fetchers).reduce((initialized, fetcherName) => {
      return {
        ...initialized,
        [fetcherName]: fetchers[fetcherName](client, props),
      };
    }, {});
  };

  initializeMutations = (mutations: MutationsInitializers = {}, props: Object) => {
    const client = this.getClient();

    this.mutations = Object.keys(mutations).reduce((initialized, mutationName) => {
      return {
        ...initialized,
        [mutationName]: mutations[mutationName](client, props),
      };
    }, {});
  };

  forceRerender = () => {
    if (!this.hasMount) {
      return;
    }

    this.setState({});
  };

  render() {
    const { fetchers = {}, render } = this.props;
    const client = this.getClient();

    const queries = Object.keys(this.observers).reduce(
      (res, key) => ({
        ...res,
        [key]: {
          observer: this.observers[key].observer,
          ...this.observers[key].observer.currentResult(),
        },
      }),
      {},
    );

    return render(queries, this.mutations, this.fetchers, this.fragments, this.props);
  }
}

export { getDataFromTree };
