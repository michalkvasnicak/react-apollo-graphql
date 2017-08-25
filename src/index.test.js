// @flow

import ApolloClient from 'apollo-client';
import createStepper from '../test/stepper';
import gql from 'graphql-tag';
import React from 'react';
import { mockNetworkInterface } from 'apollo-test-utils';
import { mount, shallow } from 'enzyme';

import GraphQL, { type Queries } from './';
import { type ObservableQuery } from './types';

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
            query: gql`
              {
                id
              }
            `,
          },
          result: {
            data: { id: 1 },
          },
        }),
      });
      const stepper = createStepper([
        // on first call we expect queries to be in loading state with null data
        queries => {
          expect(queries.testQuery.data).toEqual({});
          expect(queries.testQuery.loading).toBe(true);
          expect(queries.testQuery.networkStatus).toBe(1);
          expect(queries.testQuery.partial).toBe(true);
          expect(queries.testQuery.observer.refetch).toBeDefined();
          expect(queries.testQuery.observer.fetchMore).toBeDefined();
        },
        // on second call we expect queries to be resolved
        queries => {
          expect(queries.testQuery.data).toEqual({ id: 1 });
          expect(queries.testQuery.loading).toBe(false);
          expect(queries.testQuery.networkStatus).toBe(7);
          expect(queries.testQuery.partial).toBe(false);
        },
      ]);
      const queries: Queries = {
        testQuery: (client, props) =>
          client.watchQuery({
            query: gql`
              {
                id
              }
            `,
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
              query: gql`
                {
                  id
                }
              `,
            },
            result: {
              data: { id: 1 },
              errors: [{ message: 'abwab' }],
            },
          },
          {
            request: {
              query: gql`
                {
                  id
                }
              `,
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
          expect(queries.testQuery.data).toEqual({});
          expect(queries.testQuery.loading).toBe(true);
          expect(queries.testQuery.networkStatus).toBe(1);
          expect(queries.testQuery.partial).toBe(true);
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
            query: gql`
              {
                id
              }
            `,
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
              query: gql`
                {
                  id
                }
              `,
            },
            error: new Error('Abwab'),
          },
          {
            request: {
              query: gql`
                {
                  id
                }
              `,
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
              observer: queries.testQuery.observer,
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
            query: gql`
              {
                id
              }
            `,
          }),
      };

      shallow(<GraphQL client={client} render={stepper.renderer} queries={queries} />);

      await stepper.promise;
    });

    it('unsubscribes from all queries on unmount', async () => {
      const client = new ApolloClient({
        networkInterface: mockNetworkInterface({
          request: {
            query: gql`
              {
                id
              }
            `,
          },
          error: new Error('Abwab'),
        }),
      });
      const queries: Queries = {
        testQuery: (client, props) =>
          client.watchQuery({
            query: gql`
              {
                id
              }
            `,
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
        {
          testQuery: {
            data: {},
            loading: true,
            networkStatus: 1,
            partial: true,
            observer: renderer.mock.calls[0][0].testQuery.observer,
          },
        },
        {},
        {},
        {},
        wrapper.props(),
      );
    });

    it('start polling queries and stops polling on unmount', async () => {
      const client = new ApolloClient({
        networkInterface: mockNetworkInterface(
          {
            request: {
              query: gql`
                {
                  id
                }
              `,
            },
            result: {
              data: { id: 1 },
            },
          },
          {
            request: {
              query: gql`
                {
                  id
                }
              `,
            },
            result: {
              data: { id: 1 },
            },
          },
        ),
      });
      let observer;
      const queries: Queries = {
        testQuery: (client, props) => {
          observer = client.watchQuery({
            notifyOnNetworkStatusChange: true,
            pollInterval: 10,
            query: gql`
              {
                id
              }
            `,
          });

          // $FlowExpectError
          observer.stopPolling = jest.fn(observer.stopPolling);
          return observer;
        },
      };
      const renderer = jest.fn(() => <div />);

      const wrapper = mount(<GraphQL client={client} render={renderer} queries={queries} />);

      await new Promise(r => setTimeout(r, 16));

      // stopPolling should be called on all queries and unscribed from them
      wrapper.unmount(); // simulate componentWillUnmount()

      // $FlowExpectError
      expect(observer.stopPolling).toHaveBeenCalled();
      expect(renderer).toHaveBeenCalledTimes(4);
      expect(renderer.mock.calls[0][0]).toEqual({
        testQuery: {
          data: {},
          loading: true,
          networkStatus: 1,
          partial: true,
          observer: renderer.mock.calls[0][0].testQuery.observer,
        },
      });
      expect(renderer.mock.calls[1][0]).toEqual({
        testQuery: {
          data: { id: 1 },
          loading: false,
          networkStatus: 7,
          partial: false,
          observer: renderer.mock.calls[0][0].testQuery.observer,
        },
      });
      expect(renderer.mock.calls[2][0]).toEqual({
        testQuery: {
          data: { id: 1 },
          loading: true,
          networkStatus: 6,
          partial: false,
          observer: renderer.mock.calls[0][0].testQuery.observer,
        },
      });
      expect(renderer.mock.calls[3][0]).toEqual({
        testQuery: {
          data: { id: 1 },
          loading: false,
          networkStatus: 7,
          partial: false,
          observer: renderer.mock.calls[0][0].testQuery.observer,
        },
      });
    });

    it('refetches a query only if props has changed', async () => {
      const client = new ApolloClient({
        networkInterface: mockNetworkInterface(
          {
            request: {
              query: gql`
                query test($id: Int!, $text: String!) {
                  parse(id: $id, text: $text)
                }
              `,
              variables: { id: 1, text: '' },
            },
            result: {
              data: { parse: 10 },
            },
          },
          {
            request: {
              query: gql`
                query test($id: Int!, $text: String!) {
                  parse(id: $id, text: $text)
                }
              `,
              variables: { id: 11, text: 'Test' },
            },
            result: {
              data: { parse: 10 },
            },
          },
        ),
      });

      let observer;
      const queries: Queries = {
        testQuery: (client, props, options) => {
          options.hasVariablesChanged((currentProps, nextProps) => {
            if (currentProps.id === nextProps.id && currentProps.text === nextProps.text) {
              return false;
            }

            return {
              id: nextProps.id,
              text: nextProps.text,
            };
          });

          observer = client.watchQuery({
            query: gql`
              query test($id: Int!, $text: String!) {
                parse(id: $id, text: $text)
              }
            `,
            variables: { id: 1, text: '' },
          });

          // $FlowExpectError
          observer.setVariables = jest.fn(observer.setVariables);
          return observer;
        },
      };
      const renderer = jest.fn(() => <div />);

      const wrapper = mount(
        <GraphQL id={10} text="" client={client} render={renderer} queries={queries} />,
      );

      await new Promise(r => setTimeout(r, 10));
      expect(renderer).toHaveBeenCalledTimes(2);
      expect(renderer.mock.calls[0][0]).toEqual({
        testQuery: {
          data: {},
          loading: true,
          networkStatus: 1,
          partial: true,
          observer: renderer.mock.calls[0][0].testQuery.observer,
        },
      });
      expect(renderer.mock.calls[1][0]).toEqual({
        testQuery: {
          data: { parse: 10 },
          loading: false,
          networkStatus: 7,
          partial: false,
          observer: renderer.mock.calls[0][0].testQuery.observer,
        },
      });

      // now change props so we will refetch the query with new variables
      wrapper.setProps({ id: 11, text: 'Test' });
      await new Promise(r => setTimeout(r, 10));

      // $FlowExpectError
      expect(observer.setVariables).toHaveBeenCalledTimes(1);
      // $FlowExpectError
      expect(observer.setVariables).toHaveBeenCalledWith({ id: 11, text: 'Test' });
      expect(renderer).toHaveBeenCalledTimes(4);
      expect(renderer.mock.calls[2][0]).toEqual({
        testQuery: {
          data: {},
          loading: true,
          networkStatus: 2,
          partial: true,
          observer: renderer.mock.calls[0][0].testQuery.observer,
        },
      });
      expect(renderer.mock.calls[3][0]).toEqual({
        testQuery: {
          data: { parse: 10 },
          loading: false,
          networkStatus: 7,
          partial: false,
          observer: renderer.mock.calls[0][0].testQuery.observer,
        },
      });

      // now change other props which are not used as a variables in query (it won't refetch);
      wrapper.setProps({ newProp: 'test' });
      // $FlowExpectError
      expect(observer.setVariables).toHaveBeenCalledTimes(1);
      expect(renderer).toHaveBeenCalledTimes(5);
    });
  });

  describe('fetchers', () => {
    it('passes empty fetchers object to render function', async () => {
      const client = new ApolloClient({
        networkInterface: mockNetworkInterface(),
      });
      const steps = [
        (q, m, fetchers) => {
          expect(fetchers).toEqual({});
        },
      ];
      const stepper = createStepper(steps);

      // first render as a render prop
      shallow(<GraphQL client={client} render={stepper.renderer} />);

      await stepper.promise;
    });

    it('initalizes and passes fetchers object to render function on each render', () => {
      const client = new ApolloClient({
        networkInterface: mockNetworkInterface(),
      });
      const fetchers = {
        a: jest.fn(),
      };
      const renderer = jest.fn(() => <div />);

      // first render as a render prop
      const wrapper = mount(<GraphQL fetchers={fetchers} render={renderer} />, {
        context: { client },
      });

      expect(renderer).toHaveBeenCalledTimes(1);
      expect(fetchers.a).toHaveBeenCalledTimes(1);
      expect(fetchers.a).toHaveBeenCalledWith(client, wrapper.props());

      wrapper.setProps({ test: 1 });

      expect(renderer).toHaveBeenCalledTimes(2);
      expect(fetchers.a).toHaveBeenCalledTimes(2);
      expect(fetchers.a).toHaveBeenCalledWith(client, wrapper.props());

      wrapper.setProps({ test: 2 });

      expect(renderer).toHaveBeenCalledTimes(3);
      expect(fetchers.a).toHaveBeenCalledTimes(3);
      expect(fetchers.a).toHaveBeenCalledWith(client, wrapper.props());
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
              mutation: gql`
                mutation a {
                  add
                }
              `,
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

  describe('fragments', () => {
    it('passes empty fragments object to render function', async () => {
      const client = new ApolloClient({
        networkInterface: mockNetworkInterface(),
      });
      const steps = [
        (q, m, f, fragments) => {
          expect(fragments).toEqual({});
        },
      ];
      const stepper = createStepper(steps);

      // first render as a render prop
      shallow(<GraphQL client={client} render={stepper.renderer} />);

      await stepper.promise;
    });

    it('passes fragments object to render function', async () => {
      const fragment = gql`
        fragment userDetail on User {
          __typename
          id
          email
          name
        }
      `;
      const userQuery = gql`
        query user($id: Int!) {
          user {
            ...userDetail
          }
        }

        ${fragment}
      `;
      const client = new ApolloClient({
        dataIdFromObject(obj: { __typename: ?string, id: any }) {
          if (obj.__typename && obj.id != null) {
            return `${obj.__typename}-${obj.id}`;
          }

          return undefined;
        },
      });

      client.writeQuery({
        data: { user: { __typename: 'User', id: 11, email: 'test@test', name: 'Fero' } },
        query: userQuery,
        variables: { id: 11 },
      });

      const fragments = {
        userDetail: client =>
          client.readFragment({
            id: 'User-11',
            fragment: gql`
              fragment userDetail on User {
                __typename
                id
                email
                name
              }
            `,
          }),
      };

      const stepper = createStepper([
        // on first call we expect queries to be in loading state with null data
        (queries, mutations, fetchers, fr) => {
          expect(fr.userDetail).toEqual({
            __typename: 'User',
            id: 11,
            email: 'test@test',
            name: 'Fero',
          });
        },
      ]);

      shallow(<GraphQL render={stepper.renderer} fragments={fragments} />, { context: { client } });

      await stepper.promise;
    });

    it('refetches a fragment only if props has changed', async () => {
      const fragment = gql`
        fragment userDetail on User {
          __typename
          id
          email
          name
        }
      `;
      const userQuery = gql`
        query user($id: Int!) {
          user {
            ...userDetail
          }
        }

        ${fragment}
      `;
      const client = new ApolloClient({
        dataIdFromObject(obj: { __typename: ?string, id: any }) {
          if (obj.__typename && obj.id != null) {
            return `${obj.__typename}-${obj.id}`;
          }

          return undefined;
        },
      });

      client.writeQuery({
        data: { user: { __typename: 'User', id: 11, email: 'test@test', name: 'Fero' } },
        query: userQuery,
        variables: { id: 11 },
      });

      client.writeQuery({
        data: { user: { __typename: 'User', id: 12, email: 'test@test.2', name: 'Fero 2' } },
        query: userQuery,
        variables: { id: 12 },
      });

      const stepper = createStepper([
        (queries, mutations, fetchers, fr) => {
          expect(fr.userDetail).toEqual({
            __typename: 'User',
            id: 11,
            email: 'test@test',
            name: 'Fero',
          });
        },
        (queries, mutations, fetchers, fr) => {
          expect(fr.userDetail).toEqual({
            __typename: 'User',
            id: 12,
            email: 'test@test.2',
            name: 'Fero 2',
          });
        },
        (queries, mutations, fetchers, fr) => {
          expect(fr.userDetail).toEqual({
            __typename: 'User',
            id: 12,
            email: 'test@test.2',
            name: 'Fero 2',
          });
        },
        (queries, mutations, fetchers, fr) => {
          expect(fr.userDetail).toEqual({
            __typename: 'User',
            id: 11,
            email: 'test@test',
            name: 'Fero',
          });
        },
        (queries, mutations, fetchers, fr) => {
          expect(fr.userDetail).toEqual(null);
        },
      ]);

      const fragments = {
        userDetail: (client, previousProps, currentProps) => {
          if (previousProps && previousProps.id === currentProps.id) {
            return false;
          }

          return client.readFragment({
            id: `User-${currentProps.id}`,
            fragment: gql`
              fragment userDetail on User {
                __typename
                id
                email
                name
              }
            `,
          });
        },
      };

      const wrapper = shallow(<GraphQL id={11} render={stepper.renderer} fragments={fragments} />, {
        context: { client },
      });

      wrapper.setProps({ id: 12 });
      wrapper.setProps({ id: 12 });
      wrapper.setProps({ id: 11 });
      wrapper.setProps({ id: 13 });

      await stepper.promise;
    });
  });
});
