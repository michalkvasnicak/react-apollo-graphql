// @flow

import GraphQL from './';
import { Children } from 'react';

export async function getDataFromTree(
  element: ?React$Element<any>,
  context?: Object = {},
): Promise<any> {
  // if null element, do nothing
  if (element == null) {
    return;
  }

  // get type of element
  const Component = element.type;

  // a functional stateless component or a class
  if (typeof Component === 'function') {
    // create props
    const props = { ...Component.defaultProps, ...element.props };
    let childContext = context;
    let child;

    if (Component.prototype && Component.prototype.isReactComponent) {
      const instance = new Component(props, context);
      // In case the user doesn't pass these to super in the constructor
      instance.props = instance.props || props;
      instance.context = instance.context || context;

      // Override setState to just change the state, not queue up an update.
      //   (we can't do the default React thing as we aren't mounted "properly"
      //   however, we don't need to re-render as well only support setState in
      //   componentWillMount, which happens *before* render).
      instance.setState = (state: any, cb?: Function) => {
        if (typeof state === 'function') {
          instance.state = { ...instance.state, ...state(instance.state) };
        } else {
          instance.state = { ...instance.state, ...state };
        }

        if (typeof cb === 'function') {
          cb();
        }
      };

      if (instance.componentWillMount) {
        instance.componentWillMount();
      }

      if (instance.getChildContext) {
        childContext = { ...context, ...instance.getChildContext() };
      }

      // is this GraphQL component?
      if (element.type === GraphQL) {
        // wait for all queries to resolve
        await Promise.all(
          instance.getObservers().map(
            observer =>
              new Promise((resolve, reject) => {
                try {
                  observer.result().then(() => resolve(), () => resolve());
                } catch (e) {
                  reject(e);
                }
              }),
          ),
        );
      }

      // now call render, we have everything resolved and updated so it should return a child
      // then call this function on child
      child = instance.render();

      if (element.type === GraphQL) {
        // unmount GraphQL component so we can clean up subscriptipns
        instance.componentWillUnmount();
      }
    } else {
      // just a stateless functional
      child = Component(props, context);
    }

    await getDataFromTree(child, childContext);
  } else {
    // a basic string or dom element, just get children
    if (element.props && element.props.children) {
      const promises = [];

      Children.forEach(element.props.children, (child: any) => {
        if (child) {
          promises.push(getDataFromTree(child, context));
        }
      });

      await Promise.all(promises);
    }
  }
}
