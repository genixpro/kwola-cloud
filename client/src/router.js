import React, {Component, lazy} from 'react';
import { Route, Redirect } from 'react-router-dom';
import { connect } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import App from './containers/App';
import Auth0 from './helpers/auth0';
import safeImport from "./safe_import";
import SignInPage from './containers/Page/signin';
import Page404 from './containers/Page/404';
import Page505 from './containers/Page/505';
import SelfTestLogin from './containers/Page/selftestlogin';

class RestrictedRoute extends Component
{
    render()
    {
        const isLoggedIn = Auth0.isAuthenticated();

        if(!this.props.isLoggedIn)
        {
            window.localStorage.setItem("returnTo", window.location.path);
        }

        return <Route
            {...this.props}
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
    }
}

class PublicRoute extends Component
{
    render()
    {
        return   <BrowserRouter>
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
                <Route
                    exact
                    path="/app/self_test_login"
                    component={SelfTestLogin}
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
        </BrowserRouter>
    }
}

export default PublicRoute;
