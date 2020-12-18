import React from 'react';
import ReactDOM from 'react-dom';
import MaterialAdmin from './materialAdmin';
import * as serviceWorker from './serviceWorker';
import axios from "axios";
import mixpanel from 'mixpanel-browser';
import * as Sentry from '@sentry/react';
import Auth0 from './helpers/auth0';

mixpanel.init(process.env.REACT_APP_MIXPANEL_TOKEN);
axios.defaults.baseURL = process.env.REACT_APP_BACKEND_API_URL;
// axios.defaults.headers.common['Authorization'] = AUTH_TOKEN;
// axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';
axios.interceptors.response.use(function (response) {
    // Do something with response data
    return response;
}, function (error)
{
    if (error.response && error.response.status === 401)
    {
        Auth0.logout();
        return (Promise.reject(error));
    }

    if (process.env.REACT_APP_DEBUG === "true")
    {
        alert(error.toString());
    }
    // Do something with response error
    return (Promise.reject(error));
});

if (process.env.REACT_APP_ENABLE_SENTRY_TRACKING === 'true')
{
    Sentry.init({dsn: "https://263fefbc56504ff3b2c5ab6f7c7ba885@o436249.ingest.sentry.io/5396968"});
}

document.title = process.env.REACT_APP_ENVIRONMENT_TITLE;

ReactDOM.render(<MaterialAdmin />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
