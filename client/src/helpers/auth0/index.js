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
          "awarenessDomain": localStorage.getItem("awarenessDomain"),
          "awarenessTime": localStorage.getItem("awarenessTime"),
          "acquisitionUrl": localStorage.getItem("acquisitionUrl"),
          "acquisitionUserAgent": localStorage.getItem("acquisitionUserAgent"),
          "acquisitionCity": localStorage.getItem("acquisitionCity"),
          "acquisitionCountry": localStorage.getItem("acquisitionCountry"),
          "acquisitionIp": localStorage.getItem("acquisitionIp"),
          "acquisitionDomain": localStorage.getItem("acquisitionDomain"),
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
    const awarenessCityEncoded = urlParams.get('e');
    const awarenessCountryEncoded = urlParams.get('f');
    const awarenessIpEncoded = urlParams.get('g');
    const awarenessDomainEncoded = urlParams.get('h');
    const acquisitionCityEncoded = urlParams.get('i');
    const acquisitionCountryEncoded = urlParams.get('j');
    const acquisitionIpEncoded = urlParams.get('k');
    const acquisitionDomainEncoded = urlParams.get('l');
    const awarenessTimeEncoded = urlParams.get('m');
    const acquisitionTimeEncoded = urlParams.get('n');

    const referrer = document.referrer;
    const referrerDomain = referrer.toString().replace('http://', '').replace('https://', '').split(/[/?#]/)[0];

    if(!localStorage.getItem("awarenessUrl"))
    {
      if (awarenessUrlEncoded) {
        const awarenessUrl = decodeURIComponent(atob(awarenessUrlEncoded));
        const awarenessUserAgent = decodeURIComponent(atob(awarenessUserAgentEncoded));
        const awarenessCity = decodeURIComponent(atob(awarenessCityEncoded));
        const awarenessCountry = decodeURIComponent(atob(awarenessCountryEncoded));
        const awarenessIp = decodeURIComponent(atob(awarenessIpEncoded));
        const awarenessDomain = decodeURIComponent(atob(awarenessDomainEncoded));
        const awarenessTime = decodeURIComponent(atob(awarenessTimeEncoded));
        localStorage.setItem("awarenessUrl", awarenessUrl);
        localStorage.setItem("awarenessUserAgent", awarenessUserAgent);
        localStorage.setItem("awarenessCity", awarenessCity);
        localStorage.setItem("awarenessCountry", awarenessCountry);
        localStorage.setItem("awarenessIp", awarenessIp);
        localStorage.setItem("awarenessDomain", awarenessDomain);
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
            localStorage.setItem("awarenessCity", ipData.city);
            localStorage.setItem("awarenessCountry", ipData.country_name);
            localStorage.setItem("awarenessIp", ipData.ip);
            localStorage.setItem("awarenessDomain", ipData.asn.domain);
          }
        }
        request1.send();
      }
    }

    if (acquisitionUrlEncoded) {
      const acquisitionUrl = decodeURIComponent(atob(acquisitionUrlEncoded));
      const acquisitionUserAgent = decodeURIComponent(atob(acquisitionUserAgentEncoded));
      const acquisitionCity = decodeURIComponent(atob(acquisitionCityEncoded));
      const acquisitionCountry = decodeURIComponent(atob(acquisitionCountryEncoded));
      const acquisitionIp = decodeURIComponent(atob(acquisitionIpEncoded));
      const acquisitionDomain = decodeURIComponent(atob(acquisitionDomainEncoded));
      const acquisitionTime = decodeURIComponent(atob(acquisitionTimeEncoded));
      localStorage.setItem("acquisitionUrl", acquisitionUrl);
      localStorage.setItem("acquisitionUserAgent", acquisitionUserAgent);
      localStorage.setItem("acquisitionCity", acquisitionCity);
      localStorage.setItem("acquisitionCountry", acquisitionCountry);
      localStorage.setItem("acquisitionIp", acquisitionIp);
      localStorage.setItem("acquisitionDomain", acquisitionDomain);
      localStorage.setItem("acquisitionTime", acquisitionTime);

    } else if (referrer && referrerDomain && !referrerDomain.endsWith("kwola.io")) {

      localStorage.setItem("acquisitionUrl", referrer);
      localStorage.setItem("acquisitionUserAgent", navigator.userAgent);
      localStorage.setItem("acquisitionTime", new Date().toString());

      const request2 = new XMLHttpRequest();
      request2.open('GET', 'https://api.ipdata.co/?api-key=585f0bbe1a7caf5e73d7391c120f7d025b1deb0f504df719c6893e40');
      request2.setRequestHeader('Accept', 'application/json');

      request2.onreadystatechange = function () {
        if (this.readyState === 4) {
          const ipData = JSON.parse(this.responseText);
          localStorage.setItem("acquisitionCity", ipData.city);
          localStorage.setItem("acquisitionCountry", ipData.country_name);
          localStorage.setItem("acquisitionIp", ipData.ip);
          localStorage.setItem("acquisitionDomain", ipData.asn.domain);
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
