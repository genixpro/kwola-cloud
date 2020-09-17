import React, { Component, lazy, Suspense } from 'react';
import Route from '../../components/utility/customRoute';
import Loader from '../../components/utility/Loader/';

function safeImport(moduleName)
{
  try
  {
    return import(moduleName);
  }
  catch(err)
  {
    // If there is an error lazy loading a specific page, that may mean that the underlying frontend code was updated. So
    // just force a full reload of the page.
    location.reload(true);
  }
}

const routes = [
  {
    path: '',
    component: lazy(() => safeImport('../Dashboard')),
  },
  {
    path: 'new-application',
    component: lazy(() => safeImport('../NewApplication')),
  },
  {
    path: 'jira',
    component: lazy(() => safeImport('../JIRARedirect')),
  },
  {
    path: 'applications/:id/new_testing_run',
    component: lazy(() => safeImport('../NewTestingRun')),
  },
  {
    path: 'applications/:id/muted_errors',
    component: lazy(() => safeImport('../ViewMutedErrors')),
  },
  {
    path: 'applications/:id/notifications',
    component: lazy(() => safeImport('../ConfigureNotifications')),
  },
  {
    path: 'applications/:id/integrations',
    component: lazy(() => safeImport('../ConfigureIntegrations')),
  },
  {
    path: 'applications/:id/webhooks',
    component: lazy(() => safeImport('../ConfigureWebhooks')),
  },
  {
    path: 'applications/:id/triggers',
    component: lazy(() => safeImport('../ListRecurringTestingTriggers')),
  },
  {
    path: 'applications/:id/new_trigger',
    component: lazy(() => safeImport('../NewRecurringTestingTrigger')),
  },
  {
    path: 'applications',
    component: lazy(() => safeImport('../ListApplications')),
  },
  {
    path: 'applications/:id',
    component: lazy(() => safeImport('../ViewApplication')),
  },
  {
    path: 'testing_sequences/:id',
    component: lazy(() => safeImport('../ViewTestingSequence')),
  },
  {
    path: 'training_sequences/:id',
    component: lazy(() => safeImport('../ViewTrainingSequence')),
  },
  {
    path: 'training_steps/:id',
    component: lazy(() => safeImport('../ViewTrainingStep')),
  },
  {
    path: 'execution_sessions/:id',
    component: lazy(() => safeImport('../ViewExecutionSession')),
  },
  {
    path: 'execution_sessions/:id/execution_traces/:traceId',
    component: lazy(() => safeImport('../ViewExecutionTrace')),
  },
  {
    path: 'testing_runs/:id/configuration',
    component: lazy(() => safeImport('../ViewTestingRunConfiguration')),
  },
  {
    path: 'testing_runs/:id',
    component: lazy(() => safeImport('../ViewTestingRun')),
  },
  {
    path: 'bugs/:id',
    component: lazy(() => safeImport('../ViewBug')),
  },
  {
    path: 'triggers/:id',
    component: lazy(() => safeImport('../ViewRecurringTestingTrigger')),
  },
  {
    path: 'triggers/:id/configuration',
    component: lazy(() => safeImport('../ViewRecurringTestingTriggerConfiguration')),
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
