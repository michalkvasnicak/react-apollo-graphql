# react-apollo-graphql

[![npm](https://img.shields.io/npm/v/react-apollo-graphql.svg)](https://www.npmjs.com/package/react-apollo-graphql)
[![CircleCI](https://circleci.com/gh/michalkvasnicak/react-apollo-graphql/tree/master.svg?style=svg&circle-token=20c4fae1b9bd62446eec2d27c334b154c06efc9a)](https://circleci.com/gh/michalkvasnicak/react-apollo-graphql/tree/master)

![gzip size](http://img.badgesize.io/https://unpkg.com/react-apollo-graphql/dist/react-apollo-graphql.min.js?compression=gzip&label=gzip%20size)
![size](http://img.badgesize.io/https://unpkg.com/react-apollo-graphql/dist/react-apollo-graphql.min.js?label=size)
![module formats: umd, cjs, esm](https://img.shields.io/badge/module%20formats-umd%2C%20cjs%2C%20esm-green.svg)

This is opinionated replacement for `graphql` decorator from `react-apollo` package.

`npm install --save react-apollo-graphql`

It provides:

* simple error handling on the component level
* readable passing of queries' results to your component
* typed props and render props using flow type
* server side render

## Usage

### Using `<ApolloProvider />` from `react-apollo`

```js
import GraphQL from 'react-apollo-graphql';
import ApolloClient from 'apollo-client';
import ApolloProvider from 'react-apollo';

<ApolloProvider client={new ApolloClient(...)}>
  <GraphQL render={(queries, mutations, props) => <div />} />
</ApolloProvider>
```

### Passing `ApolloClient` directly

```js
import GraphQL from 'react-apollo-graphql';
import ApolloClient from 'apollo-client';

<GraphQL client={new ApolloClient(...)} render={(queries, mutations, props) => <div />} />
```

### Queries

In order to use define and use queries, one has to initialize them.

```js
// @flow

import type { QueryInitializerOptions } from 'react-apollo-graphql';
import type { ApolloClient, ObservableQuery } from 'react-apollo-graphql/lib/types';

const queries = {
  // queryA will be resolved only once
  queryA: (
    client: ApolloClient,
    props: Object
  ): ObservableQuery<{ id: number }> => client.watchQuery({
    query: gql`{ id }`,
  }),
  // queryB will be resolved everytime the relevant props change
  queryB: (
    client: ApolloClient,
    props: Object,
    options: QueryInitializerOptions
  ): ObservableQuery<{ name: string }> => {
    // add our function which will be called on every props change
    options.hasVariablesChanged((currentProps, nextProps) => {
      if (currentProps.name === nextProps.name) {
        return false;
      }

      return { name: nextProps.name };
    });

    return client.watchQuery({
      query: gql`query test($name: String!) { id(name: $name)}`,
      variables: { name: props.name },
    });
  }
};

<GraphQL
  queries={queries}
  render={(initializedQueries) => {
    console.log(initializeQueries.queryA.data);
    console.log(initializeQueries.queryA.loading);
    console.log(initializeQueries.queryA.error);
    console.log(initializeQueries.queryA.networkStatus);
    console.log(initializeQueries.queryA.partial);
  }}
/>
```

### Mutations

In order to define and use mutations, one has to provided initializers. Initializers are called on every render so you have current `props` available in the initializers.

```js
// @flow

import type { ApolloClient, QueryResult } from 'react-apollo-graphql/lib/types';

const mutations = {
  registerUser: (
    client: ApolloClient,
    props: Object
  ) => (): Promise<QueryResult<{ registerUser: boolean }>> => client.mutate({
    mutation: gql`mutation registerUser($email: String!) { registerUser(email: $email) }`,
    variables: {
      email: props.email,
    },
  }),
};

<GraphQL
  email="test@test.com"
  mutations={mutations}
  render={(queries, mutations, fetchers, props) => {
    mutations.registerUser(props.email).then(
      (data) => console.log(data.registerUser),
      e => console.error(e),
    );
  }}
/>
```

### Fetchers

In order to use fetchers (queries that run only when user invokes them), user has to first initialize them. Fetchers are initialized with `client` and current `props` on each render and passed to `render()` function.

```js
// @flow

import type { QueryInitializerOptions } from 'react-apollo-graphql';
import type { ApolloClient, QueryResult } from 'react-apollo-graphql/lib/types';

const fetchers = {
  // queryA will be resolved only once
  search: (
    client: ApolloClient,
    props: Object
  ) => (term: string): Promise<QueryResult<Array<{ id: number }>>> => client.query({
    query: gql`query search($term: String!) { search(term: $term) { id } }`,
    variables: { term },
  }),
};

<GraphQL
  fetchers={fetchers}
  text="text"
  render={(queries, mutations, fetchers, props) => {
    fetchers.search(props.text).then(
      (data) => console.log(data.search[0].id);
    );
  }}
/>
```

## Server side render

For server side rendering you need to:

1. import helper as `import { getDataFromTree } from 'react-apollo-graphql';`
2. instantiate your view (`const view = <App />;`)
3. wait for all queries to be resolved `await getDataFromTree(view);`
4. render view `ReactDOM.renderToString(view);`
5. profit (but you have to hydrate your apollo store on the client side 😉 )

### React-Router v4

```js
// example taken from react-router v4 docs
import { createServer } from 'http';
import ApolloClient from 'apollo-client';
import ApolloProvider from 'react-apollo';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { getDataFromTree } from 'react-apollo-graphql';
import App from './App';

createServer(async (req, res) => {
  const context = {};
  const client = new ApolloClient();

  const view = (
    <StaticRouter
      location={req.url}
      context={context}
    >
      <ApolloProvider client={client}>
        <App/>
      </ApolloProvider>
    </StaticRouter>
  );

  await getDataFromTree(view);

  const html = ReactDOMServer.renderToString(view);

  if (context.url) {
    res.writeHead(301, {
      Location: context.url
    });
    res.end();
  } else {
    res.write(`
      <!doctype html>
      <div id="app">${html}</div>
    `);
    res.end();
  }
}).listen(3000);
```

## API

### ApolloClient

* apollo client is provided from `apollo-client` package. See [documentation](http://dev.apollodata.com/core/apollo-client-api.html#apollo-client).

### QueryInitializerOptions

```js
// @flow

export type QueryInitializerOptions = {
  // sets function to determine if there is a relevant change in props to compute new variables
  // returns false if there is no change in props used for variables
  // or returns new variables for query.setVariables()
  hasVariablesChanged: (
    (currentProps: Object, nextProps: Object) => boolean | { [key: string]: any },
  ) => void,
};
```

### `<GraphQL fetchers?={Fetchers} queries?={Queries} mutations?={Mutations} render={RenderFunction} />`

* `Fetchers = { [key: string]: (client: ApolloClient: props: Object) => (...args: any) => Promise<QueryResult<*>>}`
  * `optional` prop, object with fetchers' initialier
  * **each initializer will be initialized with apollo client and props passed to the initializer on each render (on mount and every update)**
  * each initializer has to return `(...args: any) => Promise<QueryResult<*>>` (this means that it has to call the [`client.query() method`](http://dev.apollodata.com/core/apollo-client-api.html#ApolloClient\.query))
* `Queries = { [key: string]: (client: ApolloClient, props: Object, options: QueryInitializerOptions) => ObservableQuery<*> }`
  * `optional` prop, object with query initializers.
  * **each initializer will be initialized with apollo client and props passed to initializer on component mount**
  * each initializer has to return `ObservableQuery` (this means that it has to call the [`client.watchQuery() method`](http://dev.apollodata.com/core/apollo-client-api.html#ApolloClient\.watchQuery))
* `Mutations = { [key: string]: (client: ApolloClient, props: Object) => () => Promise<QueryResult<*>>}`
  * `optional` prop, object with mutation initializers
  * **each initializer will be initialized with apollo client and props passed to the initializer on each render (on mount and every update)**
  * each initializer has to return `() => Promise<QueryResult<*>>` (this means that it has to call the [`client.mutate() method`](http://dev.apollodata.com/core/apollo-client-api.html#ApolloClient\.mutate))
* `RenderFunction = (queries: InitializedQueries, mutations: InitializedMutations, fetchers: InitializedFetchers, props: Object) => React$Element<any>`
  * called on mount and updates
  * `queries` arg: result of each query initializer passed to the `queries` prop on `<GraphQL />` component will be mapped to it's result
  * `mutations` arg: each mutation initializer from the `mutations` prop passed to the `<GraphQL />` component will be called on render and the result will be passed under the same `key` to the `mutations` arg of render function.
  * `fetchers` arg: each fetcher initializer from the `fetchers` prop passed to the `<GraphQL />` component will be called on render and the returned function will be passed under the same `key` to the `fetchers` arg of render function.
  * `props` arg: current props passed to `<GraphQL />` component
