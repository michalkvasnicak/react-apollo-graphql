// @flow

import ApolloClient from 'apollo-client';
import gql from 'graphql-tag';
import React from 'react';
import { mockNetworkInterface } from 'apollo-test-utils';
import { mount, shallow } from 'enzyme';

import GraphQL, { type Queries } from './';
import { type ObservableQuery } from './types';

function createStepper(steps: Array<Function>): { promise: Promise<any>, renderer: Function } {
  let step = 0;
  let resolve: any = null;
  let reject: any = null;

  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    promise,
    renderer: (...args) => {
      if (steps.length <= step) {
        reject(new Error(`There is no step for index ${step}`));
      } else {
        try {
          steps[step++](...args);

          if (step >= steps.length) {
            resolve();
          }
        } catch (e) {
          reject(e);
        }
      }

      return <div />;
    },
  };
}

describe('GraphQL component', () => {
  it('throws if apollo client is not specified in context or prop', () => {
    expect(() => {
      shallow(<GraphQL render={() => <div />} />);
    }).toThrow(
      'Please specify apollo client using client prop or provide it using <ApolloProvider />.',
    );
  });

  describe('queries', () => {
    it('passes empty queries object to render function', async () => {
      const client = new ApolloClient({
        networkInterface: mockNetworkInterface(),
      });
      const steps = [
        queries => {
          expect(queries).toEqual({});
        },
      ];
      const stepper = createStepper(steps);

      // first render as a render prop
      shallow(<GraphQL client={client} render={stepper.renderer} />);

      await stepper.promise;
    });

    it('passes queries object to render function', async () => {
      const client = new ApolloClient({
        networkInterface: mockNetworkInterface({
          request: {
            query: gql`{ id }`,
          },
          result: {
            data: { id: 1 },
          },
        }),
      });
      const stepper = createStepper([
        // on first call we expect queries to be in loading state with null data
        queries => {
          expect(queries).toEqual({
            testQuery: {
              data: {},
              loading: true,
              networkStatus: 1,
              partial: true,
            },
          });
        },
        // on second call we expect queries to be resolved
        queries => {
          expect(queries).toEqual({
            testQuery: {
              data: { id: 1 },
              loading: false,
              networkStatus: 7,
              partial: false,
            },
          });
        },
      ]);
      const queries: Queries = {
        testQuery: (client, props) =>
          client.watchQuery({
            query: gql`{ id }`,
          }),
      };

      // first render as a render prop
      shallow(<GraphQL render={stepper.renderer} queries={queries} />, { context: { client } });

      await stepper.promise;
    });

    it('handles graphql errors in queries', async () => {
      const client = new ApolloClient({
        networkInterface: mockNetworkInterface(
          {
            request: {
              query: gql`{ id }`,
            },
            result: {
              data: { id: 1 },
              errors: [{ message: 'abwab' }],
            },
          },
          {
            request: {
              query: gql`{ id }`,
            },
            result: {
              data: { id: 1 },
              errors: [{ message: 'abwab 2' }],
            },
          },
        ),
      });
      const stepper = createStepper([
        // on first call we expect queries to be in loading state with null data
        queries => {
          expect(queries).toEqual({
            testQuery: {
              data: {},
              loading: true,
              networkStatus: 1,
              partial: true,
            },
          });
        },
        // on second call we expect queries to be resolved
        queries => {
          expect(queries.testQuery.data).toEqual({});
          expect(queries.testQuery.error).toBeInstanceOf(Error);
          expect(queries.testQuery.loading).toBe(false);
          expect(queries.testQuery.networkStatus).toBe(7);
          expect(queries.testQuery.partial).toBe(undefined);
          expect(queries.testQuery.error.message).toBe('GraphQL error: abwab');
        },
      ]);
      const queries: Queries = {
        testQuery: (client, props): ObservableQuery<{ id: number }> =>
          client.watchQuery({
            query: gql`{ id }`,
          }),
      };

      // first render as a render prop
      shallow(<GraphQL client={client} render={stepper.renderer} queries={queries} />);

      await stepper.promise;
    });

    it('handles graphql errors in queries', async () => {
      const client = new ApolloClient({
        networkInterface: mockNetworkInterface(
          {
            request: {
              query: gql`{ id }`,
            },
            error: new Error('Abwab'),
          },
          {
            request: {
              query: gql`{ id }`,
            },
            error: new Error('Abwab 2'),
          },
        ),
      });
      const stepper = createStepper([
        // on first call we expect queries to be in loading state with null data
        queries => {
          expect(queries).toEqual({
            testQuery: {
              data: {},
              loading: true,
              networkStatus: 1,
              partial: true,
            },
          });
        },
        // on second call we expect queries to be resolved
        queries => {
          expect(queries.testQuery.data).toEqual({});
          expect(queries.testQuery.error).toBeInstanceOf(Error);
          expect(queries.testQuery.loading).toBe(false);
          expect(queries.testQuery.networkStatus).toBe(8);
          expect(queries.testQuery.partial).toBe(undefined);
          expect(queries.testQuery.error.message).toBe('Network error: Abwab');
        },
      ]);
      const queries: Queries = {
        testQuery: (client, props) =>
          client.watchQuery({
            query: gql`{ id }`,
          }),
      };

      shallow(<GraphQL client={client} render={stepper.renderer} queries={queries} />);

      await stepper.promise;
    });

    it('unsubscribes from all queries on unmount', async () => {
      const client = new ApolloClient({
        networkInterface: mockNetworkInterface({
          request: {
            query: gql`{ id }`,
          },
          error: new Error('Abwab'),
        }),
      });
      const queries: Queries = {
        testQuery: (client, props) =>
          client.watchQuery({
            query: gql`{ id }`,
          }),
      };
      const renderer = jest.fn(() => <div />);

      const wrapper = mount(<GraphQL client={client} render={renderer} queries={queries} />);
      wrapper.unmount(); // simulate componentWillUnmount()

      // our query is resolved after component is unmounted
      await new Promise(r => setTimeout(r, 20));

      // now renderer should be called only once because we unmounted the component before query
      // has been resolved
      expect(renderer).toHaveBeenCalledTimes(1);
      expect(renderer).toHaveBeenCalledWith(
        { testQuery: { data: {}, loading: true, networkStatus: 1, partial: true } },
        {},
        wrapper.props(),
      );
    });
  });

  describe('mutations', () => {
    it('passes empty mutations object to render prop', () => {
      const client = new ApolloClient({
        networkInterface: mockNetworkInterface(),
      });
      const renderer = (queries, mutations) => {
        expect(mutations).toEqual({});

        return <div />;
      };

      shallow(<GraphQL client={client} render={renderer} />);
    });

    it('passes mutations object to render prop', () => {
      const client = new ApolloClient({
        networkInterface: mockNetworkInterface(),
      });
      const mutations = {
        add: (client, props) => {
          expect(client).toBeDefined();

          return () =>
            client.mutate({
              mutation: gql`mutation a { add }`,
            });
        },
      };
      const renderer = (queries, initializedMutations) => {
        expect(initializedMutations).toHaveProperty('add');

        return <div />;
      };

      shallow(<GraphQL mutations={mutations} render={renderer} />, { context: { client } });
    });
  });
});
