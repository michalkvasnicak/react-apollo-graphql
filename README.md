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

import type { ApolloClient, ObservableQuery } from 'react-apollo-graphql/lib/types';

const queries = {
  queryA: (
    client: ApolloClient,
    props: Object
  ): ObservableQuery<{ id: number }> => client.watchQuery({
    query: gql`{ id }`,
  }),
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
  render={(queries, mutations, props) => {
    mutations.registerUser(props.email).then(
      (data) => console.log(data.registerUser),
      e => console.error(e),
    );
  }}
/>
```

## API

### ApolloClient

* apollo client is provided from `apollo-client` package. See [documentation](http://dev.apollodata.com/core/apollo-client-api.html#apollo-client).

### `<GraphQL queries?={Queries} mutations?={Mutations} render={RenderFunction} />`

* `Queries = { [key: string]: (client: ApolloClient, props: Object) => ObservableQuery<*> }`
  * `optional` prop, object with query initializers.
  * **each initializer will be initialized with apollo client and props passed to initializer on component mount**
  * each initializer has to return `ObservableQuery` (this means that it has to call the [`client.watchQuery() method`](http://dev.apollodata.com/core/apollo-client-api.html#ApolloClient\.watchQuery))
* `Mutations = { [key: string]: (client: ApolloClient, props: Object) => () => Promise<QueryResult<*>>}`
  * `optional` prop, object with mutation initializers
  * **each initializer will be initialized with apollo client and props passed to the initializer on each render (on mount and every update)**
  * each initializer has to return `() => Promise<QueryResult<*>>` (this means that it has to call the [`client.mutate() method`](http://dev.apollodata.com/core/apollo-client-api.html#ApolloClient\.mutate))
* `RenderFunction = (queries: InitializedQueries, mutations: InitializedMutations, props) => React$Element<any>`
  * called on mount and updates
  * `queries` arg: result of each query initializer passed to the `queries` prop on `<GraphQL />` component will be mapped to it's result
  * `mutations` arg: each mutation initializer from the `mutations` prop passed to the `<GraphQL />` component will be called on render and the result will be passed under the same `key` to the `mutations` arg of render function.
  * `props` arg: current props passed to `<GraphQL />` component
