import auth0 from 'auth0-js';
import history from './history';
import { Auth0Config } from '../../settings';
import { notification } from '../../components';
import axios from "axios";
import jwt from "jsonwebtoken";
import mixpanel from 'mixpanel-browser';

class Auth0Helper {
  isValid = Auth0Config.clientID && Auth0Config.domain;

  constructor() {
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.handleAuthentication = this.handleAuthentication.bind(this);
    this.isAuthenticated = this.isAuthenticated.bind(this);
    this.updateAxiosToken();
    this.updateMixpanelIdentity();
    this.updateHubspotIdentity();
    this.updateGoogleAnalyticsIdentity();
    this.updateAcquisitionUrl();

    this.webAuth = new auth0.WebAuth(Auth0Config);
  }
  login(handleLogin)
  {
    if (window.location.hash)
    {
      this.webAuth.parseHash({ hash: window.location.hash }, (err, authResult) => {
        if (err) {
          return console.log(err);
        }

        this.setSession(authResult);

        handleLogin();
      });
    }
    else
    {
      let state = "";
      if (localStorage.getItem("acquisitionUrl"))
      {
        const data = {"acquisitionUrl": localStorage.getItem("acquisitionUrl")};
        state = JSON.stringify(data);
      }

      this.webAuth.authorize({state: state});
    }
  }
  handleAuthentication(props)
  {
    // localStorage.setItem('id_token', 'secret token');
    history.replace('/dashboard');
  }

  updateAxiosToken()
  {
    if (this.isAuthenticated())
    {
      axios.defaults.headers.common['WWW-Authenticate'] = localStorage.getItem('id_token');
    }
    else
    {
      axios.defaults.headers.common['WWW-Authenticate'] = '';
    }
  }

  getUserInfo()
  {
    return jwt.decode(localStorage.getItem('id_token'));
  }

  getQueryParameterToken()
  {
    return localStorage.getItem('id_token');
  }

  isUserAllowedFreeRuns()
  {
    return this.getUserInfo()['https://kwola.io/freeRuns'];
  }

  setSession(authResult) {
    // Set the time that the access token will expire at
    let expiresAt = JSON.stringify(
      authResult.expiresIn * 1000 + new Date().getTime()
    );

    localStorage.setItem('access_token', authResult.accessToken);
    localStorage.setItem('id_token', authResult.idToken);
    localStorage.setItem('expires_at', expiresAt);
    this.updateAxiosToken();
    this.updateMixpanelIdentity();
    this.updateHubspotIdentity();
    this.updateGoogleAnalyticsIdentity();
  }

  logout() {
    // Clear access token and ID token from local storage
    localStorage.removeItem('access_token');
    localStorage.removeItem('id_token');
    localStorage.removeItem('expires_at');

    history.replace('/');
    window.location.reload();
  }

  isAuthenticated() {
    // Check whether the current time is past the
    // access token's expiry time
    return (
      new Date().getTime() < JSON.parse(localStorage.getItem('expires_at'))
    );
  }

  updateMixpanelIdentity()
  {
    const userData = this.getUserInfo();
    if (userData)
    {
      mixpanel.identify(userData.sub);
    }
  }

  updateHubspotIdentity()
  {
    const userData = this.getUserInfo();
    if (userData)
    {
      var _hsq = window._hsq = window._hsq || [];
      _hsq.push(['identify', {email: userData.email}]);
    }
  }

  updateGoogleAnalyticsIdentity()
  {
    const userData = this.getUserInfo();
    if (userData)
    {
      window.ga('set', 'userId', userData.email);
    }
  }

  updateAcquisitionUrl()
  {
    const urlParams = new URLSearchParams(window.location.search);
    const acquisitionDataEncoded = urlParams.get('a');
    const referrer = document.referrer;
    const referrerDomain = referrer.toString().replace('http://', '').replace('https://', '').split(/[/?#]/)[0];


    if(!localStorage.getItem("acquisitionUrl"))
    {
      if (acquisitionDataEncoded) {
        const acquisitionUrl = atob(acquisitionDataEncoded);
        localStorage.setItem("acquisitionUrl", acquisitionUrl);
      } else if (referrer && referrerDomain && !referrerDomain.endsWith("kwola.io")) {
        localStorage.setItem("acquisitionUrl", referrer);
      }
    }

    if (acquisitionDataEncoded)
    {
      // Hide the acquisition data quickly.
      // window.history.replaceState({}, document.title, window.location.href.split("?")[0]);
    }
  }

}
export default new Auth0Helper();
