import React, { Component, lazy, Suspense } from 'react';
import Route from '../../components/utility/customRoute';
import Loader from '../../components/utility/Loader/';

const routes = [
  {
    path: '',
    component: lazy(() => import('../Dashboard')),
  },
  {
    path: 'new-application',
    component: lazy(() => import('../NewApplication')),
  },
  {
    path: 'applications/:id/new_testing_run',
    component: lazy(() => import('../NewTestingRun')),
  },
  {
    path: 'applications',
    component: lazy(() => import('../ListApplications')),
  },
  {
    path: 'applications/:id',
    component: lazy(() => import('../ViewApplication')),
  },
  {
    path: 'testing_sequences/:id',
    component: lazy(() => import('../ViewTestingSequence')),
  },
  {
    path: 'training_sequences/:id',
    component: lazy(() => import('../ViewTrainingSequence')),
  },
  {
    path: 'training_steps/:id',
    component: lazy(() => import('../ViewTrainingStep')),
  },
  {
    path: 'execution_sessions/:id',
    component: lazy(() => import('../ViewExecutionSession')),
  },
  {
    path: 'execution_traces/:id',
    component: lazy(() => import('../ViewExecutionTrace')),
  },
  {
    path: 'testing_runs/:id',
    component: lazy(() => import('../ViewTestingRun')),
  },
  {
    path: 'bugs/:id',
    component: lazy(() => import('../ViewBug')),
  }
];

class AppRouter extends Component {
  componentDidMount() {
    this.lastUrl = null;
  }

  render() {
    if (window.location.href !== this.lastUrl)
    {
      if (process.env.REACT_APP_ENABLE_ANALYTICS === 'true')
      {
        var _hsq = window._hsq = window._hsq || [];
        _hsq.push(['setPath', window.location.pathname]);
        _hsq.push(['trackPageView']);

        window.ga('set', 'page', window.location.href);
        window.ga('send', 'pageview');
      }

      this.lastUrl = window.location.href;
    }

    const { url, style } = this.props;
    return (
      <Suspense fallback={<Loader />}>
        <div style={style}>
          {routes.map(singleRoute => {
            const { path, exact, ...otherProps } = singleRoute;
            return (
              <Route
                exact={exact === false ? false : true}
                key={singleRoute.path}
                path={`${url}/${singleRoute.path}`}
                {...otherProps}
              />
            );
          })}
        </div>
      </Suspense>
    );
  }
}

export default AppRouter;
