// @flow

import ApolloClient from 'apollo-client';
import gql from 'graphql-tag';
import React from 'react';
import { mount } from 'enzyme';
import { mockNetworkInterface } from 'apollo-test-utils';
import { Redirect, Route, StaticRouter, Switch } from 'react-router-dom';

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

describe('react-router ssr', () => {
  it('works correctly', async () => {
    function TestApp(props: { client: Client }) {
      return (
        <div>
          <Switch>
            <Route
              exact
              path="/"
              render={() => (
                <GraphQL
                  client={props.client}
                  queries={{
                    projects: (
                      client: Client,
                    ): ObservableQuery<{ projects: Array<{ id: number, title: string }> }> =>
                      client.watchQuery({
                        query: gql`{ projects { id, title } }`,
                      }),
                  }}
                  render={({ projects: { error, loading, data: { projects } } }) => {
                    if (loading || projects == null) {
                      return <span>loading</span>;
                    }

                    return (
                      <ul>
                        {projects.map(project => <li key={project.id}>{project.title}</li>)}
                      </ul>
                    );
                  }}
                />
              )}
            />
            <Route
              path="/projects/:id"
              render={({ match }) => (
                <GraphQL
                  client={props.client}
                  queries={{
                    project: (
                      client: Client,
                    ): ObservableQuery<{ project: { id: number, title: string } }> =>
                      client.watchQuery({
                        query: gql`query project($id: Int!) { project(id: $id) { id, title } }`,
                        variables: { id: match.params.id },
                      }),
                  }}
                  render={({ project }) => {
                    if (project.loading || project.data.project == null) {
                      return <span>loading...</span>;
                    }

                    return (
                      <div>
                        <h1>{project.data.project.title}</h1>
                        <Route
                          path="/projects/:id/detail"
                          render={() => (
                            <GraphQL
                              client={props.client}
                              queries={{
                                detail: (client: Client): ObservableQuery<{ id: number }> =>
                                  client.watchQuery({
                                    query: gql`{ id }`,
                                  }),
                              }}
                              render={queries => {
                                if (queries.detail.error) {
                                  // redirect
                                  return <Redirect to="/error" />;
                                }

                                if (queries.detail.loading || queries.detail.data.id == null) {
                                  return <span>loading</span>;
                                }

                                return <h2>{queries.detail.data.id}</h2>;
                              }}
                            />
                          )}
                        />
                      </div>
                    );
                  }}
                />
              )}
            />
          </Switch>
        </div>
      );
    }

    const context = {}; // ssr context (redirects, status codes)

    // we assume that client will be created on each request to server
    // so there won't be a cache already populated
    let client = new ApolloClient({
      networkInterface: mockNetworkInterface({
        request: {
          query: gql`{ projects { id, title, __typename } }`,
        },
        result: {
          data: { projects: [{ __typename: 'Project', id: 1, title: 'Test' }] },
        },
      }),
    });

    const homepage = (
      <StaticRouter location="/" context={context}><TestApp client={client} /></StaticRouter>
    );

    await getDataFromTree(homepage);

    let view = mount(homepage);

    expect(view.find('li').length).toBe(1);
    expect(context).toEqual({});

    client = new ApolloClient({
      networkInterface: mockNetworkInterface({
        request: {
          query: gql`query project($id: Int!) { project(id: $id) { id, title, __typename } }`,
          variables: { id: '10' },
        },
        result: {
          data: { project: { __typename: 'Project', id: 10, title: 'Test' } },
        },
      }),
    });
    const projects = (
      <StaticRouter location="/projects/10" context={context}>
        <TestApp client={client} />
      </StaticRouter>
    );

    await getDataFromTree(projects);

    view = mount(projects);

    expect(view.find('h1').length).toBe(1);
    expect(context).toEqual({});

    client = new ApolloClient({
      networkInterface: mockNetworkInterface(
        {
          request: {
            query: gql`query project($id: Int!) { project(id: $id) { id, title, __typename } }`,
            variables: { id: '10' },
          },
          result: {
            data: { project: { __typename: 'Project', id: 10, title: 'Test' } },
          },
        },
        {
          request: {
            query: gql`{ id }`,
          },
          result: {
            data: { id: 1 },
          },
        },
      ),
    });
    const detail = (
      <StaticRouter location="/projects/10/detail" context={context}>
        <TestApp client={client} />
      </StaticRouter>
    );

    await getDataFromTree(detail);

    view = mount(detail);

    expect(view.find('h1').length).toBe(1);
    expect(view.find('h2').length).toBe(1);
    expect(context).toEqual({});

    client = new ApolloClient({
      networkInterface: mockNetworkInterface(
        {
          request: {
            query: gql`query project($id: Int!) { project(id: $id) { id, title, __typename } }`,
            variables: { id: '10' },
          },
          result: {
            data: { project: { __typename: 'Project', id: 10, title: 'Test' } },
          },
        },
        {
          request: {
            query: gql`{ id }`,
          },
          result: {
            errors: [{ message: 'not found' }],
          },
        },
      ),
    });
    const error = (
      <StaticRouter location="/projects/10/detail" context={context}>
        <TestApp client={client} />
      </StaticRouter>
    );

    await getDataFromTree(error);

    view = mount(error);

    expect(context).toEqual({
      action: 'REPLACE',
      location: {
        hash: '',
        pathname: '/error',
        search: '',
      },
      url: '/error',
    });
  });
});
