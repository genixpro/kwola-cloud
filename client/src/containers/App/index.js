import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Debounce } from 'react-throttle';
import WindowResizeListener from 'react-window-size-listener';
import { IntlProvider } from 'react-intl';
import AppRouter from './appRouter';
import Sidebar from '../Sidebar';
import Topbar from '../Topbar';
import AppLocale from '../../languageProvider';
import appActions from '../../redux/app/actions';
import themeActions from '../../redux/themeSwitcher/actions';
import ThemeSwitcher from '../ThemeSwitcher';
// import ThemeSwitcherButton from '../ThemeSwitcherButton';
// import SecondarySidebar from '../SecondarySidebar';
// import PageBreadcrumb from '../PageBreadcrumb';
import MUIPProvider from '../../components/uielements/materialUiPicker/momentProvider';
import { rtl } from '../../settings/withDirection';
import Main, { Root, AppFrame } from './style';
import './global.css';
import Auth0 from "../../helpers/auth0";
import {Elements} from '@stripe/react-stripe-js';
import stripePromise from '../../stripe';
import '../../styles/customStyles.css';
import {Redirect} from "react-router-dom";
const { toggleAll } = appActions;
const { switchActivation } = themeActions;

class App extends Component {
  constructor() {
    super();
  }


  componentDidMount()
  {

  }


  render() {
    let isLoggedIn = Auth0.isAuthenticated();
    if(!isLoggedIn)
    {
      window.localStorage.setItem("returnTo", window.location.path);
      return <Redirect
          to={{
            pathname: '/app/signin',
            state: {from: this.props.location},
          }}
      />;
    }

    const anchor = rtl === 'rtl' ? 'right' : 'left';
    const {
      classes,
      theme,
      toggleAll,
      locale,
      match,
      scrollHeight,
      fixedNavbar,
      view,
    } = this.props;
    const { url } = match;
    const propsTopbar = { locale, url };
    const options = { url, classes, theme, locale };
    const currentAppLocale = AppLocale[locale];
    return (
      <Elements stripe={stripePromise}>
        <IntlProvider
          locale={currentAppLocale.locale}
          messages={currentAppLocale.messages}
        >
          <Root>
            <Debounce time="1000" handler="onResize">
              <WindowResizeListener
                onResize={windowSize =>
                  toggleAll(windowSize.windowWidth, windowSize.windowHeight)
                }
              />
            </Debounce>
            <AppFrame>
              <Topbar {...options} />
              {anchor === 'left' ? <Sidebar {...options} anchor={anchor} /> : ''}

              <Main
                className={
                  view !== 'TabLandView' && view !== 'DesktopView'
                    ? ''
                    : fixedNavbar
                    ? 'fixedNav'
                    : 'notFixed'
                }
              >
                 {/*<PageBreadcrumb url={url} />*/}

                <MUIPProvider>
                  <AppRouter
                    style={{ height: scrollHeight, overflowY: 'auto' }}
                    url={url}
                  />
                </MUIPProvider>
                {/*<ThemeSwitcherButton />*/}
                {/* <SecondarySidebar
                  InnerComponent={ThemeSwitcher}
                  currentActiveKey="themeSwitcher"
                  {...propsTopbar}
                /> */}
              </Main>

              {anchor === 'right' ? <Sidebar {...options} anchor={anchor} /> : ''}
            </AppFrame>
          </Root>
        </IntlProvider>
      </Elements>
    );
  }
}

const mapStateToProps = state => {
  return {
    auth: state.Auth,
    locale: state.LanguageSwitcher.language.locale,
    scrollHeight: state.App.scrollHeight, // toJs()
    fixedNavbar: state.App.fixedNavbar,
    view: state.App.view,
  };
};
const appConect = connect(
  mapStateToProps,
  {
    toggleAll,
    switchActivation,
  }
)(App);
export default appConect;
