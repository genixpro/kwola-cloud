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

        this.setSession(authResult)

        handleLogin();
      });
    }
    else
    {
      let state = "";
      if (localStorage.getItem("acquisitionUrl"))
      {
        const data = {
          "awarenessUrl": localStorage.getItem("awarenessUrl"),
          "awarenessUserAgent": localStorage.getItem("awarenessUserAgent"),
          "awarenessCity": localStorage.getItem("awarenessCity"),
          "awarenessCountry": localStorage.getItem("awarenessCountry"),
          "awarenessIp": localStorage.getItem("awarenessIp"),
          "awarenessIpDomain": localStorage.getItem("awarenessIpDomain"),
          "awarenessTime": localStorage.getItem("awarenessTime"),
          "acquisitionUrl": localStorage.getItem("acquisitionUrl"),
          "acquisitionUserAgent": localStorage.getItem("acquisitionUserAgent"),
          "acquisitionCity": localStorage.getItem("acquisitionCity"),
          "acquisitionCountry": localStorage.getItem("acquisitionCountry"),
          "acquisitionIp": localStorage.getItem("acquisitionIp"),
          "acquisitionIpDomain": localStorage.getItem("acquisitionIpDomain"),
          "acquisitionTime": localStorage.getItem("acquisitionTime"),
        };
        state = encodeURIComponent(btoa(JSON.stringify(data)));
      }

      this.webAuth.authorize({state: state});
    }
  }
  handleAuthentication(props)
  {
    // localStorage.setItem('id_token', 'secret token');
    history.replace('/app/dashboard');
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

    this.webAuth.logout({returnTo:process.env.REACT_APP_AUTH0_REDIRECT_URL});
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
    const acquisitionUrlEncoded = urlParams.get('a');
    const awarenessUrlEncoded = urlParams.get('b');
    const awarenessUserAgentEncoded = urlParams.get('c');
    const acquisitionUserAgentEncoded = urlParams.get('d');
    const awarenessIpEncoded = urlParams.get('e');
    const acquisitionIpEncoded = urlParams.get('f');
    const awarenessTimeEncoded = urlParams.get('g');
    const acquisitionTimeEncoded = urlParams.get('h');

    const referrer = document.referrer;
    const referrerDomain = referrer.toString().replace('http://', '').replace('https://', '').split(/[/?#]/)[0];

    if(!localStorage.getItem("awarenessUrl"))
    {
      if (awarenessUrlEncoded) {
        let awarenessUrl = "";
        let awarenessUserAgent = "";
        let awarenessIp = "";
        let awarenessTime = "";
        try {awarenessUrl = atob(awarenessUrlEncoded);} catch (e) {}
        try {awarenessUserAgent = atob(awarenessUserAgentEncoded);} catch (e) {}
        try {awarenessIp = atob(awarenessIpEncoded);} catch (e) {}
        try {awarenessTime = atob(awarenessTimeEncoded);} catch (e) {}
        localStorage.setItem("awarenessUrl", awarenessUrl);
        localStorage.setItem("awarenessUserAgent", awarenessUserAgent);
        localStorage.setItem("awarenessIp", awarenessIp);
        localStorage.setItem("awarenessTime", awarenessTime);

      } else if (referrer && referrerDomain && !referrerDomain.endsWith("kwola.io")) {
        localStorage.setItem("awarenessUrl", referrer);
        localStorage.setItem("awarenessUserAgent", navigator.userAgent);
        localStorage.setItem("awarenessTime", new Date().toString());

        const request1 = new XMLHttpRequest();
        request1.open('GET', 'https://api.ipdata.co/?api-key=585f0bbe1a7caf5e73d7391c120f7d025b1deb0f504df719c6893e40');
        request1.setRequestHeader('Accept', 'application/json');

        request1.onreadystatechange = function () {
          if (this.readyState === 4) {
            const ipData = JSON.parse(this.responseText);
            localStorage.setItem("awarenessIp", ipData.ip);
          }
        }
        request1.send();
      }
    }

    if (acquisitionUrlEncoded) {
      let acquisitionUrl = "";
      let acquisitionUserAgent = "";
      let acquisitionIp = "";
      let acquisitionTime = "";
      try {acquisitionUrl = atob(acquisitionUrlEncoded);} catch (e) {}
      try {acquisitionUserAgent = atob(acquisitionUserAgentEncoded);} catch (e) {}
      try {acquisitionIp = atob(acquisitionIpEncoded);} catch (e) {}
      try {acquisitionTime = atob(acquisitionTimeEncoded);} catch (e) {}
      localStorage.setItem("acquisitionUrl", acquisitionUrl);
      localStorage.setItem("acquisitionUserAgent", acquisitionUserAgent);
      localStorage.setItem("acquisitionIp", acquisitionIp);
      localStorage.setItem("acquisitionTime", acquisitionTime);

    } else if (referrer && referrerDomain && referrerDomain.toString().indexOf("kwola.io") === -1) {

      localStorage.setItem("acquisitionUrl", referrer);
      localStorage.setItem("acquisitionUserAgent", navigator.userAgent);
      localStorage.setItem("acquisitionTime", new Date().toString());

      const request2 = new XMLHttpRequest();
      request2.open('GET', 'https://api.ipdata.co/?api-key=585f0bbe1a7caf5e73d7391c120f7d025b1deb0f504df719c6893e40');
      request2.setRequestHeader('Accept', 'application/json');

      request2.onreadystatechange = function () {
        if (this.readyState === 4) {
          const ipData = JSON.parse(this.responseText);
          localStorage.setItem("acquisitionIp", ipData.ip);
        }
      }
      request2.send();
    }

    if (acquisitionUrlEncoded || awarenessUrlEncoded)
    {
      // Hide the acquisition data quickly.
      window.history.replaceState({}, document.title, window.location.href.split("?")[0]);
    }
  }
}
export default new Auth0Helper();
