import React, { Component, lazy, Suspense } from 'react';
import Route from '../../components/utility/customRoute';
import Loader from '../../components/utility/Loader/';
import safeImport from "../../safe_import";
import Dashboard from '../Dashboard';
import NewApplicationWizard from '../NewApplicationWizard';
import JIRARedirect from '../JIRARedirect';
import NewTestingRun from '../NewTestingRun';
import ViewMutedErrors from '../ViewMutedErrors';
import ConfigureNotifications from '../ConfigureNotifications';
import ConfigureIntegrations from '../ConfigureIntegrations';
import ConfigureWebhooks from '../ConfigureWebhooks';
import ListRecurringTestingTriggers from '../ListRecurringTestingTriggers';
import NewRecurringTestingTrigger from '../NewRecurringTestingTrigger';
import ConfigureTestingRunOptions from '../ConfigureTestingRunOptions';
import ChangeSubscription from '../ChangeSubscription';
import ListApplications from '../ListApplications';
import ViewApplication from '../ViewApplication';
import ViewTestingSequence from '../ViewTestingSequence';
import ViewTrainingSequence from '../ViewTrainingSequence';
import ViewTrainingStep from '../ViewTrainingStep';
import ViewExecutionSession from '../ViewExecutionSession';
import ViewExecutionTrace from '../ViewExecutionTrace';
import ViewTestingRunConfiguration from '../ViewTestingRunConfiguration';
import ViewTestingRun from '../ViewTestingRun';
import ViewBug from '../ViewBug';
import ViewRecurringTestingTrigger from '../ViewRecurringTestingTrigger';
import ViewRecurringTestingTriggerConfiguration from '../ViewRecurringTestingTriggerConfiguration';

const routes = [
  {
    path: '',
    component: Dashboard,
  },
  {
    path: 'new-application',
    component: NewApplicationWizard,
  },
  {
    path: 'new-application/:page',
    component: NewApplicationWizard,
  },
  {
    path: 'jira',
    component: JIRARedirect,
  },
  {
    path: 'applications/:id/new_testing_run',
    component: NewTestingRun,
  },
  {
    path: 'applications/:id/muted_errors',
    component: ViewMutedErrors,
  },
  {
    path: 'applications/:id/notifications',
    component: ConfigureNotifications,
  },
  {
    path: 'applications/:id/integrations',
    component: ConfigureIntegrations,
  },
  {
    path: 'applications/:id/webhooks',
    component: ConfigureWebhooks,
  },
  {
    path: 'applications/:id/triggers',
    component: ListRecurringTestingTriggers,
  },
  {
    path: 'applications/:id/new_trigger',
    component: NewRecurringTestingTrigger,
  },
  {
    path: 'applications/:id/testing_run_options',
    component: ConfigureTestingRunOptions,
  },
  {
    path: 'applications/:id/subscription',
    component: ChangeSubscription,
  },
  {
    path: 'applications',
    component: ListApplications,
  },
  {
    path: 'applications/:id',
    component: ViewApplication,
  },
  {
    path: 'testing_sequences/:id',
    component: ViewTestingSequence,
  },
  {
    path: 'training_sequences/:id',
    component: ViewTrainingSequence,
  },
  {
    path: 'training_steps/:id',
    component: ViewTrainingStep,
  },
  {
    path: 'execution_sessions/:id',
    component: ViewExecutionSession,
  },
  {
    path: 'execution_sessions/:id/execution_traces/:traceId',
    component: ViewExecutionTrace,
  },
  {
    path: 'testing_runs/:id/configuration',
    component: ViewTestingRunConfiguration,
  },
  {
    path: 'testing_runs/:id',
    component: ViewTestingRun,
  },
  {
    path: 'bugs/:id',
    component: ViewBug,
  },
  {
    path: 'triggers/:id',
    component: ViewRecurringTestingTrigger,
  },
  {
    path: 'triggers/:id/configuration',
    component: ViewRecurringTestingTriggerConfiguration,
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
