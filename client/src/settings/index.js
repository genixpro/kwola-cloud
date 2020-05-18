export default {
  apiUrl: 'http://yoursite.com/api/',
};

const siteConfig = {
  siteName: 'Kwola',
  siteIcon: 'ion-flash',
  footerText: 'Kwola ©2020 Kwola Software Testing Inc.',
  enableAnimatedRoute: false,
};
const themeConfig = {
  topbar: 'themedefault',
  sidebar: 'themedefault',
  layout: 'themedefault',
  theme: 'themedefault',
  showBreadCrumb: true,
  fixedNavbar: true,
};
const language = 'english';
const AlgoliaSearchConfig = {
  appId: '',
  apiKey: '',
};
const Auth0Config = {
  domain: 'kwola.auth0.com',
  clientID: process.env.REACT_APP_AUTH0_CLIENT_ID,
  audience: process.env.REACT_APP_AUTH0_AUDIENCE,
  redirectUri: process.env.REACT_APP_AUTH0_REDIRECT_URL,
  scope: "openid profile email",
  responseType: 'token id_token',

  options: {
    auth: {
      autoParseHash: true,
      redirect: false,
      params: {
        scope: "openid profile email"
      }
    }
  }
};
const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  databaseURL: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
};
const googleConfig = {
  apiKey: '', //
};
const mapboxConfig = {
  tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  maxZoom: 18,
  defaultZoom: 11,
  center: [0, 0],
};
const youtubeSearchApi = '';

const instagramConfig = {
  instagramUserInfoApiUrl:
    'https://api.instagram.com/v1/users/self/?access_token=',
  instagramUserMediaApiUrl:
    'https://api.instagram.com/v1/users/self/media/recent/?access_token=',
  accessToken: '',
};
const jwtConfig = {
  fetchUrl: '/api/',
  secretKey: 'secretKey',
};
export {
  siteConfig,
  language,
  themeConfig,
  AlgoliaSearchConfig,
  Auth0Config,
  firebaseConfig,
  googleConfig,
  mapboxConfig,
  youtubeSearchApi,
  instagramConfig,
  jwtConfig,
};
