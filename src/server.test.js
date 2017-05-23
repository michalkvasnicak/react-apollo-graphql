// @flow

import ApolloClient from 'apollo-client';
import gql from 'graphql-tag';
import React from 'react';
import { mount } from 'enzyme';
import { mockNetworkInterface } from 'apollo-test-utils';

import GraphQL from './';
import { getDataFromTree } from './server';
import { type ApolloClient as Client, type ObservableQuery } from './types';

function App(props: { client: Client }) {
  return (
    <div>
      <GraphQL
        client={props.client}
        queries={{
          user: (
            client: Client,
          ): ObservableQuery<{ user: { __typename: string, id: number, email: string } }> =>
            client.watchQuery({
              query: gql`{ user { __typename, id, email }}`,
            }),
        }}
        render={({ user: { loading, data } }) => {
          if (loading) {
            return <span>Loading</span>;
          }

          return (
            <GraphQL
              client={props.client}
              queries={{
                projects: (
                  client: Client,
                ): ObservableQuery<{
                  user: { __typename: string, id: number, projects: Array<{ id: number }> },
                }> =>
                  client.watchQuery({
                    query: gql`{ user { __typename, id, projects { __typename, id } } }`,
                  }),
              }}
              render={({ projects: { data } }) => {
                if (data.user == null) {
                  return <span>Loading</span>;
                }

                return (
                  <ul>
                    {data.user.projects.map(project => <li key={project.id}>{project.id}</li>)}
                  </ul>
                );
              }}
            />
          );
        }}
      />
    </div>
  );
}

describe('server side render', () => {
  it('gets all queries from component tree and resolves them level by level', async () => {
    const client = new ApolloClient({
      networkInterface: mockNetworkInterface(
        {
          request: {
            query: gql`{ user { __typename, id, email }}`,
          },
          result: {
            data: {
              user: {
                __typename: 'user',
                id: 1,
                email: 'test@test.test',
              },
            },
          },
        },
        {
          request: {
            query: gql`{ user { __typename, id, projects { __typename, id } }}`,
          },
          result: {
            data: {
              user: {
                __typename: 'user',
                id: 1,
                projects: [{ __typename: 'project', id: 1 }, { __typename: 'project', id: 2 }],
              },
            },
          },
        },
      ),
    });

    const tree = <App client={client} />;

    await getDataFromTree(tree);

    // render complete tree and match it against snapshot
    const component = mount(tree);

    // we expect App to render <ul> with 2 <li>'s
    expect(component.find('li').length).toBe(2);
  });
});
