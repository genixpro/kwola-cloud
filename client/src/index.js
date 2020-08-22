import React from 'react';
import ReactDOM from 'react-dom';
import MaterialAdmin from './materialAdmin';
import * as serviceWorker from './serviceWorker';
import axios from "axios";
import mixpanel from 'mixpanel-browser';
import * as Sentry from '@sentry/react';

mixpanel.init(process.env.REACT_APP_MIXPANEL_TOKEN);
axios.defaults.baseURL = process.env.REACT_APP_BACKEND_API_URL;
// axios.defaults.headers.common['Authorization'] = AUTH_TOKEN;
// axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';

if (process.env.REACT_APP_ENABLE_SENTRY_TRACKING === 'true')
{
    Sentry.init({dsn: "https://263fefbc56504ff3b2c5ab6f7c7ba885@o436249.ingest.sentry.io/5396968"});
}

ReactDOM.render(<MaterialAdmin />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
