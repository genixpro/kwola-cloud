import React from 'react';
import ReactDOM from 'react-dom';
import MaterialAdmin from './materialAdmin';
import * as serviceWorker from './serviceWorker';
import axios from "axios";

axios.defaults.baseURL = process.env.REACT_APP_BACKEND_API_URL;
// axios.defaults.headers.common['Authorization'] = AUTH_TOKEN;
// axios.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';


ReactDOM.render(<MaterialAdmin />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: http://bit.ly/CRA-PWA
serviceWorker.unregister();
