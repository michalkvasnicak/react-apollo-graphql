# react-apollo-graphql

This is opinionated replacement for `graphql` decorator from `react-apollo` package.

It provides:

* simple error handling on the component level
* readable passing of queries' results to your component
* typed props and render props using flow type

**This package doesn't support server side render yet**.

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

const queries = {
  queryA: (client, props) => client.watchQuery({
    query: gql`{ id }`,
  }),
};

<GraphQL
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

const mutations = {
  registerUser: (client, props) => () => client.mutate({
    mutation: gql`mutation registerUser($email: String!) { registerUser(email: $email) }`,
    variables: {
      email: props.email,
    },
  }),
};

<GraphQL
  email="test@test.com"
  render={(queries, mutations) => {
    mutations.registerUser().then(
      (data) => console.log(data.registerUser),
      e => console.error(e),
    );
  }}
/>
```
