import React, { lazy } from 'react';
import { Route, Redirect } from 'react-router-dom';
import { connect } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import App from './containers/App';
import Auth0 from './helpers/auth0';

const RestrictedRoute = ({ component: Component, isLoggedIn, ...rest }) => (
  <Route
    {...rest}
    render={props =>
      isLoggedIn ? (
        <Component {...props} />
      ) : (
        <Redirect
          to={{
            pathname: '/app/signin',
            state: { from: props.location },
          }}
        />
      )
    }
  />
);

const PublicRoutes = ({ history, isLoggedIn }) => (
  <BrowserRouter>
    <>
      <Route
        exact
        path="/"
        component={lazy(() => import('./containers/Page/signin'))}
      />
      <Route
          exact
          path="/app/"
          component={lazy(() => import('./containers/Page/signin'))}
      />
      <Route
        exact
        path="/app/signin"
        component={lazy(() => import('./containers/Page/signin'))}
      />
      <Route
        exact
        path="/app/login"
        component={lazy(() => import('./containers/Page/signin'))}
      />
      <Route
        path="/app/auth0loginCallback"
        render={props => {
          Auth0.handleAuthentication(props);
        }}
      />
      <RestrictedRoute
        path="/app/dashboard"
        component={App}
        isLoggedIn={isLoggedIn}
      />
      <Route
        exact
        path="/app/404"
        component={lazy(() => import('./containers/Page/404'))}
      />
      <Route
        exact
        path="/app/505"
        component={lazy(() => import('./containers/Page/505'))}
      />
      <Route
        exact
        path="/app/signup"
        component={lazy(() => import('./containers/Page/signup'))}
      />
      <Route
        exact
        path="/app/forgot-password"
        component={lazy(() => import('./containers/Page/forgetpassword'))}
      />
      <Route
        exact
        path="/app/reset-password"
        component={lazy(() => import('./containers/Page/resetpassword'))}
      />
      <Route
        exact
        path="/app/confirm-email"
        component={lazy(() => import('./containers/Page/confirmemail'))}
      />
    </>
  </BrowserRouter>
);

function mapStateToProps(state) {
  return {
    isLoggedIn: Auth0.isAuthenticated(),
  };
}
export default connect(mapStateToProps)(PublicRoutes);
