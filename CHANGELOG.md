## 0.8.0 [29.05.2017]

New featues:

* added flow helper `ResultTypeToResultObject` to convert query result data type to render function query result type.

## 0.7.0 [27.05.2017]

New features:

* added `observer` to each query result so you can manipulate them using `refetch(), fetchMore(), etc...`

## 0.6.1 [26.05.2017]

Fixed bugs:

* added missing flow annotation for `client.query()` method

## 0.6.0 [26.05.2017]

Breaking changes:

* added support for fetchers, `render` function now accepts as the third argument initialized fetchers and props are fourth argument in order

## 0.5.2 [26.05.2017]

Fixed bugs:

* Fixed passing `null` elements to `getDataFromTree` on the server side

## 0.5.1 [25.05.2017]

Fixed bugs:

* fixed flow annotation for `client.mutate.refetchQueries`

## 0.5.0 [25.05.2017]

New features:

* added support for refetching queries if the relevant props changed

## 0.4.0 [25.05.2017]

New features:

* better flow types
* added support for query polling

## 0.3.3 [24.05.2017]

Configuration:

* do not compile flow files using babel

## 0.3.2 [24.05.2017]

Fixed bugs:

* fixed passing client to mutations' initializer

## 0.3.1 [24.05.2017]

Fixed bugs:

* fixed `main`, `jsnext:main` and `module` paths in `package.json`

## 0.3.0 [24.05.2017]

New features:

* export `getDataFromTree` from `index.js`

Configuration:

* new build configuration, now supports `commonjs`, `umd` and `es` modules

## 0.2.0 [23.05.2017]

New features:

* added basic server side render

## 0.1.1 [23.05.2017]

* Fixed return type flow type for the `render` function

## 0.1.0 [20.05.2017]

**Note: this is the first release currently in development so API can change in the future**
