import React, { lazy } from 'react';
import { Route, Redirect } from 'react-router-dom';
import { connect } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import App from './containers/App';
import Auth0 from './helpers/auth0';
import safeImport from "./safe_import";
import SignInPage from './containers/Page/signin';
import Page404 from './containers/Page/404';
import Page505 from './containers/Page/505';


const RestrictedRoute = ({ component: Component, isLoggedIn, ...rest }) => {
    if(!isLoggedIn)
    {
        window.localStorage.setItem("returnTo", window.location.path);
    }

    return <Route
        {...rest}
        render={props =>
            isLoggedIn ? (
                <Component {...props} />
            ) : (
                <Redirect
                    to={{
                        pathname: '/app/signin',
                        state: {from: props.location},
                    }}
                />
            )
        }
    />
};

const PublicRoutes = ({ history, isLoggedIn }) => (
  <BrowserRouter>
    <>
      <Route
        exact
        path="/"
        component={SignInPage}
      />
      <Route
          exact
          path="/app/"
          component={SignInPage}
      />
      <Route
        exact
        path="/app/signin"
        component={SignInPage}
      />
      <Route
        exact
        path="/app/login"
        component={SignInPage}
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
        component={Page404}
      />
      <Route
        exact
        path="/app/505"
        component={Page505}
      />
      {/*<Route*/}
      {/*  exact*/}
      {/*  path="/app/signup"*/}
      {/*  component={lazy(safeImport(() => import('./containers/Page/signup')))}*/}
      {/*/>*/}
      {/*<Route*/}
      {/*  exact*/}
      {/*  path="/app/forgot-password"*/}
      {/*  component={lazy(safeImport(() => import('./containers/Page/forgetpassword')))}*/}
      {/*/>*/}
      {/*<Route*/}
      {/*  exact*/}
      {/*  path="/app/reset-password"*/}
      {/*  component={lazy(safeImport(() => import('./containers/Page/resetpassword')))}*/}
      {/*/>*/}
      {/*<Route*/}
      {/*  exact*/}
      {/*  path="/app/confirm-email"*/}
      {/*  component={lazy(safeImport(() => import('./containers/Page/confirmemail')))}*/}
      {/*/>*/}
    </>
  </BrowserRouter>
);

function mapStateToProps(state) {
  return {
    isLoggedIn: Auth0.isAuthenticated(),
  };
}
export default connect(mapStateToProps)(PublicRoutes);
