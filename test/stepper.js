// @flow

import React from 'react';

export default function createStepper(
  steps: Array<Function>,
): { promise: Promise<any>, renderer: Function } {
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
