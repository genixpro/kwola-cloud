import React, { Component, lazy, Suspense } from 'react';
import Route from '../../components/utility/customRoute';
import Loader from '../../components/utility/Loader/';

function safeImport(importFunc)
{
  return () =>
  {
    try
    {
      return importFunc();
    }
    catch(err)
    {
      // If there is an error lazy loading a specific page, that may mean that the underlying frontend code was updated. So
      // just force a full reload of the page.
      location.reload(true);
    }
  };
}

const routes = [
  {
    path: '',
    component: lazy(safeImport(() => import('../Dashboard'))),
  },
  {
    path: 'new-application',
    component: lazy(safeImport(() => import('../NewApplication'))),
  },
  {
    path: 'jira',
    component: lazy(safeImport(() => import('../JIRARedirect'))),
  },
  {
    path: 'applications/:id/new_testing_run',
    component: lazy(safeImport(() => import('../NewTestingRun'))),
  },
  {
    path: 'applications/:id/muted_errors',
    component: lazy(safeImport(() => import('../ViewMutedErrors'))),
  },
  {
    path: 'applications/:id/notifications',
    component: lazy(safeImport(() => import('../ConfigureNotifications'))),
  },
  {
    path: 'applications/:id/integrations',
    component: lazy(safeImport(() => import('../ConfigureIntegrations'))),
  },
  {
    path: 'applications/:id/webhooks',
    component: lazy(safeImport(() => import('../ConfigureWebhooks'))),
  },
  {
    path: 'applications/:id/triggers',
    component: lazy(safeImport(() => import('../ListRecurringTestingTriggers'))),
  },
  {
    path: 'applications/:id/new_trigger',
    component: lazy(safeImport(() => import('../NewRecurringTestingTrigger'))),
  },
  {
    path: 'applications',
    component: lazy(safeImport(() => import('../ListApplications'))),
  },
  {
    path: 'applications/:id',
    component: lazy(safeImport(() => import('../ViewApplication'))),
  },
  {
    path: 'testing_sequences/:id',
    component: lazy(safeImport(() => import('../ViewTestingSequence'))),
  },
  {
    path: 'training_sequences/:id',
    component: lazy(safeImport(() => import('../ViewTrainingSequence'))),
  },
  {
    path: 'training_steps/:id',
    component: lazy(safeImport(() => import('../ViewTrainingStep'))),
  },
  {
    path: 'execution_sessions/:id',
    component: lazy(safeImport(() => import('../ViewExecutionSession'))),
  },
  {
    path: 'execution_sessions/:id/execution_traces/:traceId',
    component: lazy(safeImport(() => import('../ViewExecutionTrace'))),
  },
  {
    path: 'testing_runs/:id/configuration',
    component: lazy(safeImport(() => import('../ViewTestingRunConfiguration'))),
  },
  {
    path: 'testing_runs/:id',
    component: lazy(safeImport(() => import('../ViewTestingRun'))),
  },
  {
    path: 'bugs/:id',
    component: lazy(safeImport(() => import('../ViewBug'))),
  },
  {
    path: 'triggers/:id',
    component: lazy(safeImport(() => import('../ViewRecurringTestingTrigger'))),
  },
  {
    path: 'triggers/:id/configuration',
    component: lazy(safeImport(() => import('../ViewRecurringTestingTriggerConfiguration'))),
  }
];

class AppRouter extends Component {
  componentDidMount() {
    this.lastUrl = null;
  }

  render()
  {
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
