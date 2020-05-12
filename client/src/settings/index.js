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
  options: {
    audience: process.env.REACT_APP_AUTH0_AUDIENCE,
    auth: {
      autoParseHash: true,
      redirect: false,
      responseType: 'token id_token',
      params: {
        scope: "openid profile email"
      }
    },
    languageDictionary: {
      title: 'Kwola',
      emailInputPlaceholder: 'email',
      passwordInputPlaceholder: 'password',
    },
    icon: '',
    theme: {
      labeledSubmitButton: true,
      logo: '',
      primaryColor: '#E14615',
      authButtons: {
        connectionName: {
          displayName: 'Log In',
          primaryColor: '#b7b7b7',
          foregroundColor: '#000000',
          icon: undefined,
        },
      },
    },
  },
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
